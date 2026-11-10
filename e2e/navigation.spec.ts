import { test, expect, type Page } from "@playwright/test";
async function openList(page: Page) {
  if ((page.viewportSize()?.width ?? 1440) < 768)
    await page.getByRole("button", { name: "К списку диалогов" }).click();
}
test("URL открывает нужный чат, поддерживает Назад и Вперёд", async ({
  page,
}) => {
  await page.goto(process.env.LOM_APP_URL ?? "/");
  await expect
    .poll(() => new URL(page.url()).pathname.split("/").at(-1))
    .toMatch(/^[0-9a-f-]{36}$/);
  const firstUrl = page.url();
  const initialHistoryLength = await page.evaluate(() => history.length);
  await openList(page);
  await page.getByRole("button", { name: "＋ Новый диалог" }).click();
  expect(page.url()).toBe(firstUrl);
  expect(await page.evaluate(() => history.length)).toBe(initialHistoryLength);
  await page.getByRole("textbox").fill("Первый диалог");
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
  await page.getByRole("button", { name: /Остановить/ }).click();
  await openList(page);
  await page.getByRole("button", { name: "＋ Новый диалог" }).click();
  await expect.poll(() => page.url()).not.toBe(firstUrl);
  const secondUrl = page.url();
  await page.goBack();
  await expect(
    page.getByRole("article", { name: "Ваше сообщение" }),
  ).toContainText("Первый диалог");
  expect(page.url()).toBe(firstUrl);
  await page.goForward();
  await expect(
    page.getByRole("heading", { name: /Сложное станет/ }),
  ).toBeVisible();
  expect(page.url()).toBe(secondUrl);
  await openList(page);
  await page.getByRole("button", { name: /Первый диалог/ }).click();
  await expect.poll(() => page.url()).toBe(firstUrl);
  await page.goto(firstUrl);
  await expect(
    page.getByRole("article", { name: "Ваше сообщение" }),
  ).toContainText("Первый диалог");
  await page.reload();
  await expect(
    page.getByRole("article", { name: "Ваше сообщение" }),
  ).toContainText("Первый диалог");
});

test("старая ссылка переносит chatId в маршрут и сохраняет параметры", async ({ page }) => {
  await page.goto(process.env.LOM_APP_URL ?? "/");
  await expect.poll(() => new URL(page.url()).pathname).toMatch(/^\/chat\//);
  const canonical = new URL(page.url());
  const legacy = new URL(canonical);
  legacy.pathname = "/";
  legacy.searchParams.set("chatId", canonical.pathname.split("/").at(-1)!);
  legacy.searchParams.set("source", "test");
  legacy.hash = "example";
  await page.goto(legacy.href);
  canonical.search = "?source=test";
  canonical.hash = "example";
  await expect.poll(() => page.url()).toBe(canonical.href);
  await expect(page.getByRole("textbox")).toBeVisible();
});

test("неизвестный chatId показывает уведомление и открывает рабочий чат", async ({
  page,
}) => {
  const url = new URL(process.env.LOM_APP_URL ?? "/", "http://127.0.0.1:5173");
  url.pathname = "/chat/missing";
  await page.goto(url.href);
  await expect(page.getByRole("alert")).toContainText(
    "Диалог по ссылке не найден",
  );
  await expect(page.getByRole("textbox")).toBeVisible();
  await expect
    .poll(() => new URL(page.url()).pathname.split("/").at(-1))
    .not.toBe("missing");
});
