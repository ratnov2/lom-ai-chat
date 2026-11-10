import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "../../App";
import { createAppStore } from "../../store";
import { actions } from "../../store/chat/state/chatSlice";

vi.mock("./Chat", () => ({
  Chat: ({ chatId }: { chatId: string }) => <div data-chat-id={chatId}>Экран чата</div>,
}));

const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
});

function LocationProbe() {
  const { pathname, search, hash } = useLocation();
  return <output>{pathname + search + hash}</output>;
}

async function renderRoute(url: string, withChats = true) {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const store = createAppStore();
  if (withChats) {
    store.dispatch(actions.createChat({ id: "first", now: 1 }));
    store.dispatch(actions.createChat({ id: "second", now: 2 }));
  }
  const container = document.createElement("div");
  const root = createRoot(container);
  cleanups.push(() => {
    act(() => root.unmount());
    store.dispose();
  });
  await act(async () => {
    root.render(
      <StrictMode>
        <Provider store={store}>
          <MemoryRouter initialEntries={[url]}>
            <App />
            <LocationProbe />
          </MemoryRouter>
        </Provider>
      </StrictMode>,
    );
  });
  return { store, container, location: container.querySelector("output")! };
}

it("выбирает диалог из маршрута вместо сохранённого активного", async () => {
  const { store, container, location } = await renderRoute("/chat/first");
  expect(container.querySelector("[data-chat-id]")?.getAttribute("data-chat-id")).toBe("first");
  expect(store.getState().activeChatId).toBe("first");
  expect(location.textContent).toBe("/chat/first");
});

it("перенаправляет старую ссылку, сохраняя другие параметры и якорь", async () => {
  const { store, location } = await renderRoute("/?chatId=first&source=test#example");
  expect(store.getState().activeChatId).toBe("first");
  expect(location.textContent).toBe("/chat/first?source=test#example");
});

it("предупреждает о неизвестном ID и открывает существующий диалог", async () => {
  const { store, location } = await renderRoute("/chat/missing");
  expect(store.getState().warning).toContain("не найден");
  expect(store.getState().activeChatId).toBe("second");
  expect(location.textContent).toBe("/chat/second");
});

it("при первом открытии создаёт один диалог и заменяет корневой маршрут", async () => {
  const { store, location } = await renderRoute("/", false);
  expect(Object.keys(store.getState().chats)).toHaveLength(1);
  expect(location.textContent).toBe(`/chat/${store.getState().activeChatId}`);
});
