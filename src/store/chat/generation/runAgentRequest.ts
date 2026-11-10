import {
  ERROR_CODES,
  ERROR_NAMES,
  ERROR_MESSAGES,
} from "../../../shared/constants/errors";
import type { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import type { IAgentClient, AgentEvent } from "../../../agent/types";
import { actions } from "../state/chatSlice";
import { isActive, type IChatState } from "../state/models";
import { completedHistory } from "../state/selectors";

interface IRunAgentRequestOptions {
  agent: IAgentClient;
  request: ReturnType<typeof actions.requestAccepted>["payload"];
  controllers: Map<string, AbortController>;
  dispatch: Dispatch<UnknownAction>;
  getState: () => IChatState;
}

export async function runAgentRequest({
  agent,
  request,
  controllers,
  dispatch,
  getState,
}: IRunAgentRequestOptions): Promise<void> {
  const { generation, text } = request;
  const { chatId, requestId, userMessageId, attempt } = generation;
  const state = getState();

  const controller = new AbortController();
  controllers.set(chatId, controller);

  const emit = (event: AgentEvent) => {
    dispatch(
      actions.eventReceived({
        chatId,
        requestId,
        event,
        receivedAt: Date.now(),
      }),
    );
  };

  let hasTerminalEvent = false;

  try {
    const input = {
      message: text,
      history: completedHistory(state, chatId, userMessageId),
      attempt,
    };

    for await (const event of agent.stream(input, controller.signal)) {
      if (controller.signal.aborted) break;

      emit(event);
      if (event.type === "completed" || event.type === "error") {
        hasTerminalEvent = true;
        break;
      }
    }

    if (!hasTerminalEvent && !controller.signal.aborted) {
      emit({
        type: "error",
        code: ERROR_CODES.INCOMPLETE,
        message: ERROR_MESSAGES.STREAM_INCOMPLETE,
      });
    }
  } catch (error) {
    const isAbortError =
      error instanceof Error && error.name === ERROR_NAMES.ABORT;

    if (controller.signal.aborted || isAbortError) {
      const currentGeneration = getState().generationsByChatId[chatId];
      if (
        currentGeneration?.requestId === requestId &&
        isActive(currentGeneration.phase)
      ) {
        dispatch(actions.cancelled(chatId));
      }
    } else {
      emit({
        type: "error",
        code: ERROR_CODES.UNEXPECTED,
        message: ERROR_MESSAGES.AGENT_UNEXPECTED,
      });
    }
  } finally {
    if (controllers.get(chatId) === controller) {
      controllers.delete(chatId);
    }
  }
}
