import React from "react";
import { createRoot } from "react-dom/client";
import { inject } from "@vercel/analytics";
import App from "./App.jsx";
import "./styles/app.css";
import { initAnalytics } from "./app/analytics.js";
import { initYandex } from "./app/yandex.js";

inject();
initAnalytics();
initYandex();

createRoot(document.getElementById("root")).render(<App />);
