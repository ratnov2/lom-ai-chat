import type { IChat, IGeneration } from "../../../../store/chat/state/models";
import { isActive } from "../../../../store/chat/state/models";
import { ChatItem } from "../ChatItem/ChatItem";
import styles from "./Sidebar.module.css";
export const Sidebar = ({
  chats,
  generations,
  active,
  onNew,
  onSelect,
}: {
  chats: IChat[];
  generations: Record<string, IGeneration>;
  active: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
}) => (
  <aside className={styles.sidebar}>
    <a className={styles.brand} href="./" aria-label="LOM AI, главная">
      <span className={styles.logo}>L</span> LOM{" "}
      <span className={styles.ai}>AI</span>
    </a>
    <p className={styles.caption}>Место, где становится понятно</p>
    <button className={styles.newChat} onClick={onNew}>
      ＋ Новый диалог
    </button>
    <div className={styles.label}>
      ДИАЛОГИ <span>{chats.length}</span>
    </div>
    <nav className={styles.list} aria-label="Диалоги">
      {chats.map((chat) => (
        <ChatItem
          key={chat.id}
          chat={chat}
          active={active === chat.id}
          busy={isActive(generations[chat.id]?.phase)}
          onSelect={() => onSelect(chat.id)}
        />
      ))}
    </nav>
    <div className={styles.footer}>
      <span className={styles.dot} /> Работает локально
      <p>Без регистрации. В твоём браузере.</p>
    </div>
  </aside>
);
