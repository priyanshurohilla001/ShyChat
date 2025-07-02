import {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react";
import type { ReactNode } from "react";
import { useReaction } from "./useReaction";

const ICE_SERVERS = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

interface UseWebRTCOptions {
  localStream: MediaStream | null;
}

interface WebRTCContextType {
  createOffer: () => Promise<RTCSessionDescriptionInit>;
  createAnswer: (
    offer: RTCSessionDescriptionInit,
  ) => Promise<RTCSessionDescriptionInit>;
  addIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  setRemoteDescription: (desc: RTCSessionDescriptionInit) => Promise<void>;
  remoteStream: MediaStream | null;
  closeConnection: () => void;
  setOnIceCandidate: (handler: (candidate: RTCIceCandidate) => void) => void;
  sendReaction: (reaction: {
    type: string;
    name: string;
    src?: string;
  }) => void;
  sendTextMessage: (text: string) => void;
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export function WebRTCProvider({
  children,
  localStream,
}: {
  children: ReactNode;
} & UseWebRTCOptions) {
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const { playReaction } = useReaction();

  const candidateHandler = useRef<
    ((candidate: RTCIceCandidate) => void) | null
  >(null);

  const candidateBuffer = useRef<RTCIceCandidate[]>([]);

  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  const setOnIceCandidate = useCallback(
    (handler: (candidate: RTCIceCandidate) => void) => {
      candidateHandler.current = handler;
      // Flush buffer
      candidateBuffer.current.forEach(handler);
      candidateBuffer.current = [];
    },
    [],
  );

  useEffect(() => {
    if (!localStream) {
      return;
    }

    initPeerConnection(localStream);

    return () => {
      closeConnection();
    };
  }, [localStream]);

  const closeConnection = useCallback(() => {
    if (peerConnection.current) {
      // Remove all event listeners
      peerConnection.current.onicecandidate = null;
      peerConnection.current.ontrack = null;
      peerConnection.current.onconnectionstatechange = null;
      peerConnection.current.oniceconnectionstatechange = null;

      // Close the connection
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setRemoteStream(null);
    candidateHandler.current = null;
    candidateBuffer.current = [];
  }, []);

  const initPeerConnection = useCallback(
    (localStream: MediaStream) => {
      // Clean up any existing connection first
      closeConnection();
      console.log("[WebRTC] Initializing new peer connection...");

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnection.current = pc;

      // Add local tracks
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // ICE candidate handler
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          if (candidateHandler.current) {
            candidateHandler.current(event.candidate);
          } else {
            candidateBuffer.current.push(event.candidate);
          }
        }
      };

      // Remote stream setup
      let remoteMediaStream = new MediaStream();
      setRemoteStream(remoteMediaStream);

      pc.ontrack = (event) => {
        const newRemoteStream = new MediaStream();
        remoteMediaStream.getTracks().forEach((track) => {
          newRemoteStream.addTrack(track);
        });
        event.streams[0].getTracks().forEach((track) => {
          if (!newRemoteStream.getTracks().find((t) => t.id === track.id)) {
            newRemoteStream.addTrack(track);
          }
        });
        remoteMediaStream = newRemoteStream;
        setRemoteStream(newRemoteStream);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          console.error("[WebRTC] Peer connection failed!");
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed") {
          console.error("[WebRTC] ICE connection failed!");
        }
      };
    },
    [closeConnection],
  );

  const setupDataChannel = (channel: RTCDataChannel) => {
    channel.onopen = () => console.log("[WebRTC] DataChannel open ✅");
    channel.onerror = (e) => console.error("[WebRTC] DataChannel error", e);
    channel.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        // Handle different message types
        if (data.type === "reaction" || data.type === "video") {
          playReaction(data);
        } else if (data.type === "text") {
          const event = new CustomEvent("webrtc-text-message", {
            detail: data.text,
          });
          window.dispatchEvent(event);
        }
      } catch (err) {
        console.warn("Invalid message payload", err);
      }
    };
  };

  const createOffer = useCallback(async () => {
    // Ensure peerConnection is initialized
    if (!peerConnection.current && localStream) {
      console.log("[WebRTC] Creating offer: initializing peer connection...");
      initPeerConnection(localStream);
    }

    // After initialization, check again
    if (!peerConnection.current) {
      throw new Error(
        "[WebRTC] Cannot create offer: peer connection is not set up.",
      );
    }

    // Create data channel right after initializing the connection
    const dataChannel = peerConnection.current.createDataChannel("reactions", {
      ordered: true,
    });
    setupDataChannel(dataChannel);
    dataChannelRef.current = dataChannel;

    peerConnection.current.ondatachannel = (event) => {
      const channel = event.channel;
      setupDataChannel(channel);
      dataChannelRef.current = channel;
    };

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    return offer;
  }, [peerConnection, localStream, initPeerConnection]);

  const createAnswer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      // Ensure peerConnection is initialized
      if (!peerConnection.current && localStream) {
        console.log(
          "[WebRTC] Creating answer: initializing peer connection...",
        );
        initPeerConnection(localStream);
      }

      // After initialization, check again
      if (!peerConnection.current) {
        throw new Error(
          "[WebRTC] Cannot create answer: peer connection is not set up.",
        );
      }

      peerConnection.current.ondatachannel = (event) => {
        const channel = event.channel;
        setupDataChannel(channel);
        dataChannelRef.current = channel;
      };

      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(offer),
      );

      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      return answer;
    },
    [peerConnection, localStream, initPeerConnection],
  );

  const setRemoteDescription = useCallback(
    async (desc: RTCSessionDescriptionInit) => {
      if (!peerConnection.current) {
        console.error(
          "[WebRTC] Cannot set remote description: peer connection instance is not set up (global peerConnection is null)",
        );
        throw new Error("Peer connection instance is not set up");
      }

      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(desc),
      );
    },
    [],
  );

  const addIceCandidate = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      if (!peerConnection.current) {
        console.error(
          "[WebRTC] Cannot add ICE candidate: peer connection instance is not set up (global peerConnection is null)",
        );
        throw new Error("Peer connection instance is not set up");
      }

      await peerConnection.current.addIceCandidate(
        new RTCIceCandidate(candidate),
      );
    },
    [],
  );

  const sendReaction = (reaction: {
    type: string;
    name: string;
    src?: string;
  }) => {
    if (
      !dataChannelRef.current ||
      dataChannelRef.current.readyState !== "open"
    ) {
      console.warn("[WebRTC] DataChannel not ready");
      return;
    }
    dataChannelRef.current.send(JSON.stringify(reaction));
  };

  const sendTextMessage = (text: string) => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== "open")
      return;
    dataChannelRef.current.send(JSON.stringify({ type: "text", text }));
  };

  const value = {
    createOffer,
    createAnswer,
    addIceCandidate,
    setRemoteDescription,
    remoteStream,
    closeConnection,
    setOnIceCandidate,
    sendReaction,
    sendTextMessage,
  };

  return (
    <WebRTCContext.Provider value={value}>{children}</WebRTCContext.Provider>
  );
}

export function useWebRTC() {
  const context = useContext(WebRTCContext);
  if (context === undefined) {
    throw new Error("useWebRTC must be used within a WebRTCProvider");
  }
  return context;
}
