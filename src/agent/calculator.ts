import { SUBTRACTION_OPERATORS, MULTIPLICATION_OPERATORS } from "./consts";
import { ERROR_MESSAGES } from "../shared/constants/errors";
export function calculate(expression: string): string {
  const match = expression
    .replace(/,/g, ".")
    .match(/^\s*(-?\d+(?:\.\d+)?)\s*([+*×/÷−-])\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) throw Error(ERROR_MESSAGES.CALCULATOR_INVALID_EXPRESSION);
  const leftOperand = Number(match[1]),
    rightOperand = Number(match[3]);
  if ((match[2] === "/" || match[2] === "÷") && rightOperand === 0)
    throw Error(ERROR_MESSAGES.CALCULATOR_DIVISION_BY_ZERO);
  const result =
    match[2] === "+"
      ? leftOperand + rightOperand
      : SUBTRACTION_OPERATORS.includes(match[2])
        ? leftOperand - rightOperand
        : MULTIPLICATION_OPERATORS.includes(match[2])
          ? leftOperand * rightOperand
          : leftOperand / rightOperand;
  if (!Number.isFinite(result))
    throw Error(ERROR_MESSAGES.CALCULATOR_NON_FINITE_RESULT);
  return String(Number(result.toPrecision(12)));
}
