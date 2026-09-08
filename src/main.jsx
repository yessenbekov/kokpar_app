import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/app.css";

if (screen.orientation?.lock) {
  screen.orientation.lock("landscape-primary").catch(() => {});
}

createRoot(document.getElementById("root")).render(<App />);
