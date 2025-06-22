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

        const candidateId = pool.getRandom();

        if (!candidateId || candidateId === user.id) continue;

        const candidateResult = this.userService.getUser(candidateId);
        if (!candidateResult.success) continue;

        const candidate = candidateResult.data;

        if (candidate.status === "idle" || candidate.status === "searching") {
          return candidate.id;
        }
      }
    }

    return null; // No match found
  }
}
