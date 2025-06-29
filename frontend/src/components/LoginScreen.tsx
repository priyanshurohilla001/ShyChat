import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { Chrome, Wifi, Shield } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useToken } from "@/hooks/useToken";
import { useEffect } from "react";

export default function LoginScreen() {
  const { login } = useToken();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (token) {
      window.history.replaceState({}, document.title, window.location.pathname);
      try {
        login(token);
      } catch (error) {
        console.error(error);
      }
    }
  }, [login]);

  const handleGoogleLogin = () => {
    console.log("Redirecting to secure authentication domain...");

    const currentUrl = window.location.origin + window.location.pathname;
    const secureLoginUrl = `https://peerspace.priyanshurohilla.workers.dev/?redirect_to=${encodeURIComponent(currentUrl)}`;

    window.location.href = secureLoginUrl;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <AnimatedBackground />

      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-2xl text-center space-y-12">
        <div className="space-y-8">
          <Logo className="mx-auto" />

          <h1 className="font-display text-7xl font-bold tracking-tight">
            PeerSpace
          </h1>

          <p className="text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Meet random people in your institute. No profiles, no history, just
            pure conversation.
          </p>
        </div>

        {/* Login Section */}
        <Card className="p-8 max-w-md mx-auto">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Shield className="w-4 h-4" />
              <span>Secure authentication via trusted domain</span>
            </div>

            <Button
              onClick={handleGoogleLogin}
              className="w-full h-14 text-lg"
              size="lg"
            >
              <Chrome className="w-5 h-5 mr-3" />
              Continue with College ID
            </Button>

            <div className="flex items-center gap-3 justify-center text-sm text-muted-foreground">
              <Wifi className="w-4 h-4" />
              <span>Peer-to-peer • Campus LAN only</span>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              You'll be redirected to a secure domain for authentication
            </p>
          </div>
        </Card>

        {/* Footer */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            "An Institute of National Importance" - connecting students when
            WiFi permits
          </p>
          <p>Anonymous • Ephemeral • Local</p>
        </div>
      </div>
    </div>
  );
}
