import { TEXTAREA_MAX_HEIGHT } from "./consts";
import { useLayoutEffect, type RefObject } from "react";
export function useAutosizeTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
) {
  useLayoutEffect(() => {
    const textarea = ref.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, TEXTAREA_MAX_HEIGHT) + "px";
    }
  }, [ref, value]);
}
