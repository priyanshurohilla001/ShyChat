import React from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, StopCircle } from "lucide-react";
import DockBase from "./DockBase";

export interface InCallProps {
  isAudioMuted: boolean;
  onMuteToggle: () => void;
  audioDisabled?: boolean;
  isCameraOff: boolean;
  onVideoToggle: () => void;
  videoDisabled?: boolean;
  onEndCall: () => void;
  endCallDisabled?: boolean;
  callStatus?: string;
}

const InCallDock: React.FC<InCallProps> = ({
  isAudioMuted,
  onMuteToggle,
  audioDisabled = false,
  isCameraOff,
  onVideoToggle,
  videoDisabled = false,
  onEndCall,
  endCallDisabled = false,
  callStatus = "In Call",
}) => (
  <DockBase networkStatus="connected">
    <div className="flex items-center gap-4">
      {/* Call Status */}
      <div className="flex items-center gap-2 text-green-400">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <span className="text-sm font-medium">{callStatus}</span>
      </div>
      {/* Call Controls */}
      <div className="flex items-center gap-2 border-l border-border pl-4">
        {/* Audio Control */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMuteToggle}
          disabled={audioDisabled}
          className={`rounded-full w-12 h-12 p-0 transition-all duration-200 disabled:opacity-50 ${
            isAudioMuted
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
              : "hover:bg-muted border border-transparent"
          }`}
          title={isAudioMuted ? "Unmute" : "Mute"}
        >
          {isAudioMuted ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </Button>
        {/* Video Control */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onVideoToggle}
          disabled={videoDisabled}
          className={`rounded-full w-12 h-12 p-0 transition-all duration-200 disabled:opacity-50 ${
            isCameraOff
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
              : "hover:bg-muted border border-transparent"
          }`}
          title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
        >
          {isCameraOff ? (
            <VideoOff className="w-5 h-5" />
          ) : (
            <Video className="w-5 h-5" />
          )}
        </Button>
        {/* End Call */}
        <Button
          onClick={onEndCall}
          disabled={endCallDisabled}
          className="bg-red-500 hover:bg-red-600 text-white rounded-full w-12 h-12 p-0 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 ml-2 disabled:opacity-50 disabled:hover:scale-100"
          title="End Call"
        >
          <StopCircle className="w-5 h-5" />
        </Button>
      </div>
    </div>
  </DockBase>
);

export default InCallDock;
