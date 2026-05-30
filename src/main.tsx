import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { I18nProvider } from "./i18n";
import { StoreProvider } from "./store";
import "./index.css";

// HashRouter keeps deep links working on static hosts (GitHub Pages, etc.)
// with zero server configuration.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <StoreProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </StoreProvider>
    </I18nProvider>
  </React.StrictMode>
);
