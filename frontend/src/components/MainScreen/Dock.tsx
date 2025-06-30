import React, { useEffect, useState } from "react";
import { useMediaPermissions } from "@/hooks/useMediaPermissions";
import { useSocket, type JoinPayload } from "@/hooks/useSocket";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useToken } from "@/hooks/useToken";
import { toast } from "sonner";
import InCallDock from "./Dock/InCallDock";
import CancelMatchmakingDock from "./Dock/CancelMatchmakingDock";
import StartMatchmakingDock from "./Dock/StartMatchmakingDock";

interface DockProps {
  setRemoteStream: (stream: MediaStream | null) => void;
}

type DockState =
  | "StartMatchmakingDock"
  | "CancelMatchmakingDock"
  | "InCallDock";

export const Dock: React.FC<DockProps> = ({ setRemoteStream }) => {
  // Media controls
  const {
    stream,
    isAudioMuted,
    isCameraOff,
    muteAudio,
    unmuteAudio,
    turnCameraOff,
    turnCameraOn,
  } = useMediaPermissions();

  // Socket controls
  const {
    emitStart,
    emitLeave,
    emitEndCall,
    onMatchFound,
    onOffer,
    onAnswer,
    onIceCandidate,
    emitOffer,
    emitAnswer,
    emitIce,
    emitJoin,
    onPeerLeft,
  } = useSocket();

  // WebRTC controls
  const {
    createOffer,
    createAnswer,
    addIceCandidate,
    setRemoteDescription,
    remoteStream: webrtcRemoteStream,
    closeConnection,
    setOnIceCandidate,
  } = useWebRTC();

  const { email } = useToken();

  const [peerId, setPeerId] = useState<string | null>(null);
  const [dockState, setDockState] = useState<DockState>("StartMatchmakingDock");

  // When we get peer id provide webrtchook handler
  useEffect(() => {
    if (!peerId) {
      return;
    }
    setOnIceCandidate((candidate) => {
      emitIce(peerId, candidate);
    });
  }, [peerId, setOnIceCandidate, emitIce]);

  // on Mount
  useEffect(() => {
    if (!email) {
      toast.error("No email? Can't guess your year out of thin air 🕵️‍♂️");
      return;
    }
    const year = getYearCodeFromEmail(email);
    if (!year) {
      toast.error("That email doesn't vibe with any batch here. Try again 🎓");
      return;
    }

    const payload: JoinPayload = {
      identity: {
        gender: "male",
        year,
      },
      preferences: {
        years: "any",
        gender: "any",
      },
    };

    emitJoin(payload, (res) => {
      if (!res.success) {
        toast.error(res.error || "Failed to join matchmaking.");
      }
    });

    return () => {
      emitLeave((res) => {
        if (!res.success) {
          toast.error(res.error || "Failed to leave matchmaking.");
        }
      });
    };
  }, []);

  // Start state
  // Buttons : Start
  const handleStart = () => {
    setDockState("CancelMatchmakingDock");

    emitStart((res) => {
      if (res.success) {
        if (res.data?.matchId) {
          toast.success(
            `Peer locked and loaded ⚡ (Match ID: ${res.data.matchId.slice(0, 6)}...)`,
          );
          setDockState("InCallDock");
        } else {
          toast.error("Matchmaking server is taking a nap 😴 (No match ID)");
        }
      } else {
        toast.error(res.error || "Campus WiFi having an existential crisis 💀");
      }
    });
  };

  // Searching for a match state
  // button to cancel matchmaking
  const handleCancel = () => {
    setDockState("StartMatchmakingDock");
    emitLeave((res) => {
      if (!res.success) {
        toast.error(res.error || "Failed to leave matchmaking.");
      }
    });
  };

  // in call
  // buttons : stop the call , mute audio , unmute audio , hide camera , show camera
  const handleStop = () => {
    setDockState("StartMatchmakingDock");
    emitEndCall();
    closeConnection();
    setPeerId(null);
    setRemoteStream(null);
    toast.success("Call ended.");
  };

  // mute audio , unmute audio , hide camera , show camera
  /*
  muteAudio,
  unmuteAudio,
  turnCameraOff,
  turnCameraOn,
  */

  // When match found, create and send offer (server designates caller)
  useEffect(() => {
    const unsub = onMatchFound(async ({ peerId: id }) => {
      setPeerId(id);

      try {
        const offer = await createOffer();
        emitOffer(id, offer);
      } catch (error) {
        console.error("[Dock] Failed to create/send offer:", error);
        toast.error("Failed to establish connection");
      }
    });
    return unsub;
  }, [onMatchFound, createOffer, emitOffer]);

  // When receiving offer, respond with answer
  useEffect(() => {
    const unsub = onOffer(async ({ from, offer }) => {
      setPeerId(from);

      try {
        await setRemoteDescription(offer);
        const answer = await createAnswer(offer);
        emitAnswer(from, answer);
        setDockState("InCallDock");
      } catch (error) {
        console.error("[Dock] Failed to handle offer:", error);
        toast.error("Failed to establish connection");
      }
    });
    return unsub;
  }, [onOffer, setRemoteDescription, createAnswer, emitAnswer]);

  // When receiving answer, set remote description
  useEffect(() => {
    const unsub = onAnswer(async ({ answer }) => {
      try {
        await setRemoteDescription(answer);
        setDockState("InCallDock");
      } catch (error) {
        console.error("[Dock] Failed to handle answer:", error);
        toast.error("Failed to establish connection");
      }
    });
    return unsub;
  }, [onAnswer, setRemoteDescription]);

  // ICE candidates
  useEffect(() => {
    const unsub = onIceCandidate(async ({ candidate }) => {
      try {
        await addIceCandidate(candidate);
      } catch (error) {
        console.error("[Dock] Failed to add ICE candidate:", error);
        // Don't show toast for ICE candidate errors as they're common
      }
    });
    return unsub;
  }, [onIceCandidate, addIceCandidate]);

  // Handle peer leaving
  useEffect(() => {
    const unsub = onPeerLeft(() => {
      setDockState("StartMatchmakingDock");
      closeConnection();
      setPeerId(null);
      setRemoteStream(null);
      toast.error(
        "Peer disappeared—probably realized attendance isn't mandatory here 🤷‍♂️",
      );
    });
    return unsub;
  }, [onPeerLeft, closeConnection, setRemoteStream]);

  // Update parent with new remote stream from WebRTC
  useEffect(() => {
    if (webrtcRemoteStream) {
      setRemoteStream(webrtcRemoteStream);
    }
  }, [webrtcRemoteStream, setRemoteStream]);

  const handleMuteToggle = () => (isAudioMuted ? unmuteAudio() : muteAudio());
  const handleVideoToggle = () =>
    isCameraOff ? turnCameraOn() : turnCameraOff();

  if (dockState == "InCallDock") {
    return (
      <InCallDock
        isAudioMuted={isAudioMuted}
        onMuteToggle={handleMuteToggle}
        isCameraOff={isCameraOff}
        onVideoToggle={handleVideoToggle}
        onEndCall={handleStop}
        audioDisabled={!stream}
        videoDisabled={!stream}
      />
    );
  }

  if (dockState == "CancelMatchmakingDock") {
    return (
      <CancelMatchmakingDock
        onCancel={handleCancel}
        searchText="Looking for your next conversation..."
      />
    );
  }

  return <StartMatchmakingDock onStart={handleStart} />;
};

export function getYearCodeFromEmail(email: string): 1 | 2 | 3 | 4 | undefined {
  const year = email.slice(0, 4);
  switch (year) {
    case "2025":
      return 1;
    case "2024":
      return 2;
    case "2023":
      return 3;
    case "2022":
      return 4;
    default:
      return undefined;
  }
}
