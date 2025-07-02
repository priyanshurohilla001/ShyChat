import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./context/ThemeProvider.tsx";
import { TokenProvider } from "./hooks/useToken.tsx";
import { Toaster } from "sonner";
import { ReactionProvider } from "./hooks/useReaction.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ReactionProvider>
      <ThemeProvider defaultTheme="dark">
        <TokenProvider>
          <App />
          <Toaster
            theme="dark"
            position="top-center"
            toastOptions={{
              style: {
                background: "hsl(var(--background) / 0.7)", // glassy, semi-transparent
                color: "hsl(var(--foreground))",
                border: "1.5px solid hsl(var(--primary) / 0.12)",
                borderRadius: "var(--radius)",
                fontFamily: "var(--font-display), var(--font-sans)",
                fontWeight: 700,
                fontSize: "1rem",
                boxShadow: "0 4px 24px hsl(var(--primary) / 0.10)",
                padding: "0.75rem 1rem",
                letterSpacing: "-0.01em",
                width: "100%",
                minWidth: "180px",
                maxWidth: "28rem", // 448px for large screens
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                transition: "background 0.2s, box-shadow 0.2s",
                margin: "0 auto", // center horizontally
              },
              className:
                "font-display text-base md:text-lg max-w-[90vw] md:max-w-[28rem] px-4 py-2",
              duration: 5000,
            }}
            closeButton={false}
            richColors={false}
            expand={true}
            visibleToasts={1}
            gap={10}
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
    </ReactionProvider>
  </StrictMode>,
);
