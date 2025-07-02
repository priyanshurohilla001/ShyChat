import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  StopCircle,
  Smile,
  MessageSquare,
} from "lucide-react";
import DockBase from "./DockBase";
import { GifReactionSelector } from "@/components/Reactions/GifReactionSelector";
import { ChatDuringCall } from "@/components/ChatDuringCall";

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
}) => {
  const [showGifSelector, setShowGifSelector] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const handleGifToggle = useCallback(() => {
    setShowGifSelector((prev) => !prev);
  }, []);

  const handleChatToggle = useCallback(() => {
    setShowChat((prev) => !prev);
  }, []);

  const handleCloseGifSelector = useCallback(() => {
    setShowGifSelector(false);
  }, []);

  const handleCloseChat = useCallback(() => {
    setShowChat(false);
  }, []);

  return (
    <>
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
            {/* Chat Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleChatToggle}
              className={`rounded-full w-12 h-12 p-0 transition-all duration-200 hover:bg-muted border border-transparent ${
                showChat ? "bg-primary/10 text-primary border-primary/30" : ""
              }`}
              title="Open Chat"
            >
              <MessageSquare className="w-5 h-5" />
            </Button>
            {/* GIF Reaction Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGifToggle}
              className={`rounded-full w-12 h-12 p-0 transition-all duration-200 hover:bg-muted border border-transparent ${
                showGifSelector
                  ? "bg-primary/10 text-primary border-primary/30"
                  : ""
              }`}
              title="Send GIF Reaction"
            >
              <Smile className="w-5 h-5" />
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

      {/* Chat Component - Positioned to avoid overlap */}
      {showChat && (
        <div
          className={`fixed bottom-32 z-[60] ${showGifSelector ? "left-4" : "left-1/2 -translate-x-1/2"}`}
        >
          <ChatDuringCall setShowChat={handleCloseChat} />
        </div>
      )}

      {/* GIF Reaction Selector - Positioned to avoid overlap */}
      {showGifSelector && (
        <div
          className={`fixed bottom-32 z-[60] ${showChat ? "right-4" : "left-1/2 -translate-x-1/2"}`}
        >
          <GifReactionSelector setShowGifSelector={handleCloseGifSelector} />
        </div>
      )}

      {/* Backdrop for closing chat */}
      {showChat && (
        <div
          className="fixed inset-0 z-[55] bg-transparent"
          onClick={handleCloseChat}
        />
      )}

      {/* Backdrop for closing GIF selector */}
      {showGifSelector && (
        <div
          className="fixed inset-0 z-[55] bg-transparent"
          onClick={handleCloseGifSelector}
        />
      )}
    </>
  );
};

export default InCallDock;
