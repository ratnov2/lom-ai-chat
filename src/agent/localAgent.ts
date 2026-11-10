import {
  DEFAULT_AGENT_DELAYS,
  STREAM_WORDS_PER_CHUNK,
  PARTIAL_ERROR_CHUNK_OFFSET,
} from "./consts";
import { ERROR_CODES, ERROR_MESSAGES } from "../shared/constants/errors";
import type { IAgentClient, AgentEvent } from "./types";
import { abortableDelay } from "./abortableDelay";
import { scenario } from "./scenarios";
import { calculate } from "./calculator";
export function createLocalAgent(delays = DEFAULT_AGENT_DELAYS): IAgentClient {
  return {
    async *stream(input, signal): AsyncGenerator<AgentEvent> {
      yield { type: "started" };
      yield { type: "status", phase: "processing" };
      await abortableDelay(delays.initial, signal);
      const scenarioResult = scenario(input);
      if (
        scenarioResult.error &&
        input.attempt === 1 &&
        !scenarioResult.partial
      ) {
        yield {
          type: "error",
          code: ERROR_CODES.REQUEST_FAILED,
          message: ERROR_MESSAGES.REQUEST_FAILED,
        };
        return;
      }
      let text = scenarioResult.text;
      if (scenarioResult.expression) {
        yield {
          type: "tool_call",
          tool: "calculator",
          expression: scenarioResult.expression,
        };
        await abortableDelay(delays.tool, signal);
        try {
          const result = calculate(scenarioResult.expression);
          yield { type: "tool_result", tool: "calculator", result };
          text = `${scenarioResult.expression} = ${result}.\n\nВычисление выполнено калькулятором.`;
        } catch (error) {
          yield {
            type: "error",
            code: ERROR_CODES.CALCULATOR,
            message: (error as Error).message,
          };
          return;
        }
      }
      yield { type: "status", phase: "composing" };
      const chunks = text.match(/\S+\s*/g) ?? [];
      for (
        let chunkIndex = 0;
        chunkIndex < chunks.length;
        chunkIndex += STREAM_WORDS_PER_CHUNK
      ) {
        await abortableDelay(delays.chunk, signal);
        yield {
          type: "text_delta",
          text: chunks
            .slice(chunkIndex, chunkIndex + STREAM_WORDS_PER_CHUNK)
            .join(""),
        };
        if (
          scenarioResult.partial &&
          input.attempt === 1 &&
          chunkIndex >= PARTIAL_ERROR_CHUNK_OFFSET
        ) {
          yield {
            type: "error",
            code: ERROR_CODES.REQUEST_FAILED,
            message: ERROR_MESSAGES.STREAM_FAILED,
          };
          return;
        }
      }
      yield { type: "completed" };
    },
  };
}
