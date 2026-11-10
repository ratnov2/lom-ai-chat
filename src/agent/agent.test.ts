import { it, expect, vi } from "vitest";
import { createLocalAgent } from "./localAgent";
import { calculate } from "./calculator";
import { scenario } from "./scenarios";
import { abortableDelay } from "./abortableDelay";
const input = { message: "Объясни закон Ома", history: [], attempt: 1 };
async function events(message: string, attempt = 1) {
  const result = [];
  for await (const event of createLocalAgent({
    initial: 0,
    tool: 0,
    chunk: 0,
  }).stream({ ...input, message, attempt }, new AbortController().signal))
    result.push(event);
  return result;
}
it("события ответа и калькулятора идут по порядку", async () => {
  const answerEvents = await events(input.message);
  expect(answerEvents[0].type).toBe("started");
  expect(answerEvents.at(-1)?.type).toBe("completed");
  const calculatorEvents = await events("Сколько будет 17 × 24?");
  expect(
    calculatorEvents.findIndex((event) => event.type === "tool_call"),
  ).toBeLessThan(
    calculatorEvents.findIndex((event) => event.type === "tool_result"),
  );
  expect(calculatorEvents).toContainEqual({
    type: "tool_result",
    tool: "calculator",
    result: "408",
  });
});
it.each(["Покажи ошибку", "Покажи ошибку во время ответа"])(
  "ошибка и успешный повтор: %s",
  async (message) => {
    expect((await events(message)).at(-1)?.type).toBe("error");
    expect((await events(message, 2)).at(-1)?.type).toBe("completed");
  },
);
it("калькулятор разбирает отрицательные и десятичные числа", () => {
  expect(calculate("-2.5 × -4")).toBe("10");
  expect(calculate("7 ÷ 2")).toBe("3.5");
  expect(() => calculate("3/0")).toThrow("ноль");
  expect(() => calculate("process.exit()")).toThrow();
  expect(() => calculate("1+2+3")).toThrow();
});
it("уточнение без контекста и последовательные шаги", () => {
  expect(scenario({ ...input, message: "Объясни проще" }).text).toContain(
    "Уточни",
  );
  const first = scenario({
    ...input,
    message: "Помоги решить 2x + 3 = 11",
  }).text;
  const second = scenario({
    ...input,
    message: "дальше",
    history: [{ role: "assistant", text: first }],
  }).text;
  expect(second).toContain("Шаг 2");
  expect(
    scenario({
      ...input,
      message: "дальше",
      history: [
        { role: "assistant", text: first },
        { role: "assistant", text: second },
      ],
    }).text,
  ).toContain("x = 4");
});
it("отменяемые ожидания очищают таймеры", async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  const waiting = abortableDelay(500, controller.signal);
  controller.abort();
  await expect(waiting).rejects.toMatchObject({ name: "AbortError" });
  expect(vi.getTimerCount()).toBe(0);
  vi.useRealTimers();
});
it("отмена во время streaming", async () => {
  const controller = new AbortController();
  const stream = createLocalAgent({ initial: 0, tool: 0, chunk: 0 }).stream(
    input,
    controller.signal,
  );
  let count = 0;
  await expect(
    (async () => {
      for await (const event of stream) {
        if (event.type === "text_delta") {
          count++;
          controller.abort();
        }
      }
    })(),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(count).toBe(1);
});
