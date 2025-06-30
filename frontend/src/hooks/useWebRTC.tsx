import {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react";
import type { ReactNode } from "react";

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

  const candidateHandler = useRef<
    ((candidate: RTCIceCandidate) => void) | null
  >(null);
  const candidateBuffer = useRef<RTCIceCandidate[]>([]);

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

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnection.current = pc;

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        if (candidateHandler.current) {
          candidateHandler.current(event.candidate);
        } else {
          candidateBuffer.current.push(event.candidate);
        }
      }
    };

    let remoteMediaStream = new MediaStream();
    setRemoteStream(remoteMediaStream);

    pc.ontrack = (event) => {
      // Create a new MediaStream with all existing tracks plus the new one
      const newRemoteStream = new MediaStream();

      // Add existing tracks
      remoteMediaStream.getTracks().forEach((track) => {
        newRemoteStream.addTrack(track);
      });

      // Add new tracks from the event
      event.streams[0].getTracks().forEach((track) => {
        if (!newRemoteStream.getTracks().find((t) => t.id === track.id)) {
          newRemoteStream.addTrack(track);
        }
      });

      // Update the stream reference and state
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

    return () => {
      pc.close();
    };
  }, [localStream]);

  const createOffer = useCallback(async () => {
    if (!peerConnection.current) {
      console.error(
        "[WebRTC] Cannot create offer: peer connection not initialized",
      );
      throw new Error("Peer connection not initialized");
    }

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    return offer;
  }, []);

  const createAnswer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (!peerConnection.current) {
      console.error(
        "[WebRTC] Cannot create answer: peer connection not initialized",
      );
      throw new Error("Peer connection not initialized");
    }

    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(offer),
    );

    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);

    return answer;
  }, []);

  const setRemoteDescription = useCallback(
    async (desc: RTCSessionDescriptionInit) => {
      if (!peerConnection.current) {
        console.error(
          "[WebRTC] Cannot set remote description: peer connection not initialized",
        );
        throw new Error("Peer connection not initialized");
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
          "[WebRTC] Cannot add ICE candidate: peer connection not initialized",
        );
        throw new Error("Peer connection not initialized");
      }

      await peerConnection.current.addIceCandidate(
        new RTCIceCandidate(candidate),
      );
    },
    [],
  );

  const closeConnection = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setRemoteStream(null);
    candidateHandler.current = null;
    candidateBuffer.current = [];
  }, []);

  const value = {
    createOffer,
    createAnswer,
    addIceCandidate,
    setRemoteDescription,
    remoteStream,
    closeConnection,
    setOnIceCandidate,
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
