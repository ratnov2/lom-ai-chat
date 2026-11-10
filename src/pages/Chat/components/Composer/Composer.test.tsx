import { it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Composer } from "./Composer";
const props = {
  value: "вопрос",
  onChange: vi.fn(),
  onSend: vi.fn(),
  onStop: vi.fn(),
  busy: false,
  focusKey: "a",
};
it("при генерации показывает остановку и доступное поле черновика", () => {
  const html = renderToStaticMarkup(<Composer {...props} busy />);
  expect(html).toContain("Остановить");
  expect(html).toContain("textarea");
  expect(html).not.toContain('aria-label="Отправить"');
});
it("лимит блокирует отправку, не обрезая значение", () => {
  const html = renderToStaticMarkup(
    <Composer {...props} value={"a".repeat(10001)} />,
  );
  expect(html).toContain("a".repeat(10001));
  expect(html).toContain("disabled");
  expect(html).toContain("Лимит");
});
