import styles from "./ErrorNotice.module.css";
export const ErrorNotice = ({
  text,
  onRetry,
}: {
  text: string;
  onRetry?: () => void;
}) => (
  <div className={styles.error} role="alert">
    <span>{text}</span>
    {onRetry && <button onClick={onRetry}>Повторить</button>}
  </div>
);
