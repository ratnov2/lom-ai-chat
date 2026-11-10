import { createListenerMiddleware } from "@reduxjs/toolkit";
import { actions } from "../state/chatSlice";
import { isActive, type IChatState } from "../state/models";
import type { IAgentClient } from "../../../agent/types";
import { runAgentRequest } from "./runAgentRequest";

export function createAgentListeners(agent: IAgentClient) {
  const middleware = createListenerMiddleware<IChatState>();
  const controllers = new Map<string, AbortController>();

  middleware.startListening({
    actionCreator: actions.cancelled,
    effect: (action) => {
      controllers.get(action.payload)?.abort();
    },
  });

  middleware.startListening({
    actionCreator: actions.requestAccepted,
    effect: (action, api) => {
      const { generation } = action.payload;

      const { chatId, requestId } = generation;
      const state = api.getState();
      const currentGeneration = state.generationsByChatId[chatId];
      const previousGeneration =
        api.getOriginalState().generationsByChatId[chatId];

      if (
        currentGeneration?.requestId !== requestId ||
        previousGeneration?.requestId === requestId ||
        !isActive(currentGeneration.phase)
      ) {
        return;
      }

      return runAgentRequest({
        agent,
        request: action.payload,
        controllers,
        dispatch: api.dispatch,
        getState: api.getState,
      });
    },
  });

  return {
    middleware,
    dispose: () => {
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    },
  };
}
