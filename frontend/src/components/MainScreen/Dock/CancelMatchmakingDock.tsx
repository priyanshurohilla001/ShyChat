import React from "react";
import { Button } from "@/components/ui/button";
import { X, Users } from "lucide-react";
import DockBase from "./DockBase";

export interface CancelMatchmakingProps {
  onCancel: () => void;
  searchText?: string;
  disabled?: boolean;
}

const CancelMatchmakingDock: React.FC<CancelMatchmakingProps> = ({
  onCancel,
  searchText = "Hunting for peers...",
  disabled = false,
}) => (
  <DockBase networkStatus="connecting">
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Users className="w-5 h-5 text-primary" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-ping"></div>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{searchText}</p>
          <p className="text-xs text-muted-foreground">Scanning campus network</p>
        </div>
      </div>
      <Button
        onClick={onCancel}
        disabled={disabled}
        variant="outline"
        className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-full px-6 py-2 transition-all duration-200 disabled:opacity-50"
      >
        <X className="w-4 h-4 mr-2" />
        Cancel
      </Button>
    </div>
  </DockBase>
);

export default CancelMatchmakingDock;
