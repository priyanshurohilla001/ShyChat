import React from "react";
import { Zap } from "lucide-react";

export interface DockBaseProps {
  children: React.ReactNode;
  showNetworkIndicator?: boolean;
  networkStatus?: "connected" | "connecting" | "disconnected";
}

const DockBase: React.FC<DockBaseProps> = ({
  children,
  showNetworkIndicator = true,
  networkStatus = "disconnected",
}) => (
  <>
    {/* Main Dock Container */}
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl px-6 py-4 shadow-2xl min-w-fit">
        {children}
      </div>
    </div>

    {/* Network Indicator */}
    {showNetworkIndicator && (
      <div className="fixed bottom-6 right-6 z-40">
        <div className="bg-background/90 backdrop-blur-md border border-border/40 rounded-full p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <Zap
              className={`w-4 h-4 transition-colors duration-200 ${
                networkStatus === "connected"
                  ? "text-green-400"
                  : networkStatus === "connecting"
                    ? "text-yellow-400 animate-pulse"
                    : "text-muted-foreground"
              }`}
            />
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-4 rounded-full transition-all duration-300 ${
                    networkStatus === "connected"
                      ? "bg-green-400"
                      : networkStatus === "connecting" && i <= 1
                        ? "bg-yellow-400"
                        : networkStatus === "disconnected" && i === 0
                          ? "bg-muted-foreground"
                          : "bg-muted/50"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
  </>
);

export default DockBase;
