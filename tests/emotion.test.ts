import { describe, it, expect } from "vitest";
import {
  createEmotionState,
  updateEmotion,
  getCurrentMood,
  getEmotionContext,
} from "../src/emotion.js";

describe("createEmotionState", () => {
  it("returns a valid state", () => {
    const state = createEmotionState();
    expect(state.current).toBeDefined();
    expect(state.intensity).toBeGreaterThan(0);
    expect(state.intensity).toBeLessThanOrEqual(1);
    expect(state.previous).toBe("neutral");
  });
});

describe("updateEmotion", () => {
  it("triggers happy on positive keywords", () => {
    const state = createEmotionState();
    const updated = updateEmotion(state, "哈哈太好了好开心", 10);
    expect(["happy", "excited"]).toContain(updated.current);
  });

  it("triggers sad on negative keywords", () => {
    const state = createEmotionState();
    const updated = updateEmotion(state, "今天好难过崩溃了", 10);
    expect(["sad", "anxious"]).toContain(updated.current);
  });

  it("drifts toward tired on long sessions", () => {
    const state = createEmotionState();
    const updated = updateEmotion(state, "日常聊天", 60);
    expect(updated.current).toBe("tired");
  });

  it("preserves previous emotion", () => {
    const state = createEmotionState();
    const before = state.current;
    const updated = updateEmotion(state, "日常", 5);
    expect(updated.previous).toBe(before);
  });
});

describe("getCurrentMood", () => {
  it("returns a string", () => {
    expect(typeof getCurrentMood()).toBe("string");
    expect(getCurrentMood().length).toBeGreaterThan(0);
  });

  it("returns mood for specific emotion", () => {
    const state = createEmotionState();
    state.current = "happy";
    const mood = getCurrentMood(state);
    expect(typeof mood).toBe("string");
    expect(mood.length).toBeGreaterThan(0);
  });
});

describe("getEmotionContext", () => {
  it("includes emotion description", () => {
    const state = createEmotionState();
    state.current = "happy";
    const ctx = getEmotionContext(state);
    expect(ctx).toContain("心情不错");
  });

  it("notes high intensity", () => {
    const state = createEmotionState();
    state.intensity = 0.9;
    const ctx = getEmotionContext(state);
    expect(ctx).toContain("比较强烈");
  });
});
