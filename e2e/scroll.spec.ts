import { test, expect } from "@playwright/test";

test("стрелка прокрутки скрыта в пустом чате и возвращает к последнему ответу", async ({ page }) => {
  await page.setViewportSize({ width: page.viewportSize()!.width, height: 480 });
  await page.goto(process.env.LOM_APP_URL ?? "/");
  const jump = page.getByRole("button", { name: "К новым сообщениям" });
  const list = page.locator('main [class*="_list_"]');
  await expect(page.getByRole("heading")).toBeVisible();
  await list.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect(jump).toHaveCount(0);

  await page.getByRole("textbox").fill("Объясни второй закон Ньютона");
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
  await expect(page.getByRole("button", { name: /Остановить/ })).toHaveCount(0, {
    timeout: 15000,
  });
  await expect(jump).toHaveCount(0);
  await list.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect(jump).toBeVisible();
  await jump.click();
  await expect(jump).toHaveCount(0);
});
