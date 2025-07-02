import { createContext, useCallback, useContext, useState } from "react";

type LottieReaction = {
  type: "lottie";
  name: string;
};

type VideoReaction = {
  type: "video";
  src: string;
};

type Reaction = LottieReaction | VideoReaction;

type ReactionContextType = {
  currentReaction: Reaction | null;
  playReaction: (reaction: Reaction) => void;
  isPlaying: boolean;
  onReactionEnd: () => void;
};

const ReactionContext = createContext<ReactionContextType | undefined>(
  undefined,
);

export const ReactionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [currentReaction, setCurrentReaction] = useState<Reaction | null>(null);

  const playReaction = useCallback(
    (reaction: Reaction) => {
      if (currentReaction) return;
      setCurrentReaction(reaction);
    },
    [currentReaction],
  );

  const isPlaying = !!currentReaction;

  const onReactionEnd = useCallback(() => {
    setCurrentReaction(null);
  }, []);

  return (
    <ReactionContext.Provider
      value={{ playReaction, isPlaying, onReactionEnd, currentReaction }}
    >
      {children}
    </ReactionContext.Provider>
  );
};

export function useReaction() {
  const context = useContext(ReactionContext);
  if (context === undefined) {
    throw new Error("useReaction must be used within a ReactionProvider");
  }
  return context;
}
