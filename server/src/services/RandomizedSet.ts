import { number } from "zod";
import { MatchPool } from "./MatchPool";

export class RandomizedSet implements MatchPool {
  private arr: string[] = [];
  private idx: Map<string, number> = new Map();

  add(id: string): void {
    if (this.idx.has(id)) return;
    this.idx.set(id, this.arr.length);
    this.arr.push(id);
  }

  remove(id: string): void {
    const i = this.idx.get(id);
    if (i === undefined) return;
    const last = this.arr[this.arr.length - 1];
    this.arr[i] = last;
    this.idx.set(last, i);
    this.arr.pop();
    this.idx.delete(id);
  }

  getRandom(): string | null {
    if (this.arr.length === 0) return null;
    const i = Math.floor(Math.random() * this.arr.length);
    return this.arr[i];
  }

  getRandomSubset(tries: number): string[] {
    const subset: string[] = [];

    const indices = new Set<number>();

    const len = this.idx.size;

    while (indices.size < Math.min(tries, len)) {
      indices.add(Math.floor(Math.random() * len));
    }

    for (const i of indices) {
      subset.push(this.arr[i]);
    }

    return subset;
  }

  size(): number {
    return this.arr.length;
  }

  has(id: string): boolean {
    return this.idx.has(id);
  }

  clear(): void {
    this.arr = [];
    this.idx.clear();
  }
}
