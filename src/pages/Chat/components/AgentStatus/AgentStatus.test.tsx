import { act } from "react";
import { createRoot } from "react-dom/client";
import { it, expect, vi } from "vitest";
import type { IGeneration } from "../../../../store/chat/state/models";
import { AgentStatus } from "./AgentStatus";

it("считает время запроса, сохраняет его при переключении и очищает таймер после завершения", () => {
  vi.useFakeTimers();
  vi.setSystemTime(100_000);
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const container = document.createElement("div");
  const root = createRoot(container);
  const generation: IGeneration = {
    requestId: "first",
    chatId: "a",
    userMessageId: "user",
    assistantMessageId: "assistant",
    attempt: 1,
    phase: "processing",
  };

  try {
    act(() =>
      root.render(<AgentStatus generation={generation} startedAt={100_000} />),
    );
    act(() => vi.advanceTimersByTime(2000));
    expect(container.querySelector('[role="timer"]')?.textContent).toBe(
      "Работаю 2 сек",
    );

    act(() =>
      root.render(
        <AgentStatus
          generation={{ ...generation, requestId: "retry", attempt: 2 }}
          startedAt={102_000}
        />,
      ),
    );
    expect(container.querySelector('[role="timer"]')?.textContent).toBe(
      "Работаю 0 сек",
    );
    act(() => vi.advanceTimersByTime(1000));
    act(() =>
      root.render(<AgentStatus generation={generation} startedAt={100_000} />),
    );
    expect(container.querySelector('[role="timer"]')?.textContent).toBe(
      "Работаю 3 сек",
    );

    act(() =>
      root.render(
        <AgentStatus
          generation={{ ...generation, phase: "completed" }}
          startedAt={100_000}
        />,
      ),
    );
    expect(container.querySelector('[role="timer"]')).toBeNull();
    expect(container.childElementCount).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    act(() => root.unmount());
    vi.useRealTimers();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
  }
});
