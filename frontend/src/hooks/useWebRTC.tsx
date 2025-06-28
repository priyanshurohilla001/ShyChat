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
  onIceCandidate: (candidate: RTCIceCandidate) => void;
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
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export function WebRTCProvider({
  children,
  localStream,
  onIceCandidate,
}: {
  children: ReactNode;
} & UseWebRTCOptions) {
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!localStream) return;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnection.current = pc;

    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate);
      }
    };

    pc.ontrack = (event) => {
      const stream = new MediaStream();
      event.streams[0].getTracks().forEach((track) => {
        stream.addTrack(track);
      });
      setRemoteStream(stream);
    };

    return () => {
      pc.close();
    };
  }, [localStream, onIceCandidate]);

  const createOffer = useCallback(async () => {
    if (!peerConnection.current)
      throw new Error("Peer connection not initialized");

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    return offer;
  }, []);

  const createAnswer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (!peerConnection.current)
      throw new Error("Peer connection not initialized");

    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(offer),
    );
    const answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);

    return answer;
  }, []);

  const setRemoteDescription = useCallback(
    async (desc: RTCSessionDescriptionInit) => {
      if (!peerConnection.current)
        throw new Error("Peer connection not initialized");

      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription(desc),
      );
    },
    [],
  );

  const addIceCandidate = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      if (!peerConnection.current)
        throw new Error("Peer connection not initialized");

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
  }, []);

  const value = {
    createOffer,
    createAnswer,
    addIceCandidate,
    setRemoteDescription,
    remoteStream,
    closeConnection,
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
