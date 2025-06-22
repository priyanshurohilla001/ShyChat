// ─── Shared Types ──────────────────────────────────────────

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

// ─── Payloads ─────────────────────────────────────────────

export interface JoinPayload {
  identity: Identity;
  preferences: Preferences;
}

// ─── Acknowledgement Envelope ────────────────────────────

export type SocketAckResponse<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// ─── Client → Server Events ──────────────────────────────

export interface ClientToServerEvents {
  /** User joins with identity & preferences */
  join: (
    payload: JoinPayload,
    callback: (res: SocketAckResponse) => void,
  ) => void;

  /** User starts matchmaking */
  start: (
    callback: SocketAckResponse<{ matchId?: string }> extends infer R
      ? (res: R) => void
      : never,
  ) => void;

  /** User cancels matchmaking */
  leave: (callback: (res: SocketAckResponse) => void) => void;

  /** Optional: user manually ends a call */
  "end-call": () => void;

  /** WebRTC signaling */
  offer: (data: { to: string; offer: any }) => void;
  answer: (data: { to: string; answer: any }) => void;
  "ice-candidate": (data: { to: string; candidate: any }) => void;
}

// ─── Server → Client Events ──────────────────────────────

// src/event.ts

// ─── Shared Types ──────────────────────────────────────────

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

// ─── Payloads ─────────────────────────────────────────────

export interface JoinPayload {
  identity: Identity;
  preferences: Preferences;
}

// ─── Acknowledgement Envelope ────────────────────────────

export type SocketAckResponse<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

// ─── Client → Server Events ──────────────────────────────

export interface ClientToServerEvents {
  /** User joins with identity & preferences */
  join: (
    payload: JoinPayload,
    callback: (res: SocketAckResponse) => void,
  ) => void;

  /** User starts matchmaking */
  start: (
    callback: SocketAckResponse<{ matchId?: string }> extends infer R
      ? (res: R) => void
      : never,
  ) => void;

  /** User cancels matchmaking */
  leave: (callback: (res: SocketAckResponse) => void) => void;

  /** Optional: user manually ends a call */
  "end-call": () => void;

  /** WebRTC signaling */
  offer: (data: { to: string; offer: any }) => void;
  answer: (data: { to: string; answer: any }) => void;
  "ice-candidate": (data: { to: string; candidate: any }) => void;
}

// ─── Server → Client Events ──────────────────────────────

export interface ServerToClientEvents {
  /** A match was found */
  match_found: (data: { peerId: string }) => void;

  /** Relay WebRTC signaling */
  offer: (data: { from: string; offer: any }) => void;
  answer: (data: { from: string; answer: any }) => void;
  "ice-candidate": (data: { from: string; candidate: any }) => void;

  /** One peer left the call */
  peer_left: () => void;
}
