import { AUTHORS, STATUS_NOTES } from "./consts";
import { ERROR_MESSAGES } from "../../../../shared/constants/errors";
import type { IMessage, IGeneration } from "../../../../store/chat/state/models";
import { isActive } from "../../../../store/chat/state/models";
import { ToolActivity } from "../ToolActivity/ToolActivity";
import { ResponseSummary } from "../ResponseSummary/ResponseSummary";
import { ErrorNotice } from "../../../../shared/ui/ErrorNotice/ErrorNotice";
import { formatTime } from "../../../../shared/utils/formatTime";
import styles from "./MessageItem.module.css";

interface IMessageItemProps {
  message: IMessage;
  generation?: IGeneration;
  onRetry?: () => void;
  animate?: boolean;
}

export const MessageItem = ({
  message,
  generation,
  onRetry,
  animate = false,
}: IMessageItemProps) => {
  const author = AUTHORS[message.role];
  const isUser = message.role === "user";
  const isFailed = message.status === "failed";
  const isCompleted = !isUser && message.status === "completed";
  const tool = message.tool ?? generation?.tool;
  const statusNote = message.status ? STATUS_NOTES[message.status] : undefined;
  const placeholder =
    !isUser && isActive(message.status) ? "Готовлю ответ…" : "";

  return (
    <article
      className={`${styles.message} ${isUser ? styles.user : ""} ${animate ? styles.appear : ""}`}
      aria-label={author.label}
    >
      {!isUser && <div className={styles.avatar}>{author.avatar}</div>}
      <div className={styles.body}>
        {!isUser && (
          <div className={styles.meta}>
            <strong>{author.name}</strong>
            <time>{formatTime(message.createdAt)}</time>
          </div>
        )}

        {isCompleted && (
          <ResponseSummary
            startedAt={message.createdAt}
            completedAt={message.completedAt}
            tool={tool}
          />
        )}
        {!isCompleted && tool && <ToolActivity {...tool} />}
        <div className={styles.text}>
          {message.text ||
            (placeholder && (
              <span className={styles.waiting}>{placeholder}</span>
            ))}
          {isUser && (
            <>
              <span className={styles.timeSpace} aria-hidden="true" />
              <time
                className={styles.messageTime}
                dateTime={new Date(message.createdAt).toISOString()}
              >
                {formatTime(message.createdAt)}
              </time>
            </>
          )}
        </div>

        {isFailed && (
          <ErrorNotice
            text={generation?.error ?? ERROR_MESSAGES.RESPONSE_UNAVAILABLE}
            onRetry={onRetry}
          />
        )}
        {statusNote && (
          <div className={styles.note}>
            {statusNote}{" "}
            {onRetry && <button onClick={onRetry}>Повторить</button>}
          </div>
        )}
      </div>
    </article>
  );
};
