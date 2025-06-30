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
