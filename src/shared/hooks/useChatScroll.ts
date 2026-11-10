import { SCROLL_BOTTOM_THRESHOLD, SCROLL_BOTTOM_TOLERANCE } from "./consts";
import { useLayoutEffect, useRef, useState } from "react";
import { useAppDispatch } from "./useAppDispatch";
import { actions } from "../../store/chat/state/chatSlice";
import type { IMessage } from "../../store/chat/state/models";
export function useChatScroll(
  chatId: string,
  lastMessage: IMessage | undefined,
  saved?: { top: number; bottom: boolean },
) {
  const ref = useRef<HTMLDivElement>(null);
  const bottom = useRef(saved?.bottom ?? true);

  const [show, setShow] = useState(false);

  const dispatch = useAppDispatch();

  useLayoutEffect(() => {
    const listElement = ref.current;
    if (!listElement) return;
    bottom.current = !lastMessage || (saved?.bottom ?? true);
    listElement.scrollTop = bottom.current
      ? listElement.scrollHeight
      : (saved?.top ?? 0);
    setShow(!bottom.current);
  }, [chatId]);

  useLayoutEffect(() => {
    const listElement = ref.current;
    if (!listElement) return;

    const observer = new ResizeObserver(() => {
      if (
        listElement.scrollHeight - listElement.clientHeight <
        SCROLL_BOTTOM_TOLERANCE
      ) {
        bottom.current = true;
        setShow(false);
      }
      if (bottom.current) listElement.scrollTop = listElement.scrollHeight;
    });
    observer.observe(listElement);
    return () => observer.disconnect();
  }, [chatId]);

  useLayoutEffect(() => {
    const listElement = ref.current;
    if (!listElement) return;
    if (bottom.current || saved?.bottom) {
      listElement.scrollTop = listElement.scrollHeight;
      bottom.current = true;
      setShow(false);
    } else {
      setShow(
        listElement.scrollHeight -
          listElement.scrollTop -
          listElement.clientHeight >=
          SCROLL_BOTTOM_THRESHOLD,
      );
    }
  }, [lastMessage, saved?.bottom]);

  const onScroll = () => {
    const listElement = ref.current;
    if (!listElement || !lastMessage) return;
    const distanceToBottom =
      listElement.scrollHeight -
      listElement.scrollTop -
      listElement.clientHeight;
    bottom.current = distanceToBottom <= SCROLL_BOTTOM_TOLERANCE;
    setShow(distanceToBottom >= SCROLL_BOTTOM_THRESHOLD);
    dispatch(
      actions.scrollSaved({
        chatId,
        top: listElement.scrollTop,
        bottom: bottom.current,
      }),
    );
  };

  const toBottom = () => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
      onScroll();
    }
  };
  return { ref, show: Boolean(lastMessage) && show, onScroll, toBottom };
}
