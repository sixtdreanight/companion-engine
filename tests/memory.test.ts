import { describe, it, expect, beforeEach, vi } from "vitest";
import { sanitizePathId } from "../src/config.js";
import {
  loadShortTerm,
  saveShortTerm,
  loadSummary,
  saveSummary,
  removeLastTurn,
  applyForgettingCurve,
  updateFact,
  buildMemoryContext,
} from "../src/memory.js";

describe("sanitizePathId (path traversal defense)", () => {
  it("blocks directory traversal with ../", () => {
    const result = sanitizePathId("../../../etc/passwd");
    expect(result).not.toContain("/");
    expect(result).not.toContain("..");
  });

  it("blocks directory traversal with ..\\", () => {
    const result = sanitizePathId("..\\..\\..\\Windows\\System32");
    expect(result).not.toContain("\\");
    expect(result).not.toContain("..");
  });

  it("blocks null bytes", () => {
    const result = sanitizePathId("user\0name.txt");
    expect(result).not.toContain("\0");
  });

  it("blocks colon and wildcard characters", () => {
    const result = sanitizePathId("C:*?windows<foo>|bar");
    expect(result).not.toContain(":");
    expect(result).not.toContain("*");
    expect(result).not.toContain("?");
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
    expect(result).not.toContain("|");
  });

  it("truncates IDs longer than 200 characters", () => {
    const long = "a".repeat(300);
    const result = sanitizePathId(long);
    expect(result.length).toBeLessThanOrEqual(200);
  });

  it("returns 'unknown' for empty-after-sanitize IDs", () => {
    const result = sanitizePathId("");
    expect(result).toBe("unknown");
  });
});

describe("loadSummary", () => {
  it("returns null for non-existent user without crashing", () => {
    // Path traversal should be sanitized, not create files outside data dir
    const result = loadSummary("../../../etc/passwd");
    expect(result).toBeNull();
  });

  it("returns null for user with special characters", () => {
    const result = loadSummary("user<script>alert(1)</script>");
    expect(result).toBeNull();
  });
});

describe("saveSummary + loadSummary roundtrip", () => {
  it("saves and loads summary for valid user ID", () => {
    const testUser = "test-summary-user-" + Date.now();
    const testSummary = "这是一段测试摘要内容";

    saveSummary(testUser, testSummary);
    const loaded = loadSummary(testUser);

    expect(loaded).toBe(testSummary);
  });
});
