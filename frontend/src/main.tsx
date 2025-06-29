import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./context/ThemeProvider.tsx";
import { TokenProvider } from "./hooks/useToken.tsx";
import { Toaster } from "sonner";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark">
      <TokenProvider>
        <App />
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "hsl(var(--background))",
              color: "hsl(var(--foreground))",
              border: "1px solid hsl(var(--primary) / 0.2)",
              borderRadius: "var(--radius)",
              fontSize: "15px",
              fontFamily: "var(--font-display)",
              fontWeight: "600",
              backdropFilter: "blur(8px)",
              boxShadow: "0 8px 32px hsl(var(--primary) / 0.1)",
            },
            className: "font-display font-semibold",
            duration: 6000,
          }}
          closeButton={false}
          richColors={false}
          expand={true}
          visibleToasts={1}
          gap={8}
          icons={{
            success: "⚡",
            error: "💀",
            warning: "⚠️",
            info: "🔗",
            loading: "⟳",
          }}
        />
      </TokenProvider>
    </ThemeProvider>
  </StrictMode>,
);
