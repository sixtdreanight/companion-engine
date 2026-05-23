import { describe, it, expect } from "vitest";
import { MemoryCheckpointer } from "../src/checkpointer.js";

interface TestState {
  count: number;
  message: string;
}

describe("MemoryCheckpointer", () => {
  it("returns null for unknown key", async () => {
    const cp = new MemoryCheckpointer<TestState>();
    expect(await cp.get("unknown")).toBeNull();
  });

  it("stores and retrieves state", async () => {
    const cp = new MemoryCheckpointer<TestState>();
    await cp.set("user-1", { count: 42, message: "hello" });
    const state = await cp.get("user-1");
    expect(state).toEqual({ count: 42, message: "hello" });
  });

  it("overwrites existing state", async () => {
    const cp = new MemoryCheckpointer<TestState>();
    await cp.set("user-1", { count: 1, message: "first" });
    await cp.set("user-1", { count: 2, message: "second" });
    const state = await cp.get("user-1");
    expect(state!.count).toBe(2);
  });

  it("deletes state", async () => {
    const cp = new MemoryCheckpointer<TestState>();
    await cp.set("user-1", { count: 1, message: "test" });
    await cp.delete("user-1");
    expect(await cp.get("user-1")).toBeNull();
  });

  it("lists all keys", async () => {
    const cp = new MemoryCheckpointer<TestState>();
    await cp.set("a", { count: 1, message: "a" });
    await cp.set("b", { count: 2, message: "b" });
    const keys = await cp.list();
    expect(keys).toContain("a");
    expect(keys).toContain("b");
    expect(keys.length).toBe(2);
  });
});
