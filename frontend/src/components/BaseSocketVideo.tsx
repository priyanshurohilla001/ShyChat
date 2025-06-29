import React, { useEffect, useRef } from "react";
import { useSocket } from "@/hooks/useSocket";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, SkipForward, Loader2 } from "lucide-react";
import { useMediaPermissions } from "@/hooks/useMediaPermissions";
import { AnimatedBackground } from "./ui/animated-background";
import Header from "./MainScreen/Header";

const BaseSocketVideo: React.FC = () => {
  const { stream, isAudioMuted, muteAudio } = useMediaPermissions();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <AnimatedBackground />

      {/* 🔗 Header */}
      <Header />

      {/* 📹 Main Section */}
      <main className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 px-6 py-8 h-[calc(100vh-4rem)]">
        {/* 🎥 Local Video Stream */}
        <div className="flex items-center justify-center border border-border rounded-xl p-2 backdrop-blur bg-card/50">
          {stream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="rounded-lg w-full h-auto max-w-[500px]"
            />
          ) : (
            <div className="text-muted-foreground">Waiting for camera...</div>
          )}
        </div>

        {/* 📡 Server Status Info */}
        <div className="flex items-center justify-center border border-border rounded-xl p-6 backdrop-blur bg-card/50">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-display">Looking for a match...</h2>
            <p className="text-muted-foreground text-sm">
              This may take a few seconds.
            </p>
            <div className="mt-4 animate-pulse">
              <Loader2 className="mx-auto w-6 h-6" />
            </div>
          </div>
        </div>
      </main>

      {/* 🧭 Dock Controls */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex gap-4 bg-background/80 border border-border shadow-lg rounded-full px-6 py-3 backdrop-blur">
        <Button variant="ghost" onClick={muteAudio}>
          {isAudioMuted ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>
        <Button variant="destructive">
          <SkipForward className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default BaseSocketVideo;

/*



Background : animated background we created
Header : Transparent {
left side : logo
right side : status (connecting connected disconnected )


main section : {
two divs with little padding covering screen and page cant be scrolled using this animated background elegantly
its looks like two video streams one in left ( local ) right one will be little different
right one will show server updates example connecting to server looking for match do this do that

in bottom like a mac dock .. is the main part ( max z)
shows buttons to start the process
mute unmute or even emojis support ( later) or skip the call . everything
}



}

*/
