import { ACTIVE_PHASES, type PHASES } from "./consts";

export type Phase = (typeof PHASES)[number];
export interface IChat {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageIds: string[];
}
export interface ICalculatorExecution {
  expression: string;
  result?: string;
}

export interface IMessage {
  id: string;
  chatId: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
  status?: Phase;
  completedAt?: number;
  tool?: ICalculatorExecution;
}
export interface IGeneration {
  requestId: string;
  chatId: string;
  userMessageId: string;
  assistantMessageId: string;
  attempt: number;
  phase: Phase;
  error?: string;
  tool?: ICalculatorExecution;
  composing?: boolean;
}
export interface IChatState {
  chats: Record<string, IChat>;
  messages: Record<string, IMessage>;
  generationsByChatId: Record<string, IGeneration>;
  activeChatId: string | null;
  draftsByChatId: Record<string, string>;
  scrollByChatId: Record<string, { top: number; bottom: boolean }>;
  warning: string | null;
}
export const isActive = (phase?: Phase) =>
  !!phase && ACTIVE_PHASES.includes(phase);
export const emptyState = (): IChatState => ({
  chats: {},
  messages: {},
  generationsByChatId: {},
  activeChatId: null,
  draftsByChatId: {},
  scrollByChatId: {},
  warning: null,
});
