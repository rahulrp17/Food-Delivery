import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Providers } from "./providers.jsx";
import App from "./App.jsx";
import "./styles/tokens.css";
import "./styles/admin-theme.css";
import "./styles/globals.css";
import "./styles/motion.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Providers>
        <App />
      </Providers>
    </BrowserRouter>
  </StrictMode>
);
