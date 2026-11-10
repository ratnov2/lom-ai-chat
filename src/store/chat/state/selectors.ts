import { createSelector } from "@reduxjs/toolkit";
import type { IChatState } from "./models";
import { RETRYABLE_PHASES } from "./consts";

export function selectCanRetry(state: IChatState, chatId: string): boolean {
  const chat = state.chats[chatId];
  const generation = state.generationsByChatId[chatId];
  if (!chat || !generation) return false;

  const hasRetryableStatus = RETRYABLE_PHASES.includes(generation.phase);
  const isLastResponse =
    chat.messageIds.at(-1) === generation.assistantMessageId;

  return hasRetryableStatus && isLastResponse;
}

export const completedHistory = (
  state: IChatState,
  chatId: string,
  beforeMessageId: string,
) => {
  const messageIds = state.chats[chatId].messageIds;
  const result: Array<{ role: "user" | "assistant"; text: string }> = [];
  for (
    let messageIndex = 0;
    messageIndex < messageIds.indexOf(beforeMessageId);
    messageIndex += 2
  ) {
    const userMessage = state.messages[messageIds[messageIndex]],
      assistantMessage = state.messages[messageIds[messageIndex + 1]];
    if (userMessage && assistantMessage?.status === "completed")
      result.push(
        { role: "user", text: userMessage.text },
        { role: "assistant", text: assistantMessage.text },
      );
  }
  return result;
};

export const selectSortedChats = createSelector(
  [(state: IChatState) => state.chats],
  (chats) =>
    Object.values(chats).sort(
      (first, second) => second.updatedAt - first.updatedAt,
    ),
);

export const selectChatById = (state: IChatState, chatId: string) =>
  state.chats[chatId];

export const selectGenerationByChatId = (state: IChatState, chatId: string) =>
  state.generationsByChatId[chatId];

export const selectMessagesByChatId = createSelector(
  [selectChatById, (state: IChatState) => state.messages],
  (chat, messages) =>
    chat?.messageIds.map((messageId) => messages[messageId]) ?? [],
);
