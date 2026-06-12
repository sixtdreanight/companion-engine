import { describe, it, expect, beforeEach } from "vitest";
import { CircuitBreaker } from "../src/circuit-breaker.js";

describe("CircuitBreaker", () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker(3, 5000, 1);
  });

  it("starts in CLOSED state", () => {
    expect(cb.state).toBe("CLOSED");
  });

  it("executes fn successfully when CLOSED", async () => {
    const result = await cb.call(() => Promise.resolve("ok"), () => Promise.resolve("fallback"));
    expect(result).toBe("ok");
    expect(cb.state).toBe("CLOSED");
  });

  it("calls fallback on failure", async () => {
    const result = await cb.call(
      () => Promise.reject(new Error("fail")),
      () => Promise.resolve("fallback"),
    );
    expect(result).toBe("fallback");
  });

  it("opens circuit after threshold failures", async () => {
    for (let i = 0; i < 3; i++) {
      await cb.call(() => Promise.reject(new Error("fail")), () => Promise.resolve("fallback"));
    }
    expect(cb.state).toBe("OPEN");
  });

  it("returns fallback immediately when OPEN", async () => {
    // Force open
    for (let i = 0; i < 3; i++) {
      await cb.call(() => Promise.reject(new Error("fail")), () => Promise.resolve("fallback"));
    }
    // Should return fallback without calling fn
    let fnCalled = false;
    const result = await cb.call(
      () => { fnCalled = true; return Promise.resolve("ok"); },
      () => Promise.resolve("fallback"),
    );
    expect(result).toBe("fallback");
    expect(fnCalled).toBe(false);
  });

  it("transitions to HALF_OPEN after resetTimeout", async () => {
    cb = new CircuitBreaker(3, 0, 1); // 0ms timeout for testing
    for (let i = 0; i < 3; i++) {
      await cb.call(() => Promise.reject(new Error("fail")), () => Promise.resolve("fallback"));
    }
    expect(cb.state).toBe("OPEN");
    // Next call with 0ms timeout should transition to HALF_OPEN
    let fnCalled = false;
    const result = await cb.call(
      () => { fnCalled = true; return Promise.resolve("probe-ok"); },
      () => Promise.resolve("fallback"),
    );
    expect(result).toBe("probe-ok");
    expect(fnCalled).toBe(true);
    expect(cb.state).toBe("CLOSED"); // Success should reset
  });
});
