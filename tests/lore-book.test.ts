import { describe, it, expect } from "vitest";
import {
  LoreBookManager,
  importSTLoreBook,
  createEmptyLoreBook,
  type LoreBookEntry,
} from "../src/lore-book.js";

function makeEntry(overrides?: Partial<LoreBookEntry>): LoreBookEntry {
  return {
    key: "test-entry",
    content: "这是一条测试设定",
    keywords: ["测试", "关键词"],
    alwaysOn: false,
    priority: 0,
    probability: 1,
    recursiveDepth: 0,
    position: "before_char",
    disabled: false,
    group: "",
    comment: "",
    ...overrides,
  };
}

describe("LoreBookManager", () => {
  it("activates entries by keyword match", () => {
    const mgr = new LoreBookManager();
    mgr.setEntry(makeEntry({ key: "world", keywords: ["幻想乡"], content: "幻想乡是位于东方的秘境" }));

    const result = mgr.activate("我来到了幻想乡");
    expect(result.beforeChar).toHaveLength(1);
    expect(result.beforeChar[0].content).toContain("东方");
  });

  it("does not activate when keywords don't match", () => {
    const mgr = new LoreBookManager();
    mgr.setEntry(makeEntry({ key: "world", keywords: ["幻想乡"] }));

    const result = mgr.activate("今天天气真好");
    expect(result.beforeChar).toHaveLength(0);
  });

  it("respects priority sorting (higher first)", () => {
    const mgr = new LoreBookManager();
    mgr.setEntry(makeEntry({ key: "a", keywords: ["博丽灵梦"], priority: 1 }));
    mgr.setEntry(makeEntry({ key: "b", keywords: ["博丽灵梦"], priority: 10 }));

    const result = mgr.activate("博丽灵梦是博丽神社的巫女");
    expect(result.beforeChar).toHaveLength(2);
    expect(result.beforeChar[0].key).toBe("b"); // higher priority first
  });

  it("filters by position (before_char / after_char / author_note)", () => {
    const mgr = new LoreBookManager();
    mgr.setEntry(makeEntry({ key: "before", keywords: ["天界"], position: "before_char" }));
    mgr.setEntry(makeEntry({ key: "after", keywords: ["天界"], position: "after_char" }));
    mgr.setEntry(makeEntry({ key: "note", keywords: ["天界"], position: "author_note" }));

    const result = mgr.activate("天界");

    expect(result.beforeChar).toHaveLength(1);
    expect(result.beforeChar[0].key).toBe("before");
    expect(result.afterChar).toHaveLength(1);
    expect(result.afterChar[0].key).toBe("after");
    expect(result.authorNote).toHaveLength(1);
    expect(result.authorNote[0].key).toBe("note");
  });

  it("supports always-on entries with probability", () => {
    const mgr = new LoreBookManager();
    mgr.setEntry(makeEntry({ key: "always", alwaysOn: true, keywords: [] }));

    // Always-on should always activate (probability=1 by default)
    const result = mgr.activate("任意消息");
    expect(result.beforeChar).toHaveLength(1);
  });

  it("skips disabled entries", () => {
    const mgr = new LoreBookManager();
    mgr.setEntry(makeEntry({ key: "off", keywords: ["幻想乡"], disabled: true }));

    const result = mgr.activate("幻想乡");
    expect(result.beforeChar).toHaveLength(0);
  });

  it("removes entries by key", () => {
    const mgr = new LoreBookManager();
    mgr.setEntry(makeEntry({ key: "to-remove", keywords: ["删除"] }));
    expect(mgr.removeEntry("to-remove")).toBe(true);
    expect(mgr.removeEntry("nonexistent")).toBe(false);

    const result = mgr.activate("删除");
    expect(result.beforeChar).toHaveLength(0);
  });

  it("handles regex triggers", () => {
    const mgr = new LoreBookManager();
    mgr.setEntry(makeEntry({
      key: "regex-entry",
      keywords: [],
      regex: "\\d{4}年",
      content: "年份相关设定",
    }));

    const result = mgr.activate("2026年的某一天");
    expect(result.beforeChar).toHaveLength(1);
  });

  it("recursive activation follows depth", () => {
    const mgr = new LoreBookManager();
    mgr.setEntry(makeEntry({
      key: "parent",
      keywords: ["博丽神社"],
      content: "博丽神社的巫女是博丽灵梦",
      recursiveDepth: 1,
    }));
    mgr.setEntry(makeEntry({
      key: "child",
      keywords: ["博丽灵梦"],
      content: "博丽灵梦擅长使用符卡",
      recursiveDepth: 0,
    }));

    const result = mgr.activate("博丽神社");

    // parent activates by keyword, child activates because parent's content mentions 博丽灵梦
    expect(result.beforeChar.length).toBeGreaterThanOrEqual(2);
  });
});

describe("importSTLoreBook", () => {
  it("converts ST V1/V2/V3 format", () => {
    const stBook = {
      entries: {
        "entry-1": {
          key: "幻想乡",
          content: "幻想乡位于东方的山中",
          keys: ["幻想乡", "结界"],
          enabled: true,
          priority: 5,
        },
      },
    };

    const book = importSTLoreBook(stBook);
    expect(book.format).toBe("lore-book-1");
    expect(book.entries).toHaveLength(1);
    expect(book.entries[0].key).toBe("幻想乡");
    expect(book.entries[0].keywords).toContain("幻想乡");
    expect(book.entries[0].keywords).toContain("结界");
    expect(book.entries[0].priority).toBe(5);
  });
});

describe("createEmptyLoreBook", () => {
  it("creates an empty book with metadata", () => {
    const book = createEmptyLoreBook("测试世界");
    expect(book.format).toBe("lore-book-1");
    expect(book.entries).toHaveLength(0);
    expect(book.meta?.name).toBe("测试世界");
  });
});
