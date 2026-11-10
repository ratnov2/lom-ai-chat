import { CHAT_ROUTE } from "./pages/Chat/consts";
import { Route, Routes } from "react-router-dom";
import { ChatRoute } from "./pages/Chat/ChatRoute";

export const App = () => (
  <Routes>
    <Route path={CHAT_ROUTE} element={<ChatRoute />} />
    <Route path="*" element={<ChatRoute />} />
  </Routes>
);
