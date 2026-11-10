import { SCENARIO_RESPONSES } from "./consts";
import type { IAgentInput } from "./types";
export function scenario({ message, history }: IAgentInput): {
  text: string;
  expression?: string;
  error?: boolean;
  partial?: boolean;
} {
  const normalizedMessage = message.toLowerCase().replace(/\s+/g, " ").trim();
  if (/покажи ошибку/.test(normalizedMessage))
    return {
      text: SCENARIO_RESPONSES.RETRY_SUCCESS,
      error: true,
      partial: /во время/.test(normalizedMessage),
    };
  const topic =
    [...history]
      .reverse()
      .find((historyMessage) =>
        /ньютон|закон ома|напряжени|сопротивлени|2x/i.test(historyMessage.text),
      )
      ?.text.toLowerCase() ?? "";
  if (
    /^(объясни проще|приведи пример|дальше|продолжи)[.!?]?$/.test(
      normalizedMessage,
    )
  ) {
    if (/2x/.test(topic)) {
      const start = history
        .map(
          (historyMessage) =>
            historyMessage.role === "user" &&
            /2\s*[xх]\s*\+\s*3\s*=\s*11/i.test(historyMessage.text),
        )
        .lastIndexOf(true);
      const steps = history
        .slice(Math.max(0, start))
        .filter(
          (historyMessage) =>
            historyMessage.role === "assistant" &&
            /Шаг/.test(historyMessage.text),
        ).length;
      return {
        text:
          steps === 1
            ? SCENARIO_RESPONSES.EQUATION_STEP_TWO
            : SCENARIO_RESPONSES.EQUATION_STEP_THREE,
      };
    }
    return {
      text: /ньютон/.test(topic)
        ? SCENARIO_RESPONSES.NEWTON_SIMPLE
        : /ома|напряжени|сопротивлени/.test(topic)
          ? SCENARIO_RESPONSES.OHM_SIMPLE
          : SCENARIO_RESPONSES.TOPIC_REQUIRED,
    };
  }
  if (/2\s*[xх]\s*\+\s*3\s*=\s*11/.test(normalizedMessage))
    return {
      text: SCENARIO_RESPONSES.EQUATION_STEP_ONE,
    };
  if (/ньютон/.test(normalizedMessage))
    return {
      text: SCENARIO_RESPONSES.NEWTON,
    };
  if (/закон ома/.test(normalizedMessage))
    return {
      text: SCENARIO_RESPONSES.OHM,
    };
  const expression = normalizedMessage
    .replace(/^(сколько (?:будет|равно)|посчитай|вычисли)\s*/, "")
    .replace(/[?!.]+$/, "")
    .trim();
  if (/\d\s*[+*×/÷−-]\s*-?\d/.test(expression)) return { text: ``, expression };
  return {
    text: SCENARIO_RESPONSES.CAPABILITIES,
  };
}
