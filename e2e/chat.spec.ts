import { test, expect, type Page } from "@playwright/test";
async function send(page: Page, text: string) {
  await page.getByRole("textbox", { name: "Сообщение" }).fill(text);
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
}
async function done(page: Page) {
  await expect(page.getByRole("button", { name: /Остановить/ })).toHaveCount(
    0,
    {
      timeout: 15000,
    },
  );
}
async function list(page: Page) {
  if ((page.viewportSize()?.width ?? 1440) < 768)
    await page.getByRole("button", { name: "К списку диалогов" }).click();
}
test("вопрос, уточнение, калькулятор и черновик", async ({ page }) => {
  await page.goto(process.env.LOM_APP_URL ?? "/");
  await send(page, "Объясни второй закон Ньютона");
  await expect(page.getByRole("status")).toContainText(
    /Запрос отправлен|Разбираюсь|Пишу/,
  );
  await done(page);
  await send(page, "Объясни проще");
  await done(page);
  await expect(page.getByText(/Представь тележку/)).toBeVisible();
  await send(page, "Сколько будет 17 × 24?");
  await done(page);
  await page
    .getByRole("article", { name: "Ответ LOM AI" })
    .last()
    .locator("summary")
    .click();
  await expect(page.getByText("▦ Калькулятор: 17 × 24 = 408")).toBeVisible();
  await page.getByRole("textbox").fill("Мой черновик");
  await page.reload();
  await expect(page.getByRole("textbox")).toHaveValue("Мой черновик");
});
test("ошибки и повторы", async ({ page }) => {
  await page.goto(process.env.LOM_APP_URL ?? "/");
  for (const text of ["Покажи ошибку", "Покажи ошибку во время ответа"]) {
    await send(page, text);
    await expect(page.getByRole("button", { name: "Повторить" })).toBeVisible();
    await page.getByRole("button", { name: "Повторить" }).click();
    await done(page);
    await expect(page.getByText(/Теперь всё получилось/).last()).toBeVisible();
  }
});
test("параллельность, остановка и восстановление", async ({ page }) => {
  await page.goto(process.env.LOM_APP_URL ?? "/");
  await send(page, "Объясни второй закон Ньютона");
  await list(page);
  await page.getByRole("button", { name: "＋ Новый диалог" }).click();
  await send(page, "Объясни закон Ома");
  await page.getByRole("button", { name: /Остановить/ }).click();
  await expect(
    page.getByText("Ответ остановлен", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Повторить" }).click();
  await page.reload();
  await expect(
    page.getByText(/Ответ прерван после перезагрузки/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Повторить" }).click();
  await done(page);
  await list(page);
  await page
    .getByRole("button", { name: /Объясни второй закон Ньютона/ })
    .click();
  await expect(page.getByText(/Второй закон Ньютона связывает/)).toBeVisible();
});
test("длинный текст не выходит за экран", async ({ page }) => {
  await page.goto(process.env.LOM_APP_URL ?? "/");
  await page.getByRole("textbox").fill("x".repeat(10001));
  await expect(
    page.getByRole("button", { name: "Отправить", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("клавиатура, переносы и IME", async ({ page }) => {
  await page.goto(process.env.LOM_APP_URL ?? "/");
  const field = page.getByRole("textbox", { name: "Сообщение" });
  await field.fill("Объясни закон Ома");
  await field.press("Shift+Enter");
  await expect(field).toHaveValue("Объясни закон Ома\n");
  await field.dispatchEvent("keydown", {
    key: "Enter",
    code: "Enter",
    isComposing: true,
    bubbles: true,
  });
  await expect(page.getByRole("article")).toHaveCount(0);
  await field.press("Enter");
  await expect(
    page.getByRole("article", { name: "Ваше сообщение" }),
  ).toHaveCount(1);
  await done(page);
});

test("streaming сохраняет позицию чтения", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto(process.env.LOM_APP_URL ?? "/");
  for (let iteration = 0; iteration < 4; iteration++) {
    await send(page, "Объясни второй закон Ньютона");
    await done(page);
  }
  await send(page, "Объясни второй закон Ньютона");
  const list = page.getByRole("article").first().locator("../..");
  await list.evaluate((el) => {
    el.scrollTop = 0;
    el.dispatchEvent(new Event("scroll"));
  });
  await expect(
    page.getByRole("button", { name: "К новым сообщениям" }),
  ).toBeVisible();
  await done(page);
  expect(await list.evaluate((el) => el.scrollTop)).toBe(0);
  await page.getByRole("button", { name: "К новым сообщениям" }).click();
  await expect(
    page.getByRole("button", { name: "К новым сообщениям" }),
  ).toHaveCount(0);
});
