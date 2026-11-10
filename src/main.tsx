import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { initializeStore } from "./store";
import { App } from "./App";
import "./index.css";

async function bootstrap() {
  const container = document.getElementById("root")!;
  const store = await initializeStore();

  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </React.StrictMode>,
  );
}
void bootstrap();
