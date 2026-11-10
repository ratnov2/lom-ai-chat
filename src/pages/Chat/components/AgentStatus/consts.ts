import type { Phase } from "../../../../store/chat/state/models";

export const STATUS_TEXT_BY_PHASE: Partial<Record<Phase, string>> = {
  queued: "Запрос отправлен",
  processing: "Разбираюсь с задачей",
  tool_running: "Использую калькулятор",
  streaming: "Пишу ответ",
};

export const COMPOSING_STATUS_TEXT = "Формирую ответ";
