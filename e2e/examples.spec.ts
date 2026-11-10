import { test, expect } from "@playwright/test";

test("примеры открываются в компактном меню и заполняют поле", async ({
  page,
}) => {
  await page.goto(process.env.LOM_APP_URL ?? "/");
  const trigger = page.locator("summary").filter({ hasText: "Примеры" });
  const example = page.getByRole("button", {
    name: "Покажи ошибку Ошибка до начала ответа",
    exact: true,
  });
  await expect(example).toBeHidden();
  await trigger.click();
  await expect(example).toBeVisible();
  await example.click();
  await expect(page.getByRole("textbox")).toHaveValue("Покажи ошибку");
  await expect(page.getByRole("textbox")).toBeFocused();
  await expect(example).toBeHidden();
  await expect(page.getByRole("article")).toHaveCount(0);
  await trigger.click();
  await trigger.press("Escape");
  await expect(example).toBeHidden();
  await trigger.click();
  await page.locator("main").click({ position: { x: 10, y: 10 } });
  await expect(example).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
