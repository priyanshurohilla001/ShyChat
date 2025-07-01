import clsx from "clsx";
import { useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";

interface VideoBoxProps {
  stream: MediaStream | null;
  mirrored?: boolean;
  muted?: boolean;
  className?: string;
  label?: string;
  children?: React.ReactNode;
}

export const VideoBox: React.FC<VideoBoxProps> = ({
  stream,
  mirrored = true,
  muted = true,
  className = "",
  children,
  label,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const hasEnabledTrack =
    stream && stream.getTracks && stream.getTracks().some((t) => t.enabled);

  if (!stream || !hasEnabledTrack) {
    return (
      <Card
        className={clsx(
          "flex items-center justify-center min-h-[300px] h-full bg-card/80 border-2 border-dashed border-muted-foreground/30",
          className,
        )}
      >
        {children}
      </Card>
    );
  }

  return (
    <Card
      className={clsx(
        "relative overflow-hidden min-h-[300px] h-full p-0 bg-black",
        className,
      )}
    >
      {label && (
        <div className="absolute top-3 left-3 z-10 bg-background/80 backdrop-blur-sm rounded px-2 py-0.5 text-xs font-semibold text-foreground">
          {label}
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={clsx(
          "absolute inset-0 w-full h-full object-cover rounded-xl",
          mirrored && "scale-x-[-1]",
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
    </Card>
  );
};

/*
import clsx from "clsx";
import { useRef, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface VideoBoxProps {
  stream: MediaStream | null;
  mirrored?: boolean;
  muted?: boolean;
  className?: string;
  label?: string;
  children?: React.ReactNode;
}

export const VideoBox: React.FC<VideoBoxProps> = ({
  stream,
  mirrored = true,
  muted = true,
  className = "",
  children,
  label,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // Memoize track info for tooltip
  const trackInfo = useMemo(() => {
    if (!stream) return null;
    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();
    return {
      video: {
        total: videoTracks.length,
        enabled: videoTracks.filter((t) => t.enabled).length,
        ids: videoTracks.map((t) => t.id),
      },
      audio: {
        total: audioTracks.length,
        enabled: audioTracks.filter((t) => t.enabled).length,
        ids: audioTracks.map((t) => t.id),
      },
    };
  }, [stream]);

  const hasEnabledTrack =
    stream && stream.getTracks && stream.getTracks().some((t) => t.enabled);

  if (!stream || !hasEnabledTrack) {
    return (
      <Card
        className={clsx(
          "flex items-center justify-center min-h-[300px] h-full bg-card/80 border-2 border-dashed border-muted-foreground/30",
          className,
        )}
      >
        {children}
      </Card>
    );
  }

  return (
    <Card
      className={clsx(
        "relative overflow-hidden min-h-[300px] h-full p-0 bg-black",
        className,
      )}
    >
      {label && (
        <div className="absolute top-3 left-3 z-10 bg-background/80 backdrop-blur-sm rounded px-2 py-0.5 text-xs font-semibold text-foreground">
          {label}
        </div>
      )}
      {/* Tooltip Icon *}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="absolute top-3 right-3 z-10 bg-background/80 rounded-full p-1 hover:bg-background/90 transition"
              tabIndex={0}
              aria-label="Show stream info"
              type="button"
            >
              <Info className="w-5 h-5 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs text-xs font-mono">
            {trackInfo ? (
              <div>
                <div>
                  <span className="font-bold">Video:</span>{" "}
                  {trackInfo.video.enabled}/{trackInfo.video.total} active
                </div>
                <div>
                  <span className="font-bold">Audio:</span>{" "}
                  {trackInfo.audio.enabled}/{trackInfo.audio.total} active
                </div>
                <div className="mt-1 text-muted-foreground">
                  <div>
                    <span className="font-bold">V:</span>{" "}
                    {trackInfo.video.ids.length
                      ? trackInfo.video.ids.join(", ")
                      : "—"}
                  </div>
                  <div>
                    <span className="font-bold">A:</span>{" "}
                    {trackInfo.audio.ids.length
                      ? trackInfo.audio.ids.join(", ")
                      : "—"}
                  </div>
                </div>
                <div className="mt-2 text-muted-foreground italic">
                  Debug mode: Counting tracks like a pro 🎧
                </div>
              </div>
            ) : (
              <span>No stream info available</span>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={clsx(
          "absolute inset-0 w-full h-full object-cover rounded-xl",
          mirrored && "scale-x-[-1]",
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
    </Card>
  );
};
*/
