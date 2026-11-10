import type { AppThunk } from "../../index";
import { actions } from "./chatSlice";
import { createId } from "../../../shared/utils/createId";
import { isActive } from "./models";
import { selectCanRetry } from "./selectors";
import { MAX_MESSAGE_LENGTH } from "../../../shared/constants/chat";

export const newChat = (currentChatId?: string): AppThunk<string> => (dispatch, getState) => {
  const state = getState();
  const currentId = currentChatId ?? state.activeChatId;
  const chat = currentId && state.chats[currentId];
  if (chat && !chat.messageIds.length) return chat.id;
  const chatId = createId();
  dispatch(actions.createChat({ id: chatId, now: Date.now() }));
  return chatId;
};

export const sendMessage =
  (chatId: string, retry = false): AppThunk =>
  (dispatch, getState) => {
    const state = getState();
    const chat = state.chats[chatId];
    const previousGeneration = state.generationsByChatId[chatId];

    if (!chat || isActive(previousGeneration?.phase)) return;
    if (retry && !selectCanRetry(state, chatId)) return;

    const text = retry
      ? state.messages[previousGeneration.userMessageId].text
      : (state.draftsByChatId[chatId] ?? "").trim();
    if (!text || text.length > MAX_MESSAGE_LENGTH) return;

    dispatch(
      actions.requestAccepted({
        text,
        now: Date.now(),
        retry,
        generation: {
          chatId,
          requestId: createId(),
          userMessageId: retry ? previousGeneration.userMessageId : createId(),
          assistantMessageId: retry
            ? previousGeneration.assistantMessageId
            : createId(),
          attempt: retry ? previousGeneration.attempt + 1 : 1,
          phase: "queued",
        },
      }),
    );
  };
