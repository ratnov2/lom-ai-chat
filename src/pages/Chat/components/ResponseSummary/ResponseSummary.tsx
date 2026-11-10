import type { ReactNode } from "react";
import type { ICalculatorExecution } from "../../../../store/chat/state/models";
import styles from "./ResponseSummary.module.css";

interface IResponseSummaryProps {
  startedAt: number;
  completedAt?: number;
  tool?: ICalculatorExecution;
  status?: ReactNode;
}

export const ResponseSummary = ({
  startedAt,
  completedAt,
  tool,
  status,
}: IResponseSummaryProps) => {
  const isPending = Boolean(status);
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
    <details className={styles.summary} data-pending={isPending}>
      <summary
        aria-disabled={isPending || undefined}
        tabIndex={isPending ? -1 : 0}
        onClick={(event) => {
          if (isPending) event.preventDefault();
        }}
      >
        {status ?? label}
      </summary>
      {!isPending && (
        <div className={styles.activity}>
          {tool && <p>Использован калькулятор</p>}
          <p>
            <span className={styles.check} aria-hidden="true">
              ✓
            </span>{" "}
            Подготовлен ответ
          </p>
        </div>
      )}
    </details>
  );
};
