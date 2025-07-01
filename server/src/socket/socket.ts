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
        if (typeof callback !== "function") {
          console.warn("No callback function provided for join");
          return;
        }

        try {
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
            console.error(`Failed to add user ${userId}:`, res.error);
            return callback({ success: false, error: res.error });
          }

          console.log(`User joined: ${userId}`, join);
          return callback({ success: true });
        } catch (error) {
          console.error(
            `Unexpected error in join handler for ${userId}:`,
            error,
          );
          return callback({ success: false, error: "Internal server error" });
        }
      });

      // ─── START ────────────────────────
      socket.on("start", (callback) => {
        if (typeof callback !== "function") {
          console.warn("No callback function provided for start");
          return;
        }

        try {
          console.log(`User ${userId} starting matchmaking search`);

          const updateRes = userService.updateUser(userId, {
            status: "searching",
          });
          if (!updateRes.success) {
            console.error(
              `Failed to update user ${userId} to searching:`,
              updateRes.error,
            );
            return callback({ success: false, error: updateRes.error });
          }

          const res = matchService.startSearch(userId);
          if (!res.success) {
            console.error(`Match search failed for ${userId}:`, res.error);
            // Revert user status on match failure
            userService.updateUser(userId, { status: "idle" });
            return callback({ success: false, error: res.error });
          }

          // If a match is found immediately:
          if (res.data) {
            console.log(
              `Match found! Assigning caller role: ${userId} ↔ ${res.data}`,
            );

            // Determine caller based on lexicographic comparison to avoid glare condition
            // The user with smaller ID becomes the caller
            const isUserCaller = userId < res.data;

            if (isUserCaller) {
              // Current user is caller - gets match_found event to create offer
              try {
                socket.emit("match_found", { peerId: res.data });
                console.log(
                  `${userId} designated as CALLER, will create offer`,
                );
              } catch (emitError) {
                console.error(
                  `Failed to emit match_found to ${userId}:`,
                  emitError,
                );
                // Cleanup the match since we couldn't notify the user
                matchService.handleDisconnect(userId);
                return callback({
                  success: false,
                  error: "Failed to notify user of match",
                });
              }
            } else {
              // Matched user is caller - gets match_found event to create offer
              try {
                const targetSocket = socket.to(res.data);
                if (!targetSocket) {
                  console.error(
                    `Target socket ${res.data} not found for match notification`,
                  );
                  // Cleanup both users since we couldn't notify the matched user
                  matchService.handleDisconnect(userId);
                  matchService.handleDisconnect(res.data);
                  return callback({
                    success: false,
                    error: "Matched user no longer available",
                  });
                }

                targetSocket.emit("match_found", { peerId: userId });
                console.log(
                  `${res.data} designated as CALLER, will create offer`,
                );
              } catch (emitError) {
                console.error(
                  `Failed to emit match_found to ${res.data}:`,
                  emitError,
                );
                // Cleanup both users since we couldn't notify the matched user
                matchService.handleDisconnect(userId);
                matchService.handleDisconnect(res.data);
                return callback({
                  success: false,
                  error: "Failed to notify matched user",
                });
              }
            }

            console.log(
              `Successfully set up caller/callee roles for: ${userId} ↔ ${res.data}`,
            );

            // Verify both users are still connected before completing the match
            const finalUserCheck = userService.getUser(userId);
            const finalMatchCheck = userService.getUser(res.data);

            if (!finalUserCheck.success || !finalMatchCheck.success) {
              console.error(
                `User verification failed after match setup: ${userId} ↔ ${res.data}`,
              );
              return callback({
                success: false,
                error: "Match verification failed",
              });
            }

            return callback({ success: true, data: { matchId: res.data } });
          }

          // No match yet, keep searching
          console.log(`No immediate match for ${userId}, added to search pool`);
          return callback({ success: true });
        } catch (error) {
          console.error(
            `Unexpected error in start handler for ${userId}:`,
            error,
          );
          return callback({ success: false, error: "Internal server error" });
        }
      });

      // ─── LEAVE ────────────────────────
      socket.on("leave", (callback) => {
        if (typeof callback !== "function") {
          console.warn("No callback function provided for leave");
          return;
        }

        try {
          console.log(`User ${userId} leaving matchmaking search`);

          const res = matchService.leave(userId);
          if (!res.success) {
            console.error(
              `Failed to remove user ${userId} from search:`,
              res.error,
            );
            return callback({ success: false, error: res.error });
          }

          console.log(`User left search: ${userId}`);
          return callback({ success: true });
        } catch (error) {
          console.error(
            `Unexpected error in leave handler for ${userId}:`,
            error,
          );
          return callback({ success: false, error: "Internal server error" });
        }
      });

      // ─── DISCONNECT ───────────────────
      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${userId}`);
        try {
          matchService.handleDisconnect(userId);
          console.log(`Successfully handled disconnect for user: ${userId}`);
        } catch (error) {
          console.error(`Error handling disconnect for ${userId}:`, error);
        }
      });

      // ─── END-CALL ─────────────────────
      socket.on("end-call", () => {
        try {
          console.log(`User ${userId} ending call`);

          const userRes = userService.getUser(userId);
          if (!userRes.success) {
            console.error(`User ${userId} not found when ending call`);
            return;
          }

          const user = userRes.data;
          if (!user.peerId) {
            console.log(`User ${userId} has no peer to disconnect from`);
            return;
          }

          const peerRes = userService.getUser(user.peerId);
          if (peerRes.success) {
            const peerId = peerRes.data.id;

            // Reset both users
            userService.updateUser(userId, { status: "idle", peerId: null });
            userService.updateUser(peerId, { status: "idle", peerId: null });

            // Notify peer
            socket.to(peerId).emit("peer_left");

            console.log(`Call ended successfully: ${userId} ↔ ${peerId}`);
          } else {
            console.error(
              `Peer ${user.peerId} not found when ending call for ${userId}`,
            );
          }
        } catch (error) {
          console.error(`Error handling end-call for ${userId}:`, error);
        }
      });

      // ─── WEBRTC SIGNALING ─────────────
      socket.on("offer", (data) => {
        try {
          if (!data) {
            console.error(
              `Invalid offer data from ${userId}: data is null/undefined`,
            );
            return;
          }

          if (typeof data.to !== "string") {
            console.error(
              `Invalid offer from ${userId}: 'to' field must be string, got:`,
              typeof data.to,
            );
            return;
          }

          if (!data.offer) {
            console.error(
              `Invalid offer from ${userId}: 'offer' field is missing`,
            );
            return;
          }

          console.log(`Forwarding offer from ${userId} to ${data.to}`);
          socket.to(data.to).emit("offer", { from: userId, offer: data.offer });
          console.log(
            `Offer forwarded successfully from ${userId} to ${data.to}`,
          );
        } catch (error) {
          console.error(`Error handling offer from ${userId}:`, error);
        }
      });

      socket.on("answer", (data) => {
        try {
          if (!data) {
            console.error(
              `Invalid answer data from ${userId}: data is null/undefined`,
            );
            return;
          }

          if (typeof data.to !== "string") {
            console.error(
              `Invalid answer from ${userId}: 'to' field must be string, got:`,
              typeof data.to,
            );
            return;
          }

          if (!data.answer) {
            console.error(
              `Invalid answer from ${userId}: 'answer' field is missing`,
            );
            return;
          }

          console.log(`Forwarding answer from ${userId} to ${data.to}`);
          socket
            .to(data.to)
            .emit("answer", { from: userId, answer: data.answer });
          console.log(
            `Answer forwarded successfully from ${userId} to ${data.to}`,
          );
        } catch (error) {
          console.error(`Error handling answer from ${userId}:`, error);
        }
      });

      socket.on("ice-candidate", (data) => {
        try {
          if (!data) {
            console.error(
              `Invalid ice-candidate data from ${userId}: data is null/undefined`,
            );
            return;
          }

          if (typeof data.to !== "string") {
            console.error(
              `Invalid ice-candidate from ${userId}: 'to' field must be string, got:`,
              typeof data.to,
            );
            return;
          }

          if (!data.candidate) {
            console.error(
              `Invalid ice-candidate from ${userId}: 'candidate' field is missing`,
            );
            return;
          }

          console.log(`Forwarding ICE candidate from ${userId} to ${data.to}`);
          socket
            .to(data.to)
            .emit("ice-candidate", { from: userId, candidate: data.candidate });
          console.log(
            `ICE candidate forwarded successfully from ${userId} to ${data.to}`,
          );
        } catch (error) {
          console.error(`Error handling ice-candidate from ${userId}:`, error);
        }
      });
    },
  );
}
