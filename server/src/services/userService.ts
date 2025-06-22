import { User, Identity, Preferences, Status } from "../types/userTypes";
import { ServiceResult, DataResult } from "../types/resultTypes";

export class UserService {
  // In‐memory user store
  private userMap = new Map<string, User>();

  addUser(
    id: string,
    identity: Identity,
    preferences: Preferences,
  ): ServiceResult {
    if (this.userMap.has(id)) {
      return { success: false, error: `User ${id} already exists` };
    }

    const user: User = {
      id,
      identity,
      preferences,
      status: "idle",
      peerId: null,
      lastSeen: Date.now(),
    };
    this.userMap.set(id, user);
    return { success: true };
  }

  getUser(id: string): DataResult<User> {
    const user = this.userMap.get(id);
    if (!user) {
      return { success: false, error: `User ${id} not found` };
    }
    return { success: true, data: user };
  }

  updateUser(id: string, patch: Partial<Omit<User, "id">>): ServiceResult {
    const user = this.userMap.get(id);
    if (!user) {
      return { success: false, error: `Cannot update; user ${id} not found` };
    }
    Object.assign(user, patch);
    user.lastSeen = Date.now();
    return { success: true };
  }

  removeUser(id: string): ServiceResult {
    if (!this.userMap.has(id)) {
      return { success: false, error: `Cannot remove; user ${id} not found` };
    }
    this.userMap.delete(id);
    return { success: true };
  }

  getTotalUserCount(): number {
    return this.userMap.size;
  }

  hasUser(id: string): boolean {
    return this.userMap.has(id);
  }
}

// Instantiating
export const userService = new UserService();
