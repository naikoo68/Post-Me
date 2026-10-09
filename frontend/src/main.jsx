import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { consumeSessionFromUrl } from "./lib/api";

// Cross-subdomain session handoff (#session=<jwt>) — adopt the token before
// React renders so a client jumping to their own sub-site boots signed in.
consumeSessionFromUrl();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
