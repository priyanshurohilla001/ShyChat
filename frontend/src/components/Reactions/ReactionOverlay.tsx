import { LottiePlayer } from "./LottiePlayer";
import { VideoReaction } from "./VideoReaction";
import { useReaction } from "@/hooks/useReaction";

export const ReactionOverlay = () => {
  const { currentReaction } = useReaction();

  if (!currentReaction) return null;

  return (
    <div className="absolute inset-0 flex items-center mt-[10%] justify-center z-50 pointer-events-none">
      {currentReaction.type === "lottie" ? (
        <LottiePlayer name={currentReaction.name} />
      ) : currentReaction.type === "video" ? (
        <VideoReaction src={currentReaction.src} />
      ) : null}
    </div>
  );
};
