import { describe, it, expect, beforeEach } from "vitest";
import {
  setLogLevel,
  setLogJson,
  setLogFile,
  createCorrelationId,
  retry,
  sleep,
  pickRandom,
  getPipelineStats,
  recordPipelineMessage,
  recordPipelineError,
} from "../src/utils.js";

describe("utils", () => {
  describe("createCorrelationId", () => {
    it("generates unique IDs", () => {
      const a = createCorrelationId();
      const b = createCorrelationId();
      expect(a).not.toBe(b);
    });

    it("generates non-empty IDs", () => {
      expect(createCorrelationId().length).toBeGreaterThan(0);
    });
  });

  describe("retry", () => {
    it("returns on first success", async () => {
      let calls = 0;
      const result = await retry(() => { calls++; return Promise.resolve("ok"); });
      expect(result).toBe("ok");
      expect(calls).toBe(1);
    });

    it("retries on failure and succeeds", async () => {
      let calls = 0;
      const result = await retry(() => {
        calls++;
        if (calls < 2) throw new Error("fail");
        return Promise.resolve("ok");
      }, 3, 10);
      expect(result).toBe("ok");
      expect(calls).toBe(2);
    });

    it("throws after max attempts", async () => {
      let calls = 0;
      await expect(retry(() => {
        calls++;
        throw new Error("always fail");
      }, 2, 10)).rejects.toThrow("always fail");
      expect(calls).toBe(2);
    });
  });

  describe("sleep", () => {
    it("resolves after delay", async () => {
      const start = Date.now();
      await sleep(50);
      expect(Date.now() - start).toBeGreaterThanOrEqual(40);
    });
  });

  describe("pickRandom", () => {
    it("returns an element from the array", () => {
      const items = ["a", "b", "c"];
      const picked = pickRandom(items);
      expect(items).toContain(picked);
    });
  });

  describe("pipeline stats", () => {
    beforeEach(() => {
      // Reset by recording many messages then checking count
      // Stats are global so best-effort testing
      const before = getPipelineStats();
      // We can't easily reset, so test relative changes
    });

    it("recordPipelineMessage increments counters", () => {
      const before = getPipelineStats().totalMessages;
      recordPipelineMessage(100);
      expect(getPipelineStats().totalMessages).toBeGreaterThanOrEqual(before + 1);
    });

    it("recordPipelineError tracks errors", () => {
      const before = getPipelineStats().errorCount;
      recordPipelineError("test error");
      expect(getPipelineStats().errorCount).toBeGreaterThanOrEqual(before + 1);
      expect(getPipelineStats().lastError).toBe("test error");
    });

    it("getPipelineStats returns readonly shape", () => {
      const stats = getPipelineStats();
      expect(stats).toHaveProperty("totalMessages");
      expect(stats).toHaveProperty("totalApiCalls");
      expect(stats).toHaveProperty("totalLatencyMs");
      expect(stats).toHaveProperty("errorCount");
      expect(stats).toHaveProperty("lastError");
    });
  });

  describe("log JSON mode", () => {
    it("setLogJson toggles without error", () => {
      setLogJson(true);
      setLogJson(false);
    });
  });
});
