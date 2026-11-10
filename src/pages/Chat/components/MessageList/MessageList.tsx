import { useState } from "react";
import type { IMessage, IGeneration } from "../../../../store/chat/state/models";
import { MessageItem } from "../MessageItem/MessageItem";
import { EmptyChat } from "../EmptyChat/EmptyChat";
import { useChatScroll } from "../../../../shared/hooks/useChatScroll";
import { ArrowDownIcon } from "../../../../shared/ui/icons/ArrowDownIcon";
import styles from "./MessageList.module.css";

interface IMessageListProps {
  chatId: string;
  messages: IMessage[];
  generation?: IGeneration;
  saved?: { top: number; bottom: boolean };
  onRetry: () => void;
  onExample: (text: string) => void;
}

export const MessageList = ({
  chatId,
  messages,
  generation,
  saved,
  onRetry,
  onExample,
}: IMessageListProps) => {
  const [initialMessageIds] = useState(
    () => new Set(messages.map((message) => message.id)),
  );
  const lastMessage = messages.at(-1);
  const scroll = useChatScroll(chatId, lastMessage, saved);

  return (
    <div className={styles.wrap}>
      <div className={styles.list} ref={scroll.ref} onScroll={scroll.onScroll}>
        {messages.length > 0 ? (
          <div className={styles.inner}>
            {messages.map((message) => {
              const messageGeneration =
                generation?.assistantMessageId === message.id
                  ? generation
                  : undefined;

              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  animate={!initialMessageIds.has(message.id)}
                  generation={messageGeneration}
                  onRetry={messageGeneration ? onRetry : undefined}
                />
              );
            })}
          </div>
        ) : (
          <EmptyChat onExample={onExample} />
        )}
      </div>
      {scroll.show && (
        <button
          type="button"
          className={styles.jump}
          onClick={scroll.toBottom}
          aria-label="К новым сообщениям"
          title="К новым сообщениям"
        >
          <ArrowDownIcon />
        </button>
      )}
    </div>
  );
};
