import { act } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { createLocalAgent } from "../../agent/localAgent";
import { createAppStore } from "../../store";
import { actions } from "../../store/chat/state/chatSlice";
import { sendMessage } from "../../store/chat/state/commands";
import { emptyState, isActive } from "../../store/chat/state/models";
import { Chat } from "./Chat";

it("читает данные и отправляет запрос в диалог из props при другом activeChatId", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    disconnect() {}
  });
  const store = createAppStore(
    emptyState(),
    createLocalAgent({ initial: 60_000, tool: 0, chunk: 0 }),
  );
  store.dispatch(actions.createChat({ id: "first", now: 1 }));
  store.dispatch(actions.createChat({ id: "second", now: 2 }));
  store.dispatch(actions.draftChanged({ chatId: "second", text: "Запрос второго диалога" }));
  store.dispatch(sendMessage("second"));
  store.dispatch(actions.draftChanged({ chatId: "second", text: "Второй черновик" }));
  store.dispatch(actions.draftChanged({ chatId: "first", text: "Первый черновик" }));
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  try {
    await act(async () => {
      root.render(
        <Provider store={store}>
          <MemoryRouter>
            <Chat chatId="first" />
          </MemoryRouter>
        </Provider>,
      );
    });
    expect(container.querySelector("textarea")?.value).toBe("Первый черновик");
    expect(container.querySelector("[role='timer']")).toBeNull();
    const send = container.querySelector<HTMLButtonElement>("[aria-label='Отправить']")!;
    expect(send.disabled).toBe(false);
    await act(async () => send.click());
    expect(container.querySelector("[aria-label='Ваше сообщение']")?.textContent).toContain("Первый черновик");
    expect(store.getState().activeChatId).toBe("second");
    expect(store.getState().draftsByChatId.first).toBe("");
    expect(store.getState().draftsByChatId.second).toBe("Второй черновик");

    const stop = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Остановить"),
    )!;
    await act(async () => stop.click());
    expect(store.getState().generationsByChatId.first.phase).toBe("cancelled");
    expect(isActive(store.getState().generationsByChatId.second.phase)).toBe(true);
  } finally {
    await act(async () => {
      root.unmount();
      store.dispose();
    });
    container.remove();
    vi.unstubAllGlobals();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
  }
});
