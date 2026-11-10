import { useSelector } from "react-redux";
import type { IChatState } from "../../store/chat/state/models";
export const useAppSelector = useSelector.withTypes<IChatState>();
