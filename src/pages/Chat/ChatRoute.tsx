import { CHAT_ROUTE } from "./consts";
import { ERROR_MESSAGES } from "../../shared/constants/errors";
import { useLayoutEffect } from "react";
import { generatePath, Navigate, useLocation, useParams } from "react-router-dom";
import { useAppDispatch } from "../../shared/hooks/useAppDispatch";
import { useAppSelector } from "../../shared/hooks/useAppSelector";
import { actions } from "../../store/chat/state/chatSlice";
import { newChat } from "../../store/chat/state/commands";
import { Chat } from "./Chat";

export const ChatRoute = () => {
  const { chatId } = useParams();
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const requestedChatId = chatId ?? search.get("chatId");
  const dispatch = useAppDispatch();
  const activeChatId = useAppSelector((state) => state.activeChatId);
  const requestedChatExists = useAppSelector((state) =>
    Boolean(requestedChatId && Object.hasOwn(state.chats, requestedChatId)),
  );
  const resolvedChatId = requestedChatExists ? requestedChatId : activeChatId;

  useLayoutEffect(() => {
    if (requestedChatId && !requestedChatExists) {
      dispatch(actions.warning(ERROR_MESSAGES.CHAT_NOT_FOUND));
    }
    if (!resolvedChatId) dispatch(newChat());
    else if (activeChatId !== resolvedChatId)
      dispatch(actions.selectChat(resolvedChatId));
  }, [dispatch, requestedChatId, requestedChatExists, resolvedChatId, activeChatId]);

  if (!resolvedChatId) return null;

  const pathname = generatePath(CHAT_ROUTE, { chatId: resolvedChatId });
  if (location.pathname !== pathname || search.has("chatId")) {
    search.delete("chatId");
    return (
      <Navigate
        to={{ pathname, search: search.toString(), hash: location.hash }}
        state={location.state}
        replace
      />
    );
  }

  return <Chat chatId={resolvedChatId} />;
};
