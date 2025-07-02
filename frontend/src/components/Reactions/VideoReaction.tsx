import { useReaction } from "@/hooks/useReaction";

export const VideoReaction = ({ src }: { src: string }) => {
  const { onReactionEnd } = useReaction();

  return (
    <img
      className="w-48 h-48"
      src={src}
      alt="Reaction GIF"
      onLoad={() => {
        setTimeout(() => {
          onReactionEnd();
        }, 2000);
      }}
    />
  );
};
