import { ERROR_NAMES, ERROR_MESSAGES } from "../shared/constants/errors";
export function abortableDelay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(
        new DOMException(ERROR_MESSAGES.OPERATION_ABORTED, ERROR_NAMES.ABORT),
      );
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}
