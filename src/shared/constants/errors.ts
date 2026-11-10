export const ERROR_CODES = {
  REQUEST_FAILED: "REQUEST_FAILED",
  CALCULATOR: "CALCULATOR",
  INCOMPLETE: "INCOMPLETE",
  UNEXPECTED: "UNEXPECTED",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const ERROR_NAMES = {
  ABORT: "AbortError",
} as const;

export const ERROR_MESSAGES = {
  REQUEST_FAILED: "Не удалось получить ответ. Попробуй ещё раз.",
  STREAM_FAILED: "Не удалось завершить ответ. Попробуй ещё раз.",
  CALCULATOR_INVALID_EXPRESSION: "Введите одно выражение, например 17 × 24.",
  CALCULATOR_DIVISION_BY_ZERO: "На ноль делить нельзя.",
  CALCULATOR_NON_FINITE_RESULT: "Результат не является конечным числом.",
  STREAM_INCOMPLETE: "Агент завершил поток без ответа.",
  AGENT_UNEXPECTED: "Не удалось получить ответ. Повтори запрос.",
  RESPONSE_UNAVAILABLE: "Не удалось получить ответ.",
  CHAT_NOT_FOUND: "Диалог по ссылке не найден в этом браузере.",
  HISTORY_OPEN_FAILED:
    "Не удалось открыть историю в IndexedDB. Приложение работает в памяти.",
  HISTORY_RESTORE_FAILED:
    "Не удалось восстановить историю. Приложение продолжает работать в памяти.",
  LEGACY_HISTORY_RESTORE_FAILED: "Не удалось восстановить старую историю.",
  HISTORY_MIGRATION_FAILED:
    "Не удалось перенести историю в IndexedDB. Старая копия сохранена.",
  HISTORY_SAVE_FAILED: "История не сохраняется: IndexedDB недоступна или заполнена.",
  INDEXED_DB_UPGRADE_BLOCKED: "IndexedDB upgrade blocked",
  INDEXED_DB_READ_ABORTED: "IndexedDB read aborted",
  INDEXED_DB_WRITE_ABORTED: "IndexedDB write aborted",
  OPERATION_ABORTED: "Aborted",
} as const;
