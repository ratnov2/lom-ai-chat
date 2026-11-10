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
  const distanceBeforeJump = await list.evaluate(async (element) => {
    element.scrollTop = element.scrollHeight - element.clientHeight - 32;
    element.dispatchEvent(new Event("scroll"));
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    return element.scrollHeight - element.scrollTop - element.clientHeight;
  });
  expect(distanceBeforeJump).toBeGreaterThanOrEqual(31);
  expect(distanceBeforeJump).toBeLessThanOrEqual(33);
  await list.evaluate((element) => {
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll"));
  });
  await jump.click();
  await expect(jump).toHaveCount(0);
});

test("streaming не притягивает к низу при ручной прокрутке рядом с концом", async ({ page }) => {
  await page.setViewportSize({ width: page.viewportSize()!.width, height: 480 });
  await page.goto(process.env.LOM_APP_URL ?? "/");
  await page.getByRole("textbox").fill("Объясни второй закон Ньютона. ".repeat(60));
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
  const answer = page.getByRole("article", { name: "Ответ LOM AI" });
  await expect(answer).toContainText("Второй закон Ньютона");
  const list = page.locator('main [class*="_list_"]');
  const textLength = (await answer.innerText()).length;
  const readingPosition = await list.evaluate((element) => {
    element.scrollTop = element.scrollHeight - element.clientHeight - 32;
    element.dispatchEvent(new Event("scroll"));
    return element.scrollTop;
  });
  await expect.poll(async () => (await answer.innerText()).length).toBeGreaterThan(textLength + 30);
  expect(await list.evaluate((element) => element.scrollTop)).toBeCloseTo(readingPosition, 0);
  const jump = page.getByRole("button", { name: "К новым сообщениям" });
  await expect(jump).toBeVisible();
  await jump.click();
  await expect(page.getByRole("button", { name: /Остановить/ })).toHaveCount(0, { timeout: 15000 });
  await expect.poll(() => list.evaluate(
    (element) => element.scrollHeight - element.scrollTop - element.clientHeight,
  )).toBeLessThanOrEqual(1);
});
