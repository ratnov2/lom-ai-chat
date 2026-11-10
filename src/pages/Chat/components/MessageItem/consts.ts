import type { Phase } from "../../../../store/chat/state/models";

export const AUTHORS = {
  user: { name: "Вы", avatar: "В", label: "Ваше сообщение" },
  assistant: { name: "LOM AI", avatar: "✳", label: "Ответ LOM AI" },
};

export const STATUS_NOTES: Partial<Record<Phase, string>> = {
  cancelled: "Ответ остановлен",
  interrupted: "Ответ прерван после перезагрузки",
};
