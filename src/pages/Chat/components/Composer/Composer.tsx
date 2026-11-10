import { useRef, useEffect, type ReactNode } from "react";
import { useAutosizeTextarea } from "../../../../shared/hooks/useAutosizeTextarea";
import { SendIcon } from "../../../../shared/ui/icons/SendIcon";
import { MAX_MESSAGE_LENGTH } from "../../../../shared/constants/chat";
import styles from "./Composer.module.css";

export const Composer = ({
  value,
  onChange,
  onSend,
  onStop,
  busy,
  focusKey,
  examples,
}: {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  onStop: () => void;
  busy: boolean;
  focusKey: string;
  examples?: ReactNode;
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutosizeTextarea(ref, value);

  useEffect(() => {
    ref.current?.focus();
  }, [focusKey]);

  const over = value.length > MAX_MESSAGE_LENGTH;
  const formattedLimit = MAX_MESSAGE_LENGTH.toLocaleString("ru-RU");

  return (
    <>
      <div className={styles.box}>
        <textarea
          ref={ref}
          aria-label="Сообщение"
          placeholder="Что хочешь изучить сегодня?"
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              if (!busy && !over && value.trim()) onSend();
            }
          }}
        />
        <div className={styles.toolbar}>
          {examples}
          <span className={styles.keyboardHint}>
            <kbd>Enter</kbd> отправить
            <span className={styles.lineBreakHint}>
              {" "}
              · Shift + Enter — новая строка
            </span>
          </span>
          <span className={styles.counter} data-over={over}>
            {value.length.toLocaleString("ru-RU")} / {formattedLimit}
          </span>
          {busy ? (
            <button className={styles.stop} onClick={onStop}>
              <span aria-hidden="true">■</span> Остановить
            </button>
          ) : (
            <button
              className={styles.send}
              aria-label="Отправить"
              disabled={over || !value.trim()}
              onClick={onSend}
            >
              <span>Отправить</span>
              <SendIcon />
            </button>
          )}
        </div>
      </div>
      <div className={styles.caption}>
        {over ? (
          <span role="alert">
            Лимит — {formattedLimit} символов. Сократи сообщение ({value.length}).
          </span>
        ) : (
          <>
            <span>Диалоги сохраняются в этом браузере</span>
          </>
        )}
      </div>
    </>
  );
};
