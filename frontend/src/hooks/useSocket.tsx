import {
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
} from "react";
import type { ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

// --- Configuration ---
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8000";
const NOT_CONNECTED_ERROR = "Not connected to server";

// --- Type Definitions ---
export type Gender = "male" | "female";
export type Year = 1 | 2 | 3 | 4;

export interface Identity {
  gender: Gender;
  year: Year;
}

export type Preferences = {
  gender: Gender | "any";
  years: Year[] | "any";
};

export interface JoinPayload {
  identity: Identity;
  preferences: Preferences;
}

export type SocketAckResponse<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type Unsubscribe = () => void;

// --- Event Handler Types with specific WebRTC types ---
export type MatchFoundHandler = (data: { peerId: string }) => void;
export type OfferHandler = (data: {
  from: string;
  offer: RTCSessionDescriptionInit;
}) => void;
export type AnswerHandler = (data: {
  from: string;
  answer: RTCSessionDescriptionInit;
}) => void;
export type IceCandidateHandler = (data: {
  from: string;
  candidate: RTCIceCandidateInit;
}) => void;
export type PeerLeftHandler = () => void;

// --- Context Type ---
export interface SocketContextType {
  // State
  status: ConnectionStatus;
  socket: Socket | null;
  error: string | null;
  isLoading: boolean;

  // Connection Control
  connect: () => void;
  disconnect: () => void;

  // Emit Functions
  emitJoin: (
    payload: JoinPayload,
    callback?: (res: SocketAckResponse) => void,
  ) => void;
  emitStart: (
    callback?: (res: SocketAckResponse<{ matchId?: string }>) => void,
  ) => void;
  emitLeave: (callback?: (res: SocketAckResponse) => void) => void;
  emitEndCall: () => void;
  emitOffer: (to: string, offer: RTCSessionDescriptionInit) => void;
  emitAnswer: (to: string, answer: RTCSessionDescriptionInit) => void;
  emitIce: (to: string, candidate: RTCIceCandidateInit) => void;

  // Event Subscriptions
  onMatchFound: (handler: MatchFoundHandler) => Unsubscribe;
  onOffer: (handler: OfferHandler) => Unsubscribe;
  onAnswer: (handler: AnswerHandler) => Unsubscribe;
  onIceCandidate: (handler: IceCandidateHandler) => Unsubscribe;
  onPeerLeft: (handler: PeerLeftHandler) => Unsubscribe;
}

// --- Context ---
const SocketContext = createContext<SocketContextType | undefined>(undefined);

// --- Helper Function ---
function deriveStatus(
  socket: Socket | null,
  isLoading: boolean,
  error: string | null,
): ConnectionStatus {
  if (isLoading) return "connecting";
  if (error) return "error";
  if (socket && socket.connected) return "connected";
  return "disconnected";
}

// --- Provider Component ---
export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      autoConnect: false,
    });

    setSocket(newSocket);

    function onConnect() {
      setIsLoading(false);
      setError(null);
    }

    function onConnectError(error: Error) {
      setIsLoading(false);
      setError(error.message);
      toast.error(error.message);
    }

    function onDisconnect() {
      setIsLoading(false);
      setError(null);
    }

    newSocket.on("connect", onConnect);
    newSocket.on("connect_error", onConnectError);
    newSocket.on("disconnect", onDisconnect);

    return () => {
      newSocket.off("connect", onConnect);
      newSocket.off("connect_error", onConnectError);
      newSocket.off("disconnect", onDisconnect);
      newSocket.disconnect();
    };
  }, []);

  const connect = useCallback(() => {
    console.log("[SocketProvider] connect() called");
    console.log("[SocketProvider] Current socket instance:", socket);
    if (socket && !socket.connected) {
      setIsLoading(true);
      console.log(
        "[SocketProvider] Attempting to connect. Socket connected before connect():",
        socket.connected,
      );

      socket.connect();
      console.log(
        "[SocketProvider] connect() called. Socket connected after connect():",
        socket.connected,
      );
    }
  }, [socket]);

  const disconnect = useCallback(() => {
    if (socket && socket.connected) {
      socket.disconnect();
    }
  }, [socket]);

  const emitJoin = useCallback(
    (payload: JoinPayload, callback?: (res: SocketAckResponse) => void) => {
      if (!socket || !socket.connected) {
        callback?.({ success: false, error: NOT_CONNECTED_ERROR });
        return;
      }
      socket.emit("join", payload, callback);
    },
    [socket],
  );

  const emitStart = useCallback(
    (callback?: (res: SocketAckResponse<{ matchId?: string }>) => void) => {
      if (!socket || !socket.connected) {
        callback?.({ success: false, error: NOT_CONNECTED_ERROR });
        return;
      }
      socket.emit("start", undefined, callback);
    },
    [socket],
  );

  const emitLeave = useCallback(
    (callback?: (res: SocketAckResponse) => void) => {
      if (!socket || !socket.connected) {
        callback?.({ success: false, error: NOT_CONNECTED_ERROR });
        return;
      }
      socket.emit("leave", undefined, callback);
    },
    [socket],
  );

  const emitEndCall = useCallback(() => {
    if (!socket || !socket.connected) {
      return;
    }
    socket.emit("end-call");
  }, [socket]);

  const emitOffer = useCallback(
    (to: string, offer: RTCSessionDescriptionInit) => {
      if (!socket || !socket.connected) {
        return;
      }
      socket.emit("offer", { to, offer });
    },
    [socket],
  );

  const emitAnswer = useCallback(
    (to: string, answer: RTCSessionDescriptionInit) => {
      if (!socket || !socket.connected) {
        return;
      }
      socket.emit("answer", { to, answer });
    },
    [socket],
  );

  const emitIce = useCallback(
    (to: string, candidate: RTCIceCandidateInit) => {
      if (!socket || !socket.connected) {
        return;
      }
      socket.emit("ice-candidate", { to, candidate });
    },
    [socket],
  );

  const onMatchFound = useCallback(
    (handler: MatchFoundHandler): Unsubscribe => {
      if (!socket) return () => {};
      socket.on("match_found", handler);
      return () => socket.off("match_found", handler);
    },
    [socket],
  );

  const onOffer = useCallback(
    (handler: OfferHandler): Unsubscribe => {
      if (!socket) return () => {};
      socket.on("offer", handler);
      return () => socket.off("offer", handler);
    },
    [socket],
  );

  const onAnswer = useCallback(
    (handler: AnswerHandler): Unsubscribe => {
      if (!socket) return () => {};
      socket.on("answer", handler);
      return () => socket.off("answer", handler);
    },
    [socket],
  );

  const onIceCandidate = useCallback(
    (handler: IceCandidateHandler): Unsubscribe => {
      if (!socket) return () => {};
      socket.on("ice-candidate", handler);
      return () => socket.off("ice-candidate", handler);
    },
    [socket],
  );

  const onPeerLeft = useCallback(
    (handler: PeerLeftHandler): Unsubscribe => {
      if (!socket) return () => {};
      socket.on("peer_left", handler);
      return () => socket.off("peer_left", handler);
    },
    [socket],
  );

  const value: SocketContextType = {
    status: deriveStatus(socket, isLoading, error),
    socket,
    error,
    isLoading,
    connect,
    disconnect,
    emitJoin,
    emitStart,
    emitLeave,
    emitEndCall,
    emitOffer,
    emitAnswer,
    emitIce,
    onMatchFound,
    onOffer,
    onAnswer,
    onIceCandidate,
    onPeerLeft,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

// --- Custom Hook ---
export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
