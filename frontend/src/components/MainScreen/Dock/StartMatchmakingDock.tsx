import React from "react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import DockBase from "./DockBase";

export interface StartMatchmakingProps {
  onStart: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const StartMatchmakingDock: React.FC<StartMatchmakingProps> = ({
  onStart,
  disabled = false,
  loading = false,
}) => (
  <DockBase networkStatus="disconnected">
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="w-2 h-2 bg-muted rounded-full"></div>
        <span className="text-sm font-medium">Ready to connect</span>
      </div>
      <Button
        onClick={onStart}
        disabled={disabled || loading}
        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        <Play className="w-5 h-5 mr-2" />
        {loading ? "Starting..." : "Start Matchmaking"}
      </Button>
    </div>
  </DockBase>
);

export default StartMatchmakingDock;
