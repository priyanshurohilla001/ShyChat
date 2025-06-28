import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { TokenProvider } from "./hooks/useToken.tsx";
import { SocketProvider } from "./hooks/useSocket.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TokenProvider>
      <SocketProvider>
        <App />
      </SocketProvider>
    </TokenProvider>
  </StrictMode>,
);
