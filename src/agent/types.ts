import type { ErrorCode } from "../shared/constants/errors";

export interface IAgentInput {
  message: string;
  history: Array<{ role: "user" | "assistant"; text: string }>;
  attempt: number;
}
export type AgentEvent =
  | { type: "started" }
  | { type: "status"; phase: "processing" | "composing" }
  | { type: "tool_call"; tool: "calculator"; expression: string }
  | { type: "tool_result"; tool: "calculator"; result: string }
  | { type: "text_delta"; text: string }
  | { type: "completed" }
  | { type: "error"; code: ErrorCode; message: string };
export interface IAgentClient {
  stream(input: IAgentInput, signal: AbortSignal): AsyncGenerator<AgentEvent>;
}
