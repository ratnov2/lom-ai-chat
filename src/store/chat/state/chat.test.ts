import { describe, it, expect, vi, afterEach } from "vitest";
import { createAppStore } from "../../index";
import { actions } from "./chatSlice";
import { sendMessage } from "./commands";
import { createLocalAgent } from "../../../agent/localAgent";
import { emptyState } from "./models";
import { completedHistory } from "./selectors";
afterEach(() => vi.useRealTimers());
function setup() {
  vi.useFakeTimers();
  const store = createAppStore(
    emptyState(),
    createLocalAgent({ initial: 10, tool: 10, chunk: 10 }),
  );
  store.dispatch(actions.createChat({ id: "a", now: 1 }));
  return store;
}
function send(
  store: ReturnType<typeof setup>,
  id = "a",
  text = "Объясни закон Ома",
) {
  store.dispatch(actions.draftChanged({ chatId: id, text }));
  store.dispatch(sendMessage(id));
}
describe("Жизненный цикл запросов", () => {
  it("блокирует двойную отправку, два чата работают независимо", async () => {
    const store = setup();
    send(store);
    store.dispatch(sendMessage("a"));
    store.dispatch(actions.createChat({ id: "b", now: 2 }));
    send(store, "b", "Сколько будет 17 × 24?");
    expect(store.getState().chats.a.messageIds).toHaveLength(2);
    await vi.runAllTimersAsync();
    expect(store.getState().generationsByChatId.a.phase).toBe("completed");
    expect(
      store.getState().messages[store.getState().chats.b.messageIds[1]].text,
    ).toContain("408");
    expect(
      store.getState().messages[store.getState().chats.a.messageIds[1]].text,
    ).toContain("Закон Ома");
    store.dispose();
  });
  it("отмена сохраняет текст и игнорирует поздние события", async () => {
    const store = setup();
    send(store);
    await vi.advanceTimersByTimeAsync(30);
    const generation = store.getState().generationsByChatId.a;
    const before =
      store.getState().messages[generation.assistantMessageId].text;
    expect(before.length).toBeGreaterThan(0);
    store.dispatch(actions.cancelled("a"));
    store.dispatch(
      actions.eventReceived({
        chatId: "a",
        requestId: generation.requestId,
        event: { type: "text_delta", text: "лишнее" },
      }),
    );
    await vi.runAllTimersAsync();
    expect(store.getState().messages[generation.assistantMessageId].text).toBe(
      before,
    );
    expect(store.getState().generationsByChatId.a.phase).toBe("cancelled");
    store.dispose();
  });
  it("повтор заменяет ошибку и не дублирует сообщение пользователя", async () => {
    const store = setup();
    send(store, "a", "Покажи ошибку во время ответа");
    await vi.runAllTimersAsync();
    const old = store.getState().generationsByChatId.a;
    expect(old.phase).toBe("failed");
    store.dispatch(sendMessage("a", true));
    store.dispatch(
      actions.eventReceived({
        chatId: "a",
        requestId: old.requestId,
        event: { type: "text_delta", text: "СТАРЫЙ" },
      }),
    );
    await vi.runAllTimersAsync();
    expect(store.getState().chats.a.messageIds).toHaveLength(2);
    expect(store.getState().generationsByChatId.a.attempt).toBe(2);
    expect(
      store.getState().messages[old.assistantMessageId].text,
    ).not.toContain("СТАРЫЙ");
    expect(store.getState().generationsByChatId.a.phase).toBe("completed");
    store.dispose();
  });
  it("после ошибки можно отправить новый запрос; контекст содержит завершённые пары", async () => {
    const store = setup();
    send(store, "a", "Покажи ошибку");
    await vi.runAllTimersAsync();
    send(store);
    await vi.runAllTimersAsync();
    send(store, "a", "Объясни проще");
    const generation = store.getState().generationsByChatId.a;
    expect(
      completedHistory(store.getState(), "a", generation.userMessageId),
    ).toHaveLength(2);
    await vi.runAllTimersAsync();
    expect(
      store.getState().messages[generation.assistantMessageId].text,
    ).toContain("воду");
    store.dispose();
  });
});

it("быстрый повтор после остановки не отменяется старым обработчиком", async () => {
  vi.useFakeTimers();
  const store = createAppStore(
    emptyState(),
    createLocalAgent({ initial: 10, tool: 10, chunk: 10 }),
  );
  store.dispatch(actions.createChat({ id: "a", now: 1 }));
  store.dispatch(
    actions.draftChanged({ chatId: "a", text: "Объясни закон Ома" }),
  );
  store.dispatch(sendMessage("a"));
  store.dispatch(actions.cancelled("a"));
  store.dispatch(sendMessage("a", true));
  await vi.runAllTimersAsync();
  expect(store.getState().generationsByChatId.a.phase).toBe("completed");
  expect(store.getState().chats.a.messageIds).toHaveLength(2);
  store.dispose();
});

it("неожиданное исключение и поток без терминального события снимают блокировку", async () => {
  for (const throwing of [true, false]) {
    const store = createAppStore(emptyState(), {
      async *stream() {
        yield { type: "started" } as const;
        if (throwing) throw Error("failure");
      },
    });
    store.dispatch(actions.createChat({ id: "a", now: 1 }));
    store.dispatch(actions.draftChanged({ chatId: "a", text: "Вопрос" }));
    store.dispatch(sendMessage("a"));
    await vi.waitFor(() =>
      expect(store.getState().generationsByChatId.a.phase).toBe("failed"),
    );
    store.dispose();
  }
});

it.each([null, undefined, "unexpected value"])(
  "произвольное исключение %s переводит запрос в failed",
  async (thrownValue) => {
    const store = createAppStore(emptyState(), {
      async *stream() {
        yield { type: "started" } as const;
        throw thrownValue;
      },
    });
    try {
      store.dispatch(actions.createChat({ id: "a", now: 1 }));
      send(store);
      await vi.waitFor(() => {
        expect(store.getState().generationsByChatId.a.phase).toBe("failed");
      });
      const generation = store.getState().generationsByChatId.a;
      expect(
        store.getState().messages[generation.assistantMessageId].status,
      ).toBe("failed");
    } finally {
      store.dispose();
    }
  },
);

it("повторный dispatch запроса во время потока и после завершения игнорируется", async () => {
  vi.useFakeTimers();
  const agent = createLocalAgent({ initial: 10, tool: 10, chunk: 10 });
  const stream = vi.spyOn(agent, "stream");
  const store = createAppStore(emptyState(), agent);
  try {
    store.dispatch(actions.createChat({ id: "a", now: 1 }));
    send(store);
    const generation = store.getState().generationsByChatId.a;
    const duplicate = actions.requestAccepted({
      generation,
      text: "Объясни закон Ома",
      now: 1,
      retry: false,
    });
    store.dispatch(duplicate);
    expect(stream).toHaveBeenCalledTimes(1);
    await vi.runAllTimersAsync();
    const completedState = store.getState();
    store.dispatch(duplicate);
    expect(stream).toHaveBeenCalledTimes(1);
    expect(store.getState()).toBe(completedState);
    expect(store.getState().chats.a.messageIds).toHaveLength(2);
    expect(store.getState().generationsByChatId.a.phase).toBe("completed");
  } finally {
    store.dispose();
  }
});

it("сохраняет длительность и калькулятор у завершённого ответа после следующей отправки", async () => {
  const store = setup();
  try {
    send(store, "a", "Сколько будет 17 × 24?");
    const generation = store.getState().generationsByChatId.a;
    const startedAt =
      store.getState().messages[generation.assistantMessageId].createdAt;
    await vi.runAllTimersAsync();
    const completedMessage =
      store.getState().messages[generation.assistantMessageId];
    expect(completedMessage.completedAt).toBeGreaterThan(startedAt);
    expect(completedMessage.tool).toEqual({
      expression: "17 × 24",
      result: "408",
    });
    send(store, "a", "Объясни закон Ома");
    await vi.runAllTimersAsync();
    expect(store.getState().messages[generation.assistantMessageId]).toEqual(
      completedMessage,
    );
  } finally {
    store.dispose();
  }
});

it("повтор очищает информацию об инструменте и длительности предыдущей попытки", async () => {
  const store = setup();
  try {
    send(store, "a", "Вычисли 3 / 0");
    await vi.runAllTimersAsync();
    const generation = store.getState().generationsByChatId.a;
    expect(
      store.getState().messages[generation.assistantMessageId].tool,
    ).toBeDefined();
    store.dispatch(sendMessage("a", true));
    const message = store.getState().messages[generation.assistantMessageId];
    expect(message.tool).toBeUndefined();
    expect(message.completedAt).toBeUndefined();
    await vi.runAllTimersAsync();
  } finally {
    store.dispose();
  }
});
