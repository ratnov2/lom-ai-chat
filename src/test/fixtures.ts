import { createAppStore } from "../store";
import { actions } from "../store/chat/state/chatSlice";
export const fixture = () => {
  const store = createAppStore();
  store.dispatch(actions.createChat({ id: "a", now: 1 }));
  return store;
};
