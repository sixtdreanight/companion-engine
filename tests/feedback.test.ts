import { describe, it, expect, vi, beforeEach } from "vitest";

import { saveFeedback, loadRecentFeedback, buildFeedbackContext } from "../src/feedback.js";
import type { FeedbackEntry } from "../src/feedback.js";

const testUser = "feedback-test-user";

describe("saveFeedback + loadRecentFeedback", () => {
  it("stores and retrieves feedback entries", () => {
    const entry: FeedbackEntry = {
      type: "thumbs_up",
      userMessage: "你觉得呢？",
      aiReply: "我觉得很好呀~",
      timestamp: new Date().toISOString(),
    };

    saveFeedback(testUser, entry);
    const recent = loadRecentFeedback(testUser, 5);

    expect(recent.length).toBeGreaterThanOrEqual(1);
    const last = recent[recent.length - 1];
    expect(last.type).toBe("thumbs_up");
    expect(last.userMessage).toBe("你觉得呢？");
  });

  it("caps at MAX_FEEDBACK (50 entries)", () => {
    for (let i = 0; i < 55; i++) {
      saveFeedback(testUser, {
        type: "thumbs_up",
        userMessage: `message ${i}`,
        aiReply: `reply ${i}`,
        timestamp: new Date().toISOString(),
      });
    }

    const recent = loadRecentFeedback(testUser, 100);
    expect(recent.length).toBeLessThanOrEqual(50);
  });

  it("returns empty array for non-existent user", () => {
    const result = loadRecentFeedback("nonexistent-user-xyz", 5);
    expect(result).toEqual([]);
  });
});

describe("buildFeedbackContext", () => {
  const ctxUser = "ctx-test-user";

  it("returns undefined when no feedback exists", () => {
    const result = buildFeedbackContext("no-feedback-user-ever");
    expect(result).toBeUndefined();
  });

  it("builds context from thumb-down feedback", () => {
    saveFeedback(ctxUser, {
      type: "thumbs_down",
      userMessage: "这个回答太敷衍了",
      aiReply: "嗯嗯，知道了",
      timestamp: new Date().toISOString(),
    });

    const ctx = buildFeedbackContext(ctxUser);
    expect(ctx).toBeDefined();
    expect(ctx).toContain("不满意");
    expect(ctx).toContain("太敷衍了");
  });

  it("builds context from corrections", () => {
    saveFeedback(ctxUser, {
      type: "correction",
      userMessage: "我不喜欢这个称呼",
      aiReply: "宝贝，你好呀",
      correctionText: "叫我名字就好",
      timestamp: new Date().toISOString(),
    });

    const ctx = buildFeedbackContext(ctxUser);
    expect(ctx).toBeDefined();
    expect(ctx).toContain("期望");
  });
});
