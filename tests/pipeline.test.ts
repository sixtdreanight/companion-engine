import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---- Pipeline session management ----

import { cleanupSessions } from "../src/pipeline.js";

describe("cleanupSessions", () => {
  it("does not throw on empty state", () => {
    expect(() => cleanupSessions()).not.toThrow();
  });

  it("can be called multiple times safely", () => {
    cleanupSessions();
    cleanupSessions();
    cleanupSessions();
    expect(() => cleanupSessions()).not.toThrow();
  });
});

// ---- Search ----

import { needsSearch, extractSearchQuery } from "../src/search.js";

describe("needsSearch", () => {
  it("detects search intent keywords", () => {
    expect(needsSearch("帮我查一下天气")).toBe(true);
    expect(needsSearch("搜一下最近的新闻")).toBe(true);
    expect(needsSearch("今天有什么新闻")).toBe(true);
    expect(needsSearch("现在股价多少")).toBe(true);
  });

  it("returns false for normal conversation", () => {
    expect(needsSearch("今天过得怎么样")).toBe(false);
    expect(needsSearch("我喜欢你")).toBe(false);
    expect(needsSearch("吃饭了吗")).toBe(false);
  });
});

describe("extractSearchQuery", () => {
  it("strips instruction prefixes", () => {
    expect(extractSearchQuery("查一下北京天气")).toBe("北京天气");
    expect(extractSearchQuery("帮我Python教程")).toBe("Python教程");
    expect(extractSearchQuery("搜索AI最新进展")).toBe("AI最新进展");
  });

  it("removes punctuation", () => {
    expect(extractSearchQuery("今天天气怎么样？")).toBe("今天天气怎么样");
    expect(extractSearchQuery("什么是机器学习？")).toBe("什么是机器学习");
  });

  it("truncates long queries to 100 chars", () => {
    const long = "a".repeat(200);
    expect(extractSearchQuery(long).length).toBeLessThanOrEqual(100);
  });
});
