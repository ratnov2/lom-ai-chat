import { EXAMPLE_PROMPTS } from "./consts";
import styles from "./EmptyChat.module.css";

export const EmptyChat = ({
  onExample,
}: {
  onExample: (text: string) => void;
}) => (
  <section className={styles.empty}>
    <div className={styles.symbol}>✳</div>
    <div className={styles.eyebrow}>УЧИМСЯ РАЗБИРАТЬСЯ ВМЕСТЕ</div>
    <h1>
      Сложное станет
      <br />
      <em>понятным.</em>
    </h1>
    <p className={styles.subtitle}>
      Задай вопрос, разбери задачу по шагам
      <br />
      или попроси объяснить ещё проще.
    </p>
    <div className={styles.cards}>
      {EXAMPLE_PROMPTS.map(({ icon, title, text }) => (
        <button type="button" key={title} onClick={() => onExample(text)}>
          <span className={styles.cardIcon}>{icon}</span>
          <strong>{title}</strong>
          <span>{text}</span>
          <b>↗</b>
        </button>
      ))}
    </div>
    <p className={styles.hint}>Выбери пример или напиши свой вопрос ниже</p>
  </section>
);
