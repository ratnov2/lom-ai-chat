import type { IChat } from "../../../../store/chat/state/models";
import { Spinner } from "../../../../shared/ui/Spinner/Spinner";
import styles from "./ChatItem.module.css";
export const ChatItem = ({
  chat,
  active,
  busy,
  onSelect,
}: {
  chat: IChat;
  active: boolean;
  busy: boolean;
  onSelect: () => void;
}) => (
  <button
    className={`${styles.item} ${active ? styles.active : ""}`}
    onClick={onSelect}
    aria-current={active ? "page" : undefined}
  >
    <span className={styles.icon}>▤</span>
    <span className={styles.title}>{chat.title}</span>
    {busy && <Spinner />}
  </button>
);
