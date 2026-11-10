export const PHASES = [
  "queued",
  "processing",
  "tool_running",
  "streaming",
  "completed",
  "failed",
  "cancelled",
  "interrupted",
] as const;

export const ACTIVE_PHASES: readonly (typeof PHASES)[number][] = [
  "queued",
  "processing",
  "tool_running",
  "streaming",
];

export const RETRYABLE_PHASES: readonly (typeof PHASES)[number][] = [
  "failed",
  "cancelled",
  "interrupted",
];

export const CHAT_TITLE_MAX_LENGTH = 48;
