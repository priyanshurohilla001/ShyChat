import { useMediaPermissions } from "@/hooks/useMediaPermissions";
import { useEffect } from "react";
import StateDenied from "./ui/StateDenied";
import Loader from "./ui/Loader";
import { SocketProvider } from "@/hooks/useSocket";
import BaseSocketVideo from "./BaseSocketVideo";

export default function PreCallScreen() {
  const { requestMediaAccess, isLoading, permission, stream } =
    useMediaPermissions();

  useEffect(() => {
    if (permission != "denied" && !stream) {
      requestMediaAccess();
    }
  }, [permission, stream, requestMediaAccess]);

  if (
    isLoading ||
    permission === "idle" ||
    (permission === "granted" && !stream)
  ) {
    return <FullLoader />;
  }

  if (permission === "denied") {
    return <StateDenied />;
  }

  if (stream) {
    return (
      <SocketProvider>
        <BaseSocketVideo />
      </SocketProvider>
    );
  }

  return null;
}

function FullLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader />
    </div>
  );
}
