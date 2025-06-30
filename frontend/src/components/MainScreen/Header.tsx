import { useSocket } from "@/hooks/useSocket";
import { Logo } from "../ui/logo";
import { Badge } from "@/components/ui/badge";
import clsx from "clsx";

export default function Header() {
  const { isLoading, status } = useSocket();
  const currentStatus = isLoading
    ? "connecting"
    : status === "connected"
      ? "connected"
      : status === "connecting"
        ? "connecting"
        : "disconnected";

  return (
    <header className="relative z-10 flex items-center justify-between px-6 py-5 bg-transparent">
      <div className="font-display text-xl tracking-tight">
        <Logo size="sm" />
      </div>
      <Badge
        variant="outline"
        className="bg-background/80 border-muted-foreground/20 text-muted-foreground font-medium px-3 py-1 flex items-center gap-2 shadow-none"
      >
        <StatusDot status={currentStatus} />
        {getStatusText(currentStatus)}
      </Badge>
    </header>
  );
}

function StatusDot({
  status,
}: {
  status: "connecting" | "connected" | "disconnected";
}) {
  return (
    <span
      className={clsx(
        "inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle",
        status === "connected" && "bg-green-500",
        status === "disconnected" && "bg-red-500",
        status === "connecting" && "bg-yellow-400 animate-pulse",
      )}
    />
  );
}

function getStatusText(status: string) {
  if (status === "connected") return "Connected ⚡";
  if (status === "connecting") return "Connecting to campus LAN…";
  return "WiFi needs therapy 📡";
}
