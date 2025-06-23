import React, { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Sun, Moon, Phone, UserPlus, VideoOff } from "lucide-react";
import "@/index.css";

// ─────────────────────────────────────────────────────────────────────────────
// │                                    TYPES                                    │
// ─────────────────────────────────────────────────────────────────────────────

type Gender = "male" | "female";
type Year = 1 | 2 | 3 | 4;

interface Identity {
  gender: Gender;
  year: Year;
}

type Preferences = {
  gender: Gender | "any";
  years: Year[] | "any";
};

interface JoinPayload {
  identity: Identity;
  preferences: Preferences;
}

type SocketAckResponse<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

interface ServerToClientEvents {
  match_found: (data: { peerId: string }) => void;
  offer: (data: { from: string; offer: RTCSessionDescriptionInit }) => void;
  answer: (data: { from: string; answer: RTCSessionDescriptionInit }) => void;
  "ice-candidate": (data: {
    from: string;
    candidate: RTCIceCandidateInit;
  }) => void;
  peer_left: () => void;
}

interface ClientToServerEvents {
  join: (
    payload: JoinPayload,
    callback: (res: SocketAckResponse) => void,
  ) => void;
  start: (
    callback: (res: SocketAckResponse<{ matchId?: string }>) => void,
  ) => void;
  leave: (callback: (res: SocketAckResponse) => void) => void;
  "end-call": () => void;
  offer: (data: { to: string; offer: RTCSessionDescriptionInit }) => void;
  answer: (data: { to: string; answer: RTCSessionDescriptionInit }) => void;
  "ice-candidate": (data: {
    to: string;
    candidate: RTCIceCandidateInit;
  }) => void;
}

type AppState = "SETUP" | "IDLE" | "SEARCHING" | "IN_CALL";
type SharingType = "camera" | "screen";

// ─────────────────────────────────────────────────────────────────────────────
// │                                  COMPONENT                                  │
// ─────────────────────────────────────────────────────────────────────────────

const SIGNALING_SERVER = "http://localhost:8000";
const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

export default function App() {
  // Core application state
  const [appState, setAppState] = useState<AppState>("SETUP");
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  // User-configurable state for the setup form
  const [identity, setIdentity] = useState<Identity>({
    gender: "male",
    year: 1,
  });
  const [preferences, setPreferences] = useState<Preferences>({
    gender: "any",
    years: "any",
  });
  const [sharingType, setSharingType] = useState<SharingType>("camera");

  // Refs for stable objects that don't trigger re-renders
  const socketRef = useRef<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerIdRef = useRef<string | null>(null);

  // Ref to access latest state from within socket listeners, preventing stale closures
  const stateRef = useRef({ appState, sharingType });
  stateRef.current = { appState, sharingType };

  // Refs for DOM elements
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Toggle dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Centralized cleanup function
  const cleanupCall = useCallback(() => {
    console.log("Cleaning up call resources...");
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    peerIdRef.current = null;
  }, []);

  // Function to acquire the local media stream (camera or screen)
  const startLocalMedia = useCallback(async (type: SharingType) => {
    if (localStreamRef.current) return localStreamRef.current; // Prevent re-acquiring stream
    try {
      const stream =
        type === "screen"
          ? await navigator.mediaDevices.getDisplayMedia({ video: true })
          : await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Failed to get local media:", err);
      setError(`Could not access ${type}. Please grant permission.`);
      setAppState("IDLE");
      return null;
    }
  }, []);

  // Function to create and configure the RTCPeerConnection
  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) return peerConnectionRef.current; // Prevent re-creating

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerConnectionRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && peerIdRef.current) {
        socketRef.current.emit("ice-candidate", {
          to: peerIdRef.current,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
        }
      }
      remoteStreamRef.current.addTrack(event.track);
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected" ||
        pc.connectionState === "closed"
      ) {
        setError("Connection with peer lost.");
        cleanupCall();
        setAppState("IDLE");
      }
    };

    return pc;
  }, [cleanupCall]);

  // Main socket connection and event handling effect - RUNS ONLY ONCE
  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> =
      io(SIGNALING_SERVER);
    socketRef.current = socket;

    const handleOffer = async ({
      from,
      offer,
    }: {
      from: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      console.log(`Offer received from: ${from}`);
      peerIdRef.current = from;

      const stream = await startLocalMedia(stateRef.current.sharingType);
      if (!stream) return;

      setAppState("IN_CALL");
      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", { to: from, answer });
    };

    const handleMatchFound = async ({ peerId }: { peerId: string }) => {
      // This is the tie-breaker. The client with the smaller ID initiates the call.
      if (socket.id > peerId) {
        console.log(
          `Tie-break: My ID (${socket.id}) is greater than peer's (${peerId}). I will wait for their offer.`,
        );
        return;
      }

      if (stateRef.current.appState !== "SEARCHING") return;
      console.log(`Match found with: ${peerId}. I will initiate the call.`);
      peerIdRef.current = peerId;

      const stream = await startLocalMedia(stateRef.current.sharingType);
      if (!stream) return;

      setAppState("IN_CALL");
      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("offer", { to: peerId, offer });
    };

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => {
      setSocketConnected(false);
      cleanupCall();
      setAppState("SETUP");
      setError("Disconnected from server.");
    });
    socket.on("match_found", handleMatchFound);
    socket.on("offer", handleOffer);
    socket.on("answer", ({ answer }) =>
      peerConnectionRef.current?.setRemoteDescription(
        new RTCSessionDescription(answer),
      ),
    );
    socket.on("ice-candidate", ({ candidate }) =>
      peerConnectionRef.current?.addIceCandidate(
        new RTCIceCandidate(candidate),
      ),
    );
    socket.on("peer_left", () => {
      setError("Your peer has left the call.");
      cleanupCall();
      setAppState("IDLE");
    });

    return () => {
      socket.disconnect();
      cleanupCall();
    };
  }, [cleanupCall, createPeerConnection, startLocalMedia]);

  // --- UI Event Handlers ---
  const handleJoin = () => {
    socketRef.current?.emit("join", { identity, preferences }, (res) => {
      if (res.success) setAppState("IDLE");
      else setError(res.error || "Failed to join.");
    });
  };

  const handleStartSearch = () => {
    setAppState("SEARCHING");
    socketRef.current?.emit("start", (res) => {
      if (!res.success) {
        setError(res.error || "Failed to start search.");
        setAppState("IDLE");
      }
    });
  };

  const handleCancelSearch = () => {
    socketRef.current?.emit("leave", () => setAppState("IDLE"));
  };

  const handleHangUp = () => {
    socketRef.current?.emit("end-call");
    cleanupCall();
    setAppState("IDLE");
  };

  // --- Render Logic ---
  const renderContent = () => {
    switch (appState) {
      case "SETUP":
        return (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-6 max-w-md mx-auto">
            <h2 className="text-xl font-bold">Your Profile</h2>
            <div>
              <label className="block text-sm mb-1">I want to share my:</label>
              <div className="flex space-x-2">
                <Button
                  variant={sharingType === "camera" ? "default" : "outline"}
                  onClick={() => setSharingType("camera")}
                >
                  Camera
                </Button>
                <Button
                  variant={sharingType === "screen" ? "default" : "outline"}
                  onClick={() => setSharingType("screen")}
                >
                  Screen
                </Button>
              </div>
            </div>
            {/* NOTE: Identity and Preferences forms can be added here */}
            <Button
              size="lg"
              onClick={handleJoin}
              className="w-full"
              disabled={!socketConnected}
            >
              <UserPlus className="w-5 h-5 mr-2" /> Join
            </Button>
          </div>
        );
      case "IDLE":
        return (
          <div className="text-center">
            <Button size="lg" onClick={handleStartSearch}>
              <Phone className="w-5 h-5 mr-2" /> Start Search
            </Button>
          </div>
        );
      case "SEARCHING":
        return (
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
            <p className="text-lg font-medium">Searching for a match...</p>
            <Button
              variant="secondary"
              onClick={handleCancelSearch}
              className="mt-4"
            >
              Cancel
            </Button>
          </div>
        );
      case "IN_CALL":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full bg-black aspect-video rounded-lg ${
                    sharingType === "camera" ? "transform -scale-x-100" : ""
                  }`}
                />
                <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                  You
                </div>
              </div>
              <div className="relative">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full bg-black aspect-video rounded-lg"
                />
                <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                  Peer
                </div>
              </div>
            </div>
            <div className="text-center">
              <Button variant="destructive" size="lg" onClick={handleHangUp}>
                <VideoOff className="w-5 h-5 mr-2" /> Hang Up
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">LocalVC</h1>
        <div className="flex items-center space-x-2">
          <span
            className={`text-sm ${socketConnected ? "text-green-500" : "text-red-500"}`}
          >
            {socketConnected ? "Connected" : "Disconnected"}
          </span>
          <Sun className="w-5 h-5" />
          <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          <Moon className="w-5 h-5" />
        </div>
      </header>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <main>{renderContent()}</main>
    </div>
  );
}
