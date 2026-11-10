import { test, expect } from "@playwright/test";

test("длительность и действия сохраняются в истории ответа", async ({
  page,
}) => {
  await page.goto(process.env.LOM_APP_URL ?? "/");
  await page.getByRole("textbox").fill("Сколько будет 17 × 24?");
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
  const response = page.getByRole("article", { name: "Ответ LOM AI" }).first();
  const summary = response.locator("summary");
  await expect(summary).toHaveText(/Выполнено за \d+ с/, { timeout: 15000 });
  const label = await summary.textContent();
  await summary.click();
  await expect(
    response.getByText("Использован калькулятор", { exact: true }),
  ).toBeVisible();
  await expect(
    response.getByText("▦ Калькулятор: 17 × 24 = 408"),
  ).toBeVisible();
  await expect(response.getByText("Подготовлен ответ")).toBeVisible();
  await page.getByRole("textbox").fill("Объясни закон Ома");
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
  await expect(summary).toHaveText(label!);
  await page.reload();
  await expect(summary).toHaveText(label!);
  await summary.click();
  await expect(
    response.getByText("▦ Калькулятор: 17 × 24 = 408"),
  ).toBeVisible();
});
