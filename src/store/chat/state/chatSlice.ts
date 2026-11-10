import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { emptyState, isActive, type IGeneration } from "./models";
import type { AgentEvent } from "../../../agent/types";
import { CHAT_TITLE_MAX_LENGTH } from "./consts";
export const chatSlice = createSlice({
  name: "chat",
  initialState: emptyState(),
  reducers: {
    createChat(state, action: PayloadAction<{ id: string; now: number }>) {
      const { id, now } = action.payload;
      state.chats[id] = {
        id,
        title: "Новый диалог",
        createdAt: now,
        updatedAt: now,
        messageIds: [],
      };
      state.activeChatId = id;
    },
    selectChat(state, action: PayloadAction<string>) {
      if (state.chats[action.payload]) state.activeChatId = action.payload;
    },
    draftChanged(
      state,
      action: PayloadAction<{ chatId: string; text: string }>,
    ) {
      state.draftsByChatId[action.payload.chatId] = action.payload.text;
    },
    scrollSaved(
      state,
      action: PayloadAction<{ chatId: string; top: number; bottom: boolean }>,
    ) {
      state.scrollByChatId[action.payload.chatId] = action.payload;
    },
    warning(state, action: PayloadAction<string>) {
      state.warning = action.payload;
    },
    requestAccepted(
      state,
      action: PayloadAction<{
        generation: IGeneration;
        text: string;
        now: number;
        retry: boolean;
      }>,
    ) {
      const { generation, text, now, retry } = action.payload;
      const chat = state.chats[generation.chatId];
      const currentGeneration = state.generationsByChatId[generation.chatId];
      if (
        !chat ||
        currentGeneration?.requestId === generation.requestId ||
        isActive(currentGeneration?.phase)
      ) {
        return;
      }
      if (!retry) {
        state.messages[generation.userMessageId] = {
          id: generation.userMessageId,
          chatId: generation.chatId,
          role: "user",
          text,
          createdAt: now,
        };
        chat.messageIds.push(
          generation.userMessageId,
          generation.assistantMessageId,
        );
        chat.updatedAt = now;
        if (chat.messageIds.length === 2)
          chat.title = text.length > CHAT_TITLE_MAX_LENGTH
            ? text.slice(0, CHAT_TITLE_MAX_LENGTH) + "…"
            : text;
        state.draftsByChatId[generation.chatId] = "";
      }
      state.messages[generation.assistantMessageId] = {
        id: generation.assistantMessageId,
        chatId: generation.chatId,
        role: "assistant",
        text: "",
        createdAt: now,
        status: "queued",
      };
      state.generationsByChatId[generation.chatId] = generation;
      state.scrollByChatId[generation.chatId] = { top: 0, bottom: true };
    },
    eventReceived(
      state,
      action: PayloadAction<{
        chatId: string;
        requestId: string;
        event: AgentEvent;
        receivedAt?: number;
      }>,
    ) {
      const { chatId, requestId, event, receivedAt } = action.payload;
      const generation = state.generationsByChatId[chatId];
      if (
        !state.chats[chatId] ||
        !generation ||
        generation.requestId !== requestId ||
        !isActive(generation.phase)
      )
        return;
      const message = state.messages[generation.assistantMessageId];
      switch (event.type) {
        case "started":
        case "status":
          generation.phase = "processing";
          generation.composing =
            event.type === "status" && event.phase === "composing";
          break;
        case "tool_call":
          generation.phase = "tool_running";
          generation.tool = { expression: event.expression };
          message.tool = { expression: event.expression };
          break;
        case "tool_result":
          if (generation.tool) generation.tool.result = event.result;
          if (message.tool) message.tool.result = event.result;
          generation.phase = "processing";
          break;
        case "text_delta":
          generation.phase = "streaming";
          message.text += event.text;
          break;
        case "completed":
          generation.phase = "completed";
          message.completedAt = receivedAt;
          break;
        case "error":
          generation.phase = "failed";
          generation.error = event.message;
          break;
      }
      message.status = generation.phase;
    },
    cancelled(state, action: PayloadAction<string>) {
      const generation = state.generationsByChatId[action.payload];
      if (generation && isActive(generation.phase)) {
        generation.phase = "cancelled";
        state.messages[generation.assistantMessageId].status = "cancelled";
      }
    },
  },
});
export const actions = chatSlice.actions;
