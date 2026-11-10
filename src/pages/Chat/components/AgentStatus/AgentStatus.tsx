import { useEffect, useState } from "react";
import { COMPOSING_STATUS_TEXT, STATUS_TEXT_BY_PHASE } from "./consts";
import type { IGeneration } from "../../../../store/chat/state/models";
import { isActive } from "../../../../store/chat/state/models";
import { Spinner } from "../../../../shared/ui/Spinner/Spinner";
import styles from "./AgentStatus.module.css";

function getStatusText(generation?: IGeneration): string | null {
  if (!generation || !isActive(generation.phase)) return null;

  return generation.phase === "processing" && generation.composing
    ? COMPOSING_STATUS_TEXT
    : (STATUS_TEXT_BY_PHASE[generation.phase] ?? null);
}

export const AgentStatus = ({
  generation,
  startedAt,
}: {
  generation?: IGeneration;
  startedAt?: number;
}) => {
  const statusText = getStatusText(generation);
  const active = Boolean(statusText);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!active) return;

    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active, generation?.requestId]);

  const seconds = Math.max(0, Math.floor((now - (startedAt ?? now)) / 1000));

  if (!active) return null;

  return (
    <span className={styles.status}>
      <span className={styles.label} role="status" aria-live="polite">
        <Spinner /> {statusText}
      </span>
      <span className={styles.elapsed} role="timer" aria-live="off">
        Работаю {seconds} сек
      </span>
    </span>
  );
};
