import { CHAT_ROUTE } from "./consts";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { generatePath, useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../shared/hooks/useAppDispatch";
import { useAppSelector } from "../../shared/hooks/useAppSelector";
import { actions } from "../../store/chat/state/chatSlice";
import { newChat, sendMessage } from "../../store/chat/state/commands";
import { isActive } from "../../store/chat/state/models";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { MessageList } from "./components/MessageList/MessageList";
import { Composer } from "./components/Composer/Composer";
import { ErrorNotice } from "../../shared/ui/ErrorNotice/ErrorNotice";
import { ExamplePrompts } from "./components/ExamplePrompts/ExamplePrompts";
import {
  selectSortedChats,
  selectChatById,
  selectGenerationByChatId,
  selectMessagesByChatId,
} from "../../store/chat/state/selectors";
import styles from "./Chat.module.css";

interface IChatProps {
  chatId: string;
}

export function Chat({ chatId }: IChatProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const chats = useAppSelector(selectSortedChats);
  const chat = useAppSelector((state) => selectChatById(state, chatId));
  const generation = useAppSelector((state) => selectGenerationByChatId(state, chatId));
  const messages = useAppSelector((state) => selectMessagesByChatId(state, chatId));
  const generations = useAppSelector((state) => state.generationsByChatId);
  const warning = useAppSelector((state) => state.warning);
  const draft = useAppSelector((state) =>
    state.draftsByChatId[chatId] ?? "",
  );
  const savedScroll = useAppSelector((state) =>
    state.scrollByChatId[chatId],
  );

  const [isMobileListOpen, setMobileListOpen] = useState(false);
  const [focusVersion, setFocusVersion] = useState(0);
  const composerRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;

    const updateHeight = () => {
      composer.parentElement?.style.setProperty(
        "--composer-height",
        `${composer.getBoundingClientRect().height}px`,
      );
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(composer);
    return () => observer.disconnect();
  }, [Boolean(chat)]);

  useEffect(() => {
    setMobileListOpen(false);
  }, [chatId]);

  const handleSelectChat = (selectedChatId: string) => {
    const pathname = generatePath(CHAT_ROUTE, { chatId: selectedChatId });
    if (location.pathname !== pathname) {
      void navigate({
        pathname,
        search: location.search,
        hash: location.hash,
      });
    }
    setMobileListOpen(false);
  };

  const handleNewChat = () => {
    const newChatId = dispatch(newChat(chatId));
    handleSelectChat(newChatId);
    setFocusVersion((version) => version + 1);
  };

  const handleDraftChange = (text: string) => {
    dispatch(actions.draftChanged({ chatId, text }));
  };

  const handleExampleSelect = (text: string) => {
    handleDraftChange(text);
    setFocusVersion((version) => version + 1);
  };

  const handleSend = () => {
    dispatch(sendMessage(chatId));
  };

  const handleRetry = () => {
    dispatch(sendMessage(chatId, true));
  };

  const handleStop = () => {
    dispatch(actions.cancelled(chatId));
  };

  return (
    <div className={styles.app} data-list={isMobileListOpen}>
      <div className={styles.sidebar}>
        <Sidebar
          chats={chats}
          generations={generations}
          active={chatId}
          onNew={handleNewChat}
          onSelect={handleSelectChat}
        />
      </div>
      <main className={styles.main}>
        {chat && (
          <>
            <button
              type="button"
              className={styles.mobileNavigation}
              aria-label="К списку диалогов"
              onClick={() => setMobileListOpen(true)}
            >
              <span aria-hidden="true">☰</span> Диалоги
            </button>
            {warning && (
              <div className={styles.warning}>
                <ErrorNotice text={warning} />
              </div>
            )}
            <MessageList
              key={chatId}
              chatId={chatId}
              messages={messages}
              generation={generation}
              saved={savedScroll}
              onRetry={handleRetry}
              onExample={handleExampleSelect}
            />
            <footer className={styles.composer} ref={composerRef}>
              <Composer
                examples={<ExamplePrompts onSelect={handleExampleSelect} />}
                value={draft}
                onChange={handleDraftChange}
                busy={isActive(generation?.phase)}
                onSend={handleSend}
                onStop={handleStop}
                focusKey={`${chatId}:${focusVersion}`}
              />
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
