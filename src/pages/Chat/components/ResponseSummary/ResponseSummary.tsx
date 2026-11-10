import type { ICalculatorExecution } from "../../../../store/chat/state/models";
import { ToolActivity } from "../ToolActivity/ToolActivity";
import styles from "./ResponseSummary.module.css";

interface IResponseSummaryProps {
  startedAt: number;
  completedAt?: number;
  tool?: ICalculatorExecution;
}

export const ResponseSummary = ({
  startedAt,
  completedAt,
  tool,
}: IResponseSummaryProps) => {
  const seconds = Math.max(
    0,
    Math.floor(((completedAt ?? startedAt) - startedAt) / 1000),
  );
  const minutes = Math.floor(seconds / 60);
  const duration = minutes
    ? `${minutes} мин ${seconds % 60} с`
    : `${seconds} с`;
  const label =
    completedAt === undefined ? "Ответ готов" : `Выполнено за ${duration}`;

  return (
    <details className={styles.summary}>
      <summary>{label}</summary>
      <div className={styles.activity}>
        {tool && (
          <>
            <p>Использован калькулятор</p>
            <ToolActivity {...tool} />
          </>
        )}
        <p>
          <span className={styles.check} aria-hidden="true">
            ✓
          </span>{" "}
          Подготовлен ответ
        </p>
      </div>
    </details>
  );
};
