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

    console.log(`[MATCH] Potential match found: ${userId} ↔ ${matchId}`);

    // Re-check current user status before proceeding with match
    const currentUserResult = userService.getUser(userId);
    if (
      !currentUserResult.success ||
      currentUserResult.data.status !== "searching"
    ) {
      return { success: false, error: "User status changed during search" };
    }

    const matchResult = userService.getUser(matchId);
    if (!matchResult.success) {
      return { success: false, error: "Matched user not found" };
    }

    const matchedUser = matchResult.data;

    if (matchedUser.status !== "searching") {
      return { success: false, error: "Matched user is not available" };
    }

    // Final status check before committing to the match
    const finalUserCheck = userService.getUser(userId);
    const finalMatchCheck = userService.getUser(matchId);

    if (!finalUserCheck.success || !finalMatchCheck.success) {
      return { success: false, error: "User validation failed" };
    }

    const finalUser = finalUserCheck.data;
    const finalMatchedUser = finalMatchCheck.data;

    if (
      finalUser.status === "searching" &&
      finalMatchedUser.status === "searching"
    ) {
      // Remove both from pool
      poolManager.removeFromPool(finalUser);
      poolManager.removeFromPool(finalMatchedUser);

      // Update both users to in-call
      userService.updateUser(finalUser.id, {
        status: "in-call",
        peerId: finalMatchedUser.id,
      });

      userService.updateUser(finalMatchedUser.id, {
        status: "in-call",
        peerId: finalUser.id,
      });

      console.log(
        `[MATCH] Successfully matched users: ${userId} ↔ ${finalMatchedUser.id}`,
      );
      return { success: true, data: finalMatchedUser.id };
    }

    return {
      success: false,
      error: "One or both users are no longer searching",
    };
  }

  leave(userId: string): ServiceResult {
    console.log(`[MATCH] User ${userId} attempting to leave`);

    const userRes = userService.getUser(userId);
    if (!userRes.success) {
      console.log(`[MATCH] User ${userId} not found when trying to leave`);
      return { success: false, error: "User not found" };
    }

    const user = userRes.data;

    if (user.status === "idle") {
      console.log(`[MATCH] User ${userId} is already idle, cannot leave`);
      return { success: false, error: "User is not searching or in a call" };
    }

    // Handle user leaving from searching state
    if (user.status === "searching") {
      console.log(`[MATCH] Removing user ${userId} from search pool`);
      poolManager.removeFromPool(user);
    }

    // Handle user leaving from in-call state
    if (user.status === "in-call" && user.peerId) {
      const peerRes = userService.getUser(user.peerId);
      if (peerRes.success) {
        const peer = peerRes.data;
        console.log(`[MATCH] Updating peer ${peer.id} to idle status`);
        userService.updateUser(peer.id, {
          status: "idle",
          peerId: null,
        });
      } else {
        console.log(
          `[MATCH] Peer ${user.peerId} not found when user ${userId} left call`,
        );
      }
    }

    userService.updateUser(userId, {
      status: "idle",
      peerId: null,
    });

    console.log(`[MATCH] Successfully handled leave for user ${userId}`);
    return { success: true };
  }

  handleDisconnect(userId: string): void {
    console.log(`[MATCH] Handling disconnect for user: ${userId}`);

    const userRes = userService.getUser(userId);
    if (!userRes.success) {
      console.log(
        `[MATCH] User ${userId} not found during disconnect handling`,
      );
      return;
    }

    const user = userRes.data;
    console.log(
      `[MATCH] Disconnecting user ${userId} with status: ${user.status}, peerId: ${user.peerId}`,
    );

    // Always try to remove from pool regardless of status
    // This handles race conditions where user might be stuck in pool
    try {
      poolManager.removeFromPool(user);
    } catch (error) {
      console.log(
        `[MATCH] Note: Could not remove user ${userId} from pool:`,
        error,
      );
    }

    // Handle peer cleanup if user was in a call
    if (user.status === "in-call" && user.peerId) {
      console.log(
        `[MATCH] User ${userId} was in call with peer ${user.peerId}, cleaning up peer`,
      );
      const peerRes = userService.getUser(user.peerId);
      if (peerRes.success) {
        const peer = peerRes.data;
        console.log(`[MATCH] Setting peer ${peer.id} to idle status`);

        // Update peer status and clear their peerId
        userService.updateUser(peer.id, {
          status: "idle",
          peerId: null,
        });

        // TODO: Optionally emit a socket event to inform peer
        // socket.to(peer.id).emit("peer_left");
      } else {
        console.log(
          `[MATCH] Peer ${user.peerId} not found during disconnect cleanup`,
        );
      }
    }

    // Always remove the user from the service
    console.log(`[MATCH] Removing user ${userId} from user service`);
    userService.removeUser(user.id);
    console.log(`[MATCH] Successfully handled disconnect for user ${userId}`);
  }
}

const matchService = new MatchService();
export default matchService;
