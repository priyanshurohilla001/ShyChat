import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  JoinPayload,
  SocketAckResponse,
  Year,
} from "./event";
import userService from "../services/userService";
import matchService from "../services/matchService";
import { JoinPayloadSchema } from "./schemas";

export function setupSocket(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
) {
  io.on(
    "connection",
    (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
      const userId = socket.id;
      console.log(`Client connected: ${userId}`);

      // ─── JOIN ─────────────────────────
      socket.on("join", (payload, callback) => {
        const parsedResult = JoinPayloadSchema.safeParse(payload);

        if (!parsedResult.success) {
          console.error("Zod validation failed:", parsedResult.error.errors);
          return callback({
            success: false,
            error: "Invalid payload: " + parsedResult.error.message,
          });
        }

        const join: JoinPayload = parsedResult.data;

        const res = userService.addUser(
          userId,
          join.identity,
          join.preferences,
        );
        if (!res.success) {
          return callback({ success: false, error: res.error });
        }

        console.log(`User joined: ${userId}`, join);
        return callback({ success: true });
      });

      // ─── START ────────────────────────
      socket.on("start", (callback) => {
        const updateRes = userService.updateUser(userId, {
          status: "searching",
        });
        if (!updateRes.success) {
          return callback({ success: false, error: updateRes.error });
        }

        const res = matchService.startSearch(userId);
        if (!res.success) {
          return callback({ success: false, error: res.error });
        }

        // If a match is found immediately:
        if (res.data) {
          socket.emit("match_found", { peerId: res.data });
          socket.to(res.data).emit("match_found", { peerId: userId });
          console.log(`Matched: ${userId} ↔ ${res.data}`);
          return callback({ success: true, data: { matchId: res.data } });
        }

        // No match yet, keep searching
        return callback({ success: true });
      });

      // ─── LEAVE ────────────────────────
      socket.on("leave", (callback) => {
        const res = matchService.leave(userId);
        if (!res.success) {
          return callback({ success: false, error: res.error });
        }
        console.log(`User left search: ${userId}`);
        return callback({ success: true });
      });

      // ─── DISCONNECT ───────────────────
      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${userId}`);
        matchService.handleDisconnect(userId);
      });

      // ─── END-CALL ─────────────────────
      socket.on("end-call", () => {
        const userRes = userService.getUser(userId);
        if (!userRes.success) return;
        const user = userRes.data;
        if (!user.peerId) return;

        const peerRes = userService.getUser(user.peerId);
        if (peerRes.success) {
          // Reset both users
          userService.updateUser(userId, { status: "idle", peerId: null });
          userService.updateUser(peerRes.data.id, {
            status: "idle",
            peerId: null,
          });
          socket.to(peerRes.data.id).emit("peer_left");
          console.log(`Call ended: ${userId} ↔ ${peerRes.data.id}`);
        }
      });

      // ─── WEBRTC SIGNALING ─────────────
      socket.on("offer", (data) => {
        if (data && typeof data.to === "string" && data.offer) {
          socket.to(data.to).emit("offer", { from: userId, offer: data.offer });
        }
      });

      socket.on("answer", (data) => {
        if (data && typeof data.to === "string" && data.answer) {
          socket
            .to(data.to)
            .emit("answer", { from: userId, answer: data.answer });
        }
      });

      socket.on("ice-candidate", (data) => {
        if (data && typeof data.to === "string" && data.candidate) {
          socket
            .to(data.to)
            .emit("ice-candidate", { from: userId, candidate: data.candidate });
        }
      });
    },
  );
}
