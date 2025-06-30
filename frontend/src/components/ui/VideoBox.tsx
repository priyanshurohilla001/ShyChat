import clsx from "clsx";
import { useRef, useEffect } from "react";

interface VideoBoxProps {
  stream: MediaStream | null;
  mirrored?: boolean;
  muted?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const VideoBox: React.FC<VideoBoxProps> = ({
  stream,
  mirrored = true,
  muted = true,
  className = "",
  children,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={clsx(
        "flex items-center justify-center border border-border rounded-xl p-1 backdrop-blur bg-card/50 h-full min-h-[300px]",
        className,
      )}
    >
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={clsx(
            "rounded-xl w-full h-full object-cover",
            mirrored && "scale-x-[-1]",
          )}
        />
      ) : (
        children
      )}
    </div>
  );
};
