import Lottie from "lottie-react";
import heart from "@/assets/reactions/heart.json";
import welcome from "@/assets/reactions/welcome.json";
import { useReaction } from "@/hooks/useReaction";

const animations: Record<string, object> = {
  heart,
  welcome,
};

export const LottiePlayer = ({ name }: { name: string }) => {
  const { onReactionEnd } = useReaction();

  if (animations[name]) {
    return (
      <div className="w-48 h-48">
        <Lottie
          animationData={animations[name]}
          loop={false}
          onComplete={onReactionEnd}
        />
      </div>
    );
  } else {
    console.error(`Lottie animation "${name}" not found in animations map.`);
    return null;
  }
};
