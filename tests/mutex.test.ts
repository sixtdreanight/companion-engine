import { describe, it, expect } from "vitest";
import { Mutex, withLock, getOrCreateMutex } from "../src/mutex.js";

describe("Mutex", () => {
  it("acquires and releases correctly", async () => {
    const m = new Mutex();
    let counter = 0;

    await withLock(m, async () => {
      counter++;
      return Promise.resolve();
    });
    expect(counter).toBe(1);

    await withLock(m, async () => {
      counter++;
      return Promise.resolve();
    });
    expect(counter).toBe(2);
  });

  it("serializes concurrent operations", async () => {
    const m = new Mutex();
    const order: number[] = [];

    await Promise.all([
      withLock(m, async () => {
        order.push(1);
        await new Promise((r) => setTimeout(r, 20));
        order.push(2);
      }),
      withLock(m, async () => {
        order.push(3);
        order.push(4);
      }),
    ]);

    // Must be serial: 1,2,3,4 or 3,4,1,2 (not interleaved)
    const s = order.join("");
    expect(["1234", "3412"]).toContain(s);
  });

  it("times out gracefully and proceeds without lock", async () => {
    const m = new Mutex();
    // Hold the lock
    m.acquire(100); // Don't await — this starts the acquire

    // Wait for the first acquire to complete
    await new Promise((r) => setTimeout(r, 10));

    // This should time out and proceed
    let executed = false;
    await withLock(m, async () => {
      executed = true;
    }, 50);

    expect(executed).toBe(true);
    m.release();
  });

  it("returns value from withLock", async () => {
    const m = new Mutex();
    const result = await withLock(m, async () => 42);
    expect(result).toBe(42);
  });

  it("getOrCreateMutex reuses instances", () => {
    const map = new Map<string, Mutex>();
    const a = getOrCreateMutex(map, "key1");
    const b = getOrCreateMutex(map, "key1");
    expect(a).toBe(b);
    const c = getOrCreateMutex(map, "key2");
    expect(a).not.toBe(c);
  });
});
