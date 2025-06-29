import { useSocket } from "@/hooks/useSocket";
import { Logo } from "../ui/logo";
import Loader from "../ui/Loader";

export default function Header() {
  const { isLoading, status } = useSocket();

  console.log(status);
  return (
    <header className="relative z-10 flex items-center justify-between px-6 py-4 bg-transparent">
      <div className="font-display text-xl tracking-tight size-2">
        <Logo size="sm" />
      </div>
      <div className="text-sm text-muted-foreground">
        {isLoading ? (
          <span className="flex items-center gap-1">
            <Loader /> Connecting...
          </span>
        ) : status === "connected" ? (
          "🟢 Connected"
        ) : (
          "🔴 Disconnected"
        )}
      </div>
    </header>
  );
}
