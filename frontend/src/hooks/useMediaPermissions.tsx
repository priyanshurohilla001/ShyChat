import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

type PermissionStatus = "idle" | "granted" | "denied" | "prompt";

interface MediaPermissionsState {
  permission: PermissionStatus;
  stream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
  isAudioMuted: boolean;
  isCameraOff: boolean;
}

const initialState: MediaPermissionsState = {
  permission: "idle",
  stream: null,
  isLoading: false,
  error: null,
  isAudioMuted: false,
  isCameraOff: false,
};

interface MediaPermissionsContextType extends MediaPermissionsState {
  requestMediaAccess: () => Promise<void>;
  muteAudio: () => void;
  unmuteAudio: () => void;
  turnCameraOff: () => void;
  turnCameraOn: () => void;
}

const MediaPermissionsContext = createContext<
  MediaPermissionsContextType | undefined
>(undefined);

const determinePermissionState = (
  cameraState: PermissionState,
  micState: PermissionState,
): PermissionStatus => {
  if (cameraState === "denied" || micState === "denied") {
    return "denied";
  }
  if (cameraState === "granted" && micState === "granted") {
    return "granted";
  }
  return "prompt";
};

/**
 * A provider to manage media permissions (camera and microphone).
 * It checks, requests, and responds to permission states, providing a
 * media stream upon success. Also supports muting/unmuting audio and
 * turning camera on/off.
 */
export function MediaPermissionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] = useState<MediaPermissionsState>(initialState);

  useEffect(() => {
    if (state.permission === "idle") {
      async function checkPermission() {
        setState((prevState) => ({
          ...prevState,
          isLoading: true,
        }));

        try {
          const [cameraResult, micResult] = await Promise.all([
            navigator.permissions.query({ name: "camera" as PermissionName }),
            navigator.permissions.query({
              name: "microphone" as PermissionName,
            }),
          ]);

          const newPermissionState = determinePermissionState(
            cameraResult.state,
            micResult.state,
          );

          setState((prev) => ({
            ...prev,
            permission: newPermissionState,
            isLoading: false,
          }));
        } catch (error) {
          console.error("Error checking permissions:", error);
          setState((prev) => ({
            ...prev,
            permission: "prompt",
            isLoading: false,
          }));
        }
      }

      checkPermission();
    }
  }, []);

  useEffect(() => {
    if (state.permission === "denied") {
      toast.error("Permission denied. Change it in your settings");
    }

    return () => {
      if (state.stream) {
        state.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [state.permission, state.stream]);

  const requestMediaAccess = useCallback(async () => {
    if (state.permission === "denied") {
      toast.error("Permission denied. Change it in your settings");
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      setState((prev) => ({
        ...prev,
        stream,
        isAudioMuted: false,
        isCameraOff: false,
        isLoading: false,
        permission: "granted",
      }));
    } catch (err) {
      console.error("Media access error:", err);
      setState((prev) => ({
        ...prev,
        permission: "denied",
        isLoading: false,
        error: "Failed to access camera/microphone",
      }));
    }
  }, [state.permission]);

  const muteAudio = useCallback(() => {
    const audioTracks = state.stream?.getAudioTracks();
    if (audioTracks?.length) {
      audioTracks.forEach((track) => (track.enabled = false));
      setState((prev) => ({ ...prev, isAudioMuted: true }));
    }
  }, [state.stream]);

  const unmuteAudio = useCallback(() => {
    const audioTracks = state.stream?.getAudioTracks();
    if (audioTracks?.length) {
      audioTracks.forEach((track) => (track.enabled = true));
      setState((prev) => ({ ...prev, isAudioMuted: false }));
    }
  }, [state.stream]);

  const turnCameraOff = useCallback(() => {
    const videoTracks = state.stream?.getVideoTracks();
    if (videoTracks?.length) {
      videoTracks.forEach((track) => (track.enabled = false));
      setState((prev) => ({ ...prev, isCameraOff: true }));
    }
  }, [state.stream]);

  const turnCameraOn = useCallback(() => {
    const videoTracks = state.stream?.getVideoTracks();
    if (videoTracks?.length) {
      videoTracks.forEach((track) => (track.enabled = true));
      setState((prev) => ({ ...prev, isCameraOff: false }));
    }
  }, [state.stream]);

  const value = {
    ...state,
    requestMediaAccess,
    muteAudio,
    unmuteAudio,
    turnCameraOff,
    turnCameraOn,
  };

  return (
    <MediaPermissionsContext.Provider value={value}>
      {children}
    </MediaPermissionsContext.Provider>
  );
}

export function useMediaPermissions() {
  const context = useContext(MediaPermissionsContext);
  if (context === undefined) {
    throw new Error(
      "useMediaPermissions must be used within a MediaPermissionsProvider",
    );
  }
  return context;
}
