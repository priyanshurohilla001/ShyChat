import React, { useEffect, useState } from "react";
import { useMediaPermissions } from "@/hooks/useMediaPermissions";
import { WebRTCProvider } from "@/hooks/useWebRTC";
import { AnimatedBackground } from "./ui/animated-background";
import Header from "./MainScreen/Header";
import { VideoBox } from "./ui/VideoBox";
import { Dock } from "./MainScreen/Dock";
import { useSocket } from "@/hooks/useSocket";

const BaseSocketVideo: React.FC = () => {
  const { stream } = useMediaPermissions();
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const { connect, disconnect, socket } = useSocket();

  useEffect(() => {
    if (socket && !socket.connected) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [socket, connect, disconnect]);

  return (
    <div className="relative min-h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <AnimatedBackground />
      <Header />

      <main className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 px-6 pb-6 pt-4">
        <VideoBox stream={stream} label="You">
          <div className="text-muted-foreground">Waiting for camera...</div>
        </VideoBox>
        <VideoBox stream={remoteStream} label="Peer" mirrored={false}>
          <div className="text-center text-muted-foreground">
            <p className="font-semibold">Waiting for peer...</p>
            <p className="text-xs">No video stream yet</p>
          </div>
        </VideoBox>
      </main>
      {socket && socket.connected && (
        <WebRTCProvider localStream={stream}>
          <Dock setRemoteStream={setRemoteStream} />
        </WebRTCProvider>
      )}
    </div>
  );
};

export default BaseSocketVideo;
