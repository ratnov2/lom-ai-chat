import { ERROR_MESSAGES } from "../shared/constants/errors";
import {
  configureStore,
  type ThunkAction,
  type UnknownAction,
} from "@reduxjs/toolkit";
import { chatSlice, actions } from "./chat/state/chatSlice";
import { createAgentListeners } from "./chat/generation/agentListeners";
import { createLocalAgent } from "../agent/localAgent";
import type { IAgentClient } from "../agent/types";
import { emptyState, type IChatState } from "./chat/state/models";
import { restore, attachPersistence } from "./persistence/persistence";
import {
  openIndexedDb,
  type ISnapshotStorage,
} from "./persistence/indexedDbStorage";

export function createAppStore(
  initial: IChatState = emptyState(),
  agent: IAgentClient = createLocalAgent(),
) {
  const runtime = createAgentListeners(agent);
  const store = configureStore({
    reducer: chatSlice.reducer,
    preloadedState: initial,
    middleware: (get) => get().prepend(runtime.middleware.middleware),
  });
  return Object.assign(store, { dispose: runtime.dispose });
}
export async function initializeStore() {
  let initial = emptyState();
  let storage: ISnapshotStorage | undefined;
  try {
    storage = await openIndexedDb();
    initial = await restore(storage);
  } catch {
    storage?.close();
    storage = undefined;
    initial.warning = ERROR_MESSAGES.HISTORY_OPEN_FAILED;
  }
  const store = createAppStore(initial);
  if (storage) {
    attachPersistence(store, storage, (text) =>
      store.dispatch(actions.warning(text)),
    );
  }
  return store;
}
export type AppStore = ReturnType<typeof createAppStore>;
export type AppDispatch = AppStore["dispatch"];
export type AppThunk<Result = void> = ThunkAction<
  Result,
  IChatState,
  unknown,
  UnknownAction
>;
