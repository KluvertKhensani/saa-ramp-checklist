import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";

import App from "./App";
import "./styles/global.css";
import "./styles/mobile-overrides.css";

const rootElement =
  document.getElementById("root");

if (!rootElement) {
  throw new Error(
    'Application root element with id "root" was not found.'
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
);