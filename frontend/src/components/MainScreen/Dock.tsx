import React, { useEffect, useState } from "react";
import { useMediaPermissions } from "@/hooks/useMediaPermissions";
import { useSocket, type JoinPayload } from "@/hooks/useSocket";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useToken } from "@/hooks/useToken";
import { toast } from "sonner";
import InCallDock from "./Dock/InCallDock";
import CancelMatchmakingDock from "./Dock/CancelMatchmakingDock";
import StartMatchmakingDock from "./Dock/StartMatchmakingDock";
import { useReaction } from "@/hooks/useReaction";

interface DockProps {
  setRemoteStream: (stream: MediaStream | null) => void;
}

type DockState =
  | "StartMatchmakingDock"
  | "CancelMatchmakingDock"
  | "InCallDock";

export const Dock: React.FC<DockProps> = ({ setRemoteStream }) => {
  // Media permissions and local stream controls
  const {
    stream,
    isAudioMuted,
    isCameraOff,
    muteAudio,
    unmuteAudio,
    turnCameraOff,
    turnCameraOn,
  } = useMediaPermissions();

  // Socket event handlers and emitters
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

  // WebRTC connection and signaling controls
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

  const { playReaction } = useReaction();

  // Set up ICE candidate handler when peerId is available
  useEffect(() => {
    if (!peerId) {
      return;
    }
    setOnIceCandidate((candidate) => {
      emitIce(peerId, candidate);
    });
  }, [peerId, setOnIceCandidate, emitIce]);

  // Join matchmaking on mount, leave on unmount
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

    //testing the reaction
    playReaction({
      type: "lottie",
      name: "welcome",
    });

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

  // Handle start matchmaking action
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
          toast.info("Now wait for getting picked...");
        }
      } else {
        toast.error(res.error || "Campus WiFi having an existential crisis 💀");
      }
    });
  };

  // Handle cancel matchmaking action
  const handleCancel = () => {
    setDockState("StartMatchmakingDock");
    emitLeave((res) => {
      if (!res.success) {
        toast.error(res.error || "Failed to leave matchmaking.");
      }
    });
  };

  // Handle end call action and cleanup
  const handleStop = () => {
    setDockState("StartMatchmakingDock");
    emitEndCall();
    closeConnection();
    setPeerId(null);
    setRemoteStream(null);
    toast.success("Call ended.");
  };

  // Audio and video toggle handlers

  // When a match is found, clean up, set peer, and create/send offer
  useEffect(() => {
    const unsub = onMatchFound(async ({ peerId: id }) => {
      closeConnection();
      setPeerId(id);

      try {
        const offer = await createOffer();
        emitOffer(id, offer);
      } catch (error) {
        console.error("[Dock] Failed to create/send offer:", error);
        toast.error("Failed to establish connection");
        // Always clean up on failure
        closeConnection();
        setPeerId(null);
        setDockState("StartMatchmakingDock");
      }
    });
    return unsub;
  }, [onMatchFound, createOffer, emitOffer, closeConnection]);

  // When receiving an offer, clean up, set peer, and respond with answer
  useEffect(() => {
    const unsub = onOffer(async ({ from, offer }) => {
      closeConnection();
      setPeerId(from);

      try {
        const answer = await createAnswer(offer);
        emitAnswer(from, answer);
        setDockState("InCallDock");
      } catch (error) {
        console.error("[Dock] Failed to handle offer:", error);
        toast.error("Failed to establish connection");
        // Always clean up on failure
        closeConnection();
        setPeerId(null);
        setDockState("StartMatchmakingDock");
      }
    });
    return unsub;
  }, [onOffer, createAnswer, emitAnswer, closeConnection]);

  // When receiving an answer, set remote description and update state
  useEffect(() => {
    const unsub = onAnswer(async ({ answer }) => {
      try {
        await setRemoteDescription(answer);
        setDockState("InCallDock");
      } catch (error) {
        console.error("[Dock] Failed to handle answer:", error);
        toast.error("Failed to establish connection");
        // Always clean up on failure
        closeConnection();
        setPeerId(null);
        setDockState("StartMatchmakingDock");
      }
    });
    return unsub;
  }, [onAnswer, setRemoteDescription, closeConnection]);

  // Handle incoming ICE candidates
  useEffect(() => {
    const unsub = onIceCandidate(async ({ candidate }) => {
      try {
        await addIceCandidate(candidate);
      } catch (error) {
        console.error("[Dock] Failed to add ICE candidate:", error);
        // ICE candidate errors are common, no user toast
      }
    });
    return unsub;
  }, [onIceCandidate, addIceCandidate]);

  // Handle peer leaving the call
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

  // Sync remote stream from WebRTC hook to parent
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
