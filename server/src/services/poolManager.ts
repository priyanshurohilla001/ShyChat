import { User } from "../types/userTypes";
import { RandomizedSet } from "./RandomizedSet";
import { MatchPool } from "./MatchPool";

export class PoolManager {
  private pools: Map<string, MatchPool> = new Map();

  constructor(identityKeys: string[]) {
    // Initialize one pool per identity key
    identityKeys.forEach((key) => {
      this.pools.set(key, new RandomizedSet());
    });
  }

  private getIdentityKey(user: User): string {
    return `${user.identity.gender}_${user.identity.year}`;
  }

  addToPool(user: User): void {
    const key = this.getIdentityKey(user);
    const pool = this.pools.get(key);
    if (!pool) {
      throw new Error(`No pool for identity ${key}`);
    }
    pool.add(user.id);
  }

  removeFromPool(user: User): void {
    const key = this.getIdentityKey(user);
    this.pools.get(key)?.remove(user.id);
  }

  getPool(key: string): MatchPool | undefined {
    return this.pools.get(key);
  }

  getPoolSizes(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [key, pool] of this.pools) {
      out[key] = pool.size();
    }
    return out;
  }
}
