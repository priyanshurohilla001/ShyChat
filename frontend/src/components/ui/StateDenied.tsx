import { ShieldOff } from "lucide-react";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { Logo } from "@/components/ui/logo";

export default function StateDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-6 py-12">
      <AnimatedBackground />

      <div className="relative z-10 w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div className="flex flex-col items-center text-center md:text-left md:items-start space-y-4">
          <ShieldOff className="w-14 h-14 text-destructive mb-1" />

          <h1 className="font-display text-3xl font-semibold text-destructive tracking-tight">
            Permissions Blocked
          </h1>

          <p className="text-muted-foreground text-base leading-relaxed">
            To connect with others on{" "}
            <span className="font-medium text-primary">PeerSpace</span>, we need
            access to your camera and microphone.
          </p>

          <div className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-semibold text-primary">How to fix it:</span>
            <br />
            Tap the lock icon{" "}
            <span role="img" aria-label="lock">
              🔒
            </span>{" "}
            in your browser’s address bar → Enable camera & mic → Refresh the
            page.
          </div>

          <div className="text-xs text-muted-foreground italic pt-2">
            Campus WiFi might ghost you, but we won’t. 👻
          </div>
        </div>

        <div className="flex flex-col items-center justify-center">
          <Logo size="md" className="opacity-90 mb-2" />
          <div className="text-xs text-muted-foreground text-center opacity-60 leading-tight">
            Anonymous · Ephemeral · Local
            <br />
            No profiles. No history. Just real conversation.
          </div>
        </div>
      </div>
    </div>
  );
}
