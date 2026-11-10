import { test, expect } from "@playwright/test";

test("переносит localStorage в IndexedDB и восстанавливает частичный ответ", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("migration-seeded")) return;
    sessionStorage.setItem("migration-seeded", "true");
    localStorage.setItem(
      "lom-ai-chat:v1",
      JSON.stringify({
        version: 1,
        state: {
          chats: {
            a: {
              id: "a",
              title: "Вопрос",
              createdAt: 1,
              updatedAt: 1,
              messageIds: ["user", "assistant"],
            },
          },
          messages: {
            user: {
              id: "user",
              chatId: "a",
              role: "user",
              text: "Объясни закон Ома",
              createdAt: 1,
            },
            assistant: {
              id: "assistant",
              chatId: "a",
              role: "assistant",
              text: "Частичный ответ",
              createdAt: 1,
              status: "streaming",
            },
          },
          generationsByChatId: {
            a: {
              chatId: "a",
              requestId: "request",
              userMessageId: "user",
              assistantMessageId: "assistant",
              attempt: 1,
              phase: "streaming",
            },
          },
          activeChatId: "a",
          draftsByChatId: { a: "Старый черновик" },
        },
      }),
    );
  });
  await page.goto(process.env.LOM_APP_URL ?? "/");
  await expect(page.getByRole("textbox")).toHaveValue("Старый черновик");
  await expect(
    page.getByText("Частичный ответ", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Ответ прерван после перезагрузки/),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("lom-ai-chat:v1")),
  ).toBeNull();
  await page.getByRole("textbox").fill("Новый черновик");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<string>((resolve, reject) => {
            const request = indexedDB.open("lom-ai-chat", 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const database = request.result;
              const transaction = database.transaction("snapshots", "readonly");
              const snapshot = transaction
                .objectStore("snapshots")
                .get("current");
              transaction.oncomplete = () => {
                database.close();
                resolve(snapshot.result?.state.draftsByChatId.a);
              };
              transaction.onabort = () => {
                database.close();
                reject(transaction.error);
              };
            };
          }),
      ),
    )
    .toBe("Новый черновик");
  await page.reload();
  await expect(page.getByRole("textbox")).toHaveValue("Новый черновик");
  await expect(
    page.getByText("Частичный ответ", { exact: true }),
  ).toBeVisible();
});

test("при недоступной IndexedDB чат продолжает работать в памяти", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "indexedDB", {
      get() {
        throw new Error("denied");
      },
    }),
  );
  await page.goto(process.env.LOM_APP_URL ?? "/");
  await expect(page.getByRole("alert")).toContainText(
    "Приложение работает в памяти",
  );
  await page.getByRole("textbox").fill("Покажи ошибку");
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
  await expect(page.getByRole("button", { name: "Повторить" })).toBeVisible();
});
