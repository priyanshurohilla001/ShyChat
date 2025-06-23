import { User } from "../types/userTypes";
import { PoolManager } from "./poolManager";
import { UserService } from "./userService";

export interface MatchSelector {
  findMatch(user: User): string | null;
}

export class SimpleFilterSelector implements MatchSelector {
  constructor(
    private poolManager: PoolManager,
    private userService: UserService,
  ) {}

  private isMutualMatch(candidate: User, user: User): boolean {
    if (candidate.status !== "searching") return false;

    if (
      candidate.preferences.gender !== "any" &&
      candidate.preferences.gender !== user.identity.gender
    )
      return false;

    if (
      candidate.preferences.years !== "any" &&
      !candidate.preferences.years.includes(user.identity.year)
    )
      return false;

    return true;
  }

  findMatch(user: User): string | null {
    const { preferences } = user;

    const genderPrefs =
      preferences.gender === "any" ? ["male", "female"] : [preferences.gender];

    const yearPrefs =
      preferences.years === "any" ? [1, 2, 3, 4] : preferences.years;

    for (const gender of genderPrefs) {
      for (const year of yearPrefs) {
        const poolKey = `${gender}_${year}`;
        const pool = this.poolManager.getPool(poolKey);

        if (!pool || pool.size() === 0) continue;

        const subset = pool.getRandomSubset(10);

        for (const gender of genderPrefs) {
          for (const year of yearPrefs) {
            const poolKey = `${gender}_${year}`;
            const pool = this.poolManager.getPool(poolKey);
            if (!pool || pool.size() === 0) continue;

            const subset = pool.getRandomSubset(10);
            for (const candidateId of subset) {
              if (!candidateId || candidateId === user.id) continue;

              const candidateResult = this.userService.getUser(candidateId);
              if (!candidateResult.success) continue;

              const candidate = candidateResult.data;

              if (this.isMutualMatch(candidate, user)) {
                return candidateId;
              }
            }
          }
        }
      }
    }

    return null; // No match found
  }
}
