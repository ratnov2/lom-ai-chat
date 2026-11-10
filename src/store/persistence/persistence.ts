import {
  LEGACY_STORAGE_KEY,
  SNAPSHOT_VERSION,
  SAVE_INTERVAL_MS,
} from "./consts";
import { PHASES } from "../chat/state/consts";
import { ERROR_MESSAGES } from "../../shared/constants/errors";
import { emptyState, isActive, type IChatState } from "../chat/state/models";
import type { ISnapshotStorage } from "./indexedDbStorage";

export const createSnapshot = (state: IChatState) => {
  const {
    scrollByChatId: _scroll,
    warning: _warning,
    ...persistedState
  } = state;
  return { version: SNAPSHOT_VERSION, state: persistedState };
};

export function restoreSnapshot(snapshot: unknown): IChatState {
  try {
    const data = structuredClone(snapshot) as ReturnType<typeof createSnapshot>;
    if (!data || data.version !== SNAPSHOT_VERSION) throw Error();
    const state = data.state as IChatState;
    const isRecord = (value: unknown) =>
      !!value && typeof value === "object" && !Array.isArray(value);
    if (
      !isRecord(state) ||
      !isRecord(state.chats) ||
      !isRecord(state.messages) ||
      !isRecord(state.generationsByChatId) ||
      !isRecord(state.draftsByChatId)
    )
      throw Error();

    for (const [id, chat] of Object.entries(state.chats)) {
      if (
        chat.id !== id ||
        typeof chat.title !== "string" ||
        !Number.isFinite(chat.createdAt) ||
        !Number.isFinite(chat.updatedAt) ||
        !Array.isArray(chat.messageIds) ||
        new Set(chat.messageIds).size !== chat.messageIds.length
      )
        throw Error();
      for (
        let messageIndex = 0;
        messageIndex < chat.messageIds.length;
        messageIndex++
      ) {
        const message = state.messages[chat.messageIds[messageIndex]];
        if (
          !message ||
          message.chatId !== id ||
          message.role !== (messageIndex % 2 ? "assistant" : "user")
        )
          throw Error();
      }
    }
    for (const [id, message] of Object.entries(state.messages)) {
      if (
        message.completedAt !== undefined &&
        (!Number.isFinite(message.completedAt) ||
          message.completedAt < message.createdAt)
      )
        throw Error();
      if (
        message.tool !== undefined &&
        (!isRecord(message.tool) ||
          typeof message.tool.expression !== "string" ||
          (message.tool.result !== undefined &&
            typeof message.tool.result !== "string"))
      )
        throw Error();
      if (
        message.id !== id ||
        !state.chats[message.chatId]?.messageIds.includes(id) ||
        typeof message.text !== "string" ||
        !Number.isFinite(message.createdAt) ||
        (message.status && !PHASES.includes(message.status))
      )
        throw Error();
    }
    for (const [id, generation] of Object.entries(state.generationsByChatId)) {
      if (
        generation.chatId !== id ||
        !state.chats[id] ||
        typeof generation.requestId !== "string" ||
        !Number.isInteger(generation.attempt) ||
        generation.attempt < 1 ||
        !PHASES.includes(generation.phase) ||
        state.messages[generation.userMessageId]?.chatId !== id ||
        state.messages[generation.userMessageId]?.role !== "user" ||
        state.messages[generation.assistantMessageId]?.chatId !== id ||
        state.messages[generation.assistantMessageId]?.role !== "assistant" ||
        state.chats[id].messageIds.at(-1) !== generation.assistantMessageId ||
        state.chats[id].messageIds.at(-2) !== generation.userMessageId ||
        state.messages[generation.assistantMessageId].status !==
          generation.phase
      )
        throw Error();
      if (
        generation.error !== undefined &&
        typeof generation.error !== "string"
      )
        throw Error();
      if (
        generation.tool &&
        (!isRecord(generation.tool) ||
          typeof generation.tool.expression !== "string" ||
          (generation.tool.result !== undefined &&
            typeof generation.tool.result !== "string"))
      )
        throw Error();
      if (isActive(generation.phase)) {
        generation.phase = "interrupted";
        state.messages[generation.assistantMessageId].status = "interrupted";
      }
    }
    if (state.activeChatId !== null && !state.chats[state.activeChatId])
      throw Error();
    for (const [id, text] of Object.entries(state.draftsByChatId))
      if (!state.chats[id] || typeof text !== "string") throw Error();
    state.scrollByChatId = {};
    state.warning = null;
    return state;
  } catch {
    return {
      ...emptyState(),
      warning: ERROR_MESSAGES.HISTORY_RESTORE_FAILED,
    };
  }
}

export async function restore(storage: ISnapshotStorage): Promise<IChatState> {
  const snapshot = await storage.read();
  if (snapshot !== undefined) return restoreSnapshot(snapshot);

  let legacy: string | null;
  try {
    legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return emptyState();
  }
  if (legacy === null) return emptyState();

  let state: IChatState;
  try {
    state = restoreSnapshot(JSON.parse(legacy));
  } catch {
    return {
      ...emptyState(),
      warning: ERROR_MESSAGES.LEGACY_HISTORY_RESTORE_FAILED,
    };
  }
  if (state.warning) return state;

  // Remove the old copy only after the IndexedDB transaction commits.
  try {
    await storage.write(createSnapshot(state));
  } catch {
    return {
      ...state,
      warning: ERROR_MESSAGES.HISTORY_MIGRATION_FAILED,
    };
  }
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // IndexedDB already contains the migrated history and takes precedence.
  }
  return state;
}

export function attachPersistence(
  store: {
    getState: () => IChatState;
    subscribe: (listener: () => void) => () => void;
  },
  storage: ISnapshotStorage,
  warn: (text: string) => void,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disabled = false;
  let writes = Promise.resolve();
  let pendingWrites = 0;
  let previousState = store.getState();

  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    if (disabled) return writes;
    const snapshot = createSnapshot(store.getState());
    const write = async () => {
      try {
        if (!disabled) await storage.write(snapshot);
      } catch {
        disabled = true;
        warn(ERROR_MESSAGES.HISTORY_SAVE_FAILED);
      } finally {
        pendingWrites -= 1;
      }
    };
    // Start an idle transaction synchronously, including during pagehide.
    writes = pendingWrites++ === 0 ? write() : writes.then(write);
    return writes;
  };

  const unsubscribe = store.subscribe(() => {
    const state = store.getState();
    const previous = previousState;
    previousState = state;
    if (disabled) return;
    const unchanged =
      state.chats === previous.chats &&
      state.messages === previous.messages &&
      state.generationsByChatId === previous.generationsByChatId &&
      state.draftsByChatId === previous.draftsByChatId &&
      state.activeChatId === previous.activeChatId;
    if (unchanged) return;

    const requestChanged = Object.values(state.generationsByChatId).some(
      (generation) => {
        const old = previous.generationsByChatId[generation.chatId];
        return (
          old?.requestId !== generation.requestId ||
          old.phase !== generation.phase
        );
      },
    );
    if (
      requestChanged ||
      Object.keys(state.chats).length !== Object.keys(previous.chats).length ||
      state.activeChatId !== previous.activeChatId
    ) {
      void flush();
    } else if (!timer) {
      timer = setTimeout(() => void flush(), SAVE_INTERVAL_MS);
    }
  });

  const onPageHide = () => {
    void flush();
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") void flush();
  };
  window.addEventListener("beforeunload", onPageHide);
  window.addEventListener("pagehide", onPageHide);
  document.addEventListener("visibilitychange", onVisibilityChange);
  return {
    flush,
    async dispose() {
      unsubscribe();
      window.removeEventListener("beforeunload", onPageHide);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      await flush();
      storage.close();
    },
  };
}
