// A pool supports O(1) add, remove, getRandom, size
export interface MatchPool {
  add(id: string): void;
  getRandomSubset(tries: number): string[];
  remove(id: string): void;
  getRandom(): string | null;
  size(): number;
  has(id: string): boolean;
  clear(): void;
}
