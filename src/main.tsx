import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./app.css";
import "./catalog.css";
import "./i18n/config";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
