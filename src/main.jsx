import RuntimeNotice from "./components/RuntimeNotice.jsx";
import "./styles/refinements.css";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <RuntimeNotice />
  </React.StrictMode>,
);
