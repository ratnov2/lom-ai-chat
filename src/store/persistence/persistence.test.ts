import { LEGACY_STORAGE_KEY } from "./consts";
import { it, expect, vi, afterEach } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  restore,
  restoreSnapshot,
  createSnapshot,
  attachPersistence,
} from "./persistence";
import { openIndexedDb, type ISnapshotStorage } from "./indexedDbStorage";
import { emptyState } from "../chat/state/models";
import { createAppStore } from "../index";
import { actions } from "../chat/state/chatSlice";
import { sendMessage } from "../chat/state/commands";

afterEach(() => vi.useRealTimers());
const memoryStorage = (): ISnapshotStorage => ({
  read: vi.fn(async () => undefined),
  write: vi.fn(async () => {}),
  close: vi.fn(),
});

it("IndexedDB сохраняет и восстанавливает сообщения, черновик и прерванный запрос", async () => {
  const storage = await openIndexedDb(new IDBFactory());
  const store = createAppStore();
  try {
    store.dispatch(actions.createChat({ id: "a", now: 1 }));
    store.dispatch(actions.draftChanged({ chatId: "a", text: "вопрос" }));
    store.dispatch(sendMessage("a"));
    const generation = store.getState().generationsByChatId.a;
    store.dispatch(
      actions.eventReceived({
        chatId: "a",
        requestId: generation.requestId,
        event: { type: "text_delta", text: "частичный ответ" },
      }),
    );
    store.dispatch(actions.draftChanged({ chatId: "a", text: "черновик" }));
    await storage.write(createSnapshot(store.getState()));
    const restored = await restore(storage);
    expect(restored.draftsByChatId.a).toBe("черновик");
    expect(restored.generationsByChatId.a.phase).toBe("interrupted");
    expect(restored.chats.a.messageIds).toHaveLength(2);
    expect(restored.messages[generation.assistantMessageId].text).toBe(
      "частичный ответ",
    );
    expect(restored.scrollByChatId).toEqual({});
  } finally {
    store.dispose();
    storage.close();
  }
});

it.each([null, { version: 7 }, { version: 1, state: {} }])(
  "повреждённый snapshot безопасен: %s",
  (snapshot) => {
    expect(restoreSnapshot(snapshot).warning).toBeTruthy();
  },
);

it("недоступная IndexedDB отклоняет открытие", async () => {
  const factory = {
    open() {
      throw new Error("denied");
    },
  } as unknown as IDBFactory;
  await expect(openIndexedDb(factory)).rejects.toThrow("denied");
});

it("переносит старую историю после успешной транзакции", async () => {
  const storage = await openIndexedDb(new IDBFactory());
  const state = emptyState();
  state.chats.a = {
    id: "a",
    title: "Новый диалог",
    messageIds: [],
    createdAt: 1,
    updatedAt: 1,
  };
  state.activeChatId = "a";
  state.draftsByChatId.a = "старый черновик";
  localStorage.setItem(
    LEGACY_STORAGE_KEY,
    JSON.stringify(createSnapshot(state)),
  );
  try {
    const restored = await restore(storage);
    expect(restored.draftsByChatId.a).toBe("старый черновик");
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    expect((await restore(storage)).draftsByChatId.a).toBe("старый черновик");
  } finally {
    storage.close();
  }
});

it("не удаляет legacy-копию при ошибке переноса", async () => {
  const storage = memoryStorage();
  vi.mocked(storage.write).mockRejectedValue(new Error("quota"));
  const legacy = JSON.stringify(createSnapshot(emptyState()));
  localStorage.setItem(LEGACY_STORAGE_KEY, legacy);
  expect((await restore(storage)).warning).toContain("Старая копия сохранена");
  expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBe(legacy);
});

it("IndexedDB имеет приоритет над legacy-данными", async () => {
  const storage = memoryStorage();
  vi.mocked(storage.read).mockResolvedValue(createSnapshot(emptyState()));
  localStorage.setItem(LEGACY_STORAGE_KEY, "broken");
  expect((await restore(storage)).warning).toBeNull();
  expect(storage.write).not.toHaveBeenCalled();
});

it("повреждённый JSON legacy не ломает запуск", async () => {
  localStorage.setItem(LEGACY_STORAGE_KEY, "{");
  expect((await restore(memoryStorage())).warning).toBeTruthy();
});

it("объединяет черновики и не сохраняет прокрутку", async () => {
  vi.useFakeTimers();
  const store = createAppStore();
  const storage = memoryStorage();
  const persistence = attachPersistence(store, storage, vi.fn());
  store.dispatch(actions.createChat({ id: "a", now: 1 }));
  await persistence.flush();
  vi.mocked(storage.write).mockClear();
  for (let draftIndex = 0; draftIndex < 10; draftIndex++)
    store.dispatch(
      actions.draftChanged({ chatId: "a", text: String(draftIndex) }),
    );
  expect(storage.write).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(500);
  expect(storage.write).toHaveBeenCalledTimes(1);
  store.dispatch(actions.scrollSaved({ chatId: "a", top: 10, bottom: false }));
  await vi.advanceTimersByTimeAsync(500);
  expect(storage.write).toHaveBeenCalledTimes(1);
  await persistence.dispose();
  store.dispose();
});

it("записи выполняются по очереди, последнее состояние не затирается старым", async () => {
  const store = createAppStore();
  let release: () => void = () => {};
  let saved: unknown;
  const storage = memoryStorage();
  vi.mocked(storage.write)
    .mockImplementationOnce(
      (snapshot) =>
        new Promise<void>((resolve) => {
          release = () => {
            saved = snapshot;
            resolve();
          };
        }),
    )
    .mockImplementation(async (snapshot) => {
      saved = snapshot;
    });
  const persistence = attachPersistence(store, storage, vi.fn());
  store.dispatch(actions.createChat({ id: "a", now: 1 }));
  await Promise.resolve();
  store.dispatch(actions.draftChanged({ chatId: "a", text: "последний" }));
  const flushed = persistence.flush();
  expect(storage.write).toHaveBeenCalledTimes(1);
  release();
  await flushed;
  expect(restoreSnapshot(saved).draftsByChatId.a).toBe("последний");
  await persistence.dispose();
  store.dispose();
});

it("ошибка асинхронной записи предупреждает один раз и сохраняет работу в памяти", async () => {
  const store = createAppStore();
  const storage = memoryStorage();
  const warn = vi.fn();
  vi.mocked(storage.write).mockRejectedValue(new Error("quota"));
  const persistence = attachPersistence(store, storage, warn);
  store.dispatch(actions.createChat({ id: "a", now: 1 }));
  await persistence.flush();
  store.dispatch(actions.draftChanged({ chatId: "a", text: "в памяти" }));
  await persistence.flush();
  expect(warn).toHaveBeenCalledTimes(1);
  expect(store.getState().draftsByChatId.a).toBe("в памяти");
  await persistence.dispose();
  store.dispose();
});

it("при перезагрузке сразу запускает транзакцию для свежего черновика", async () => {
  vi.useFakeTimers();
  const store = createAppStore();
  const storage = memoryStorage();
  const persistence = attachPersistence(store, storage, vi.fn());
  try {
    store.dispatch(actions.createChat({ id: "a", now: 1 }));
    await persistence.flush();
    vi.mocked(storage.write).mockClear();
    store.dispatch(
      actions.draftChanged({ chatId: "a", text: "свежий черновик" }),
    );
    window.dispatchEvent(new Event("beforeunload"));
    expect(storage.write).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(storage.write).mock.calls[0][0].state.draftsByChatId.a,
    ).toBe("свежий черновик");
  } finally {
    await persistence.dispose();
    store.dispose();
  }
});
