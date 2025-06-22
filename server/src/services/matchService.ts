import userService from "./userService";
import poolManager from "./poolManager";
import { SimpleFilterSelector } from "./filterSelector";
import { ServiceResult, DataResult } from "../types/resultTypes";
import { User } from "../types/userTypes";

class MatchService {
  private selector: SimpleFilterSelector;

  constructor() {
    this.selector = new SimpleFilterSelector(poolManager, userService);
  }

  startSearch(userId: string): DataResult<string | null> {
    const userResult = userService.getUser(userId);
    if (!userResult.success) {
      return { success: false, error: "User not found" };
    }

    const user = userResult.data;

    if (user.status !== "searching") {
      return { success: false, error: "User is not in searching state" };
    }

    // Add current user to the appropriate pool
    poolManager.addToPool(user);

    // Try to find a match based on preferences
    const matchId = this.selector.findMatch(user);

    if (!matchId) {
      return { success: true, data: null }; // No match yet, stay in pool
    }

    const matchResult = userService.getUser(matchId);
    if (!matchResult.success) {
      return { success: false, error: "Matched user not found" };
    }

    const matchedUser = matchResult.data;

    if (matchedUser.status !== "searching") {
      return { success: false, error: "Matched user is not available" };
    }

    // Remove both from pool
    poolManager.removeFromPool(user);
    poolManager.removeFromPool(matchedUser);

    // Update both users to in-call
    userService.updateUser(user.id, {
      status: "in-call",
      peerId: matchedUser.id,
    });

    userService.updateUser(matchedUser.id, {
      status: "in-call",
      peerId: user.id,
    });

    return { success: true, data: matchedUser.id };
  }

  leave(userId: string): ServiceResult {
    const userRes = userService.getUser(userId);
    if (!userRes.success) {
      return { success: false, error: "User not found" };
    }

    const user = userRes.data;

    if (user.status !== "searching") {
      return { success: false, error: "User is not in searching state" };
    }

    poolManager.removeFromPool(user);

    userService.updateUser(userId, {
      status: "idle",
    });

    return { success: true };
  }

  handleDisconnect(userId: string): void {
    const userRes = userService.getUser(userId);
    if (!userRes.success) return;

    const user = userRes.data;

    if (user.status === "idle") return;

    if (user.status === "searching") {
      poolManager.removeFromPool(user);
    }

    if (user.status === "in-call" && user.peerId) {
      const peerRes = userService.getUser(user.peerId);
      if (peerRes.success) {
        const peer = peerRes.data;

        userService.updateUser(peer.id, {
          status: "idle",
          peerId: null,
        });

        // TODO: Optionally emit a socket event to inform peer
        // socket.to(peer.id).emit("peer_left");
      }
    }

    userService.removeUser(user.id);
  }
}

const matchService = new MatchService();
export default matchService;
