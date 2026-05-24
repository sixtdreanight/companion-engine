/**
 * Lore Book 系统 — 世界书/设定集
 *
 * 受 SillyTavern 的 World Info / Lorebook 启发。
 * 在对话中根据关键词或上下文自动激活相关世界设定条目，
 * 注入到 system prompt 中，增强角色扮演的深度和一致性。
 */

import { logger } from "./utils.js";

// ---- 类型定义 ----

export interface LoreBookEntry {
  /** 条目标识 */
  key: string;
  /** 注入到 prompt 的内容 */
  content: string;
  /** 触发关键词列表（支持 AND 逻辑用 & 连接） */
  keywords: string[];
  /** 正则触发模式（可选） */
  regex?: string;
  /** 是否始终激活（忽略关键词/正则） */
  alwaysOn: boolean;
  /** 优先级（数字越大越靠前，默认 0） */
  priority: number;
  /** 触发概率 [0, 1]，默认 1（总是触发） */
  probability: number;
  /** 递归激活深度（条目触发后扫描其 content 中的关键词激活其他条目） */
  recursiveDepth: number;
  /** 在 prompt 中的位置：before_char / after_char / author_note */
  position: "before_char" | "after_char" | "author_note";
  /** 是否禁用（可临时关闭某个条目） */
  disabled: boolean;
  /** 条目所属的组/分类（用于组织管理） */
  group: string;
  /** 备注/注释 */
  comment: string;
}

export interface LoreBook {
  /** 格式版本 */
  format: "lore-book-1";
  /** 条目列表 */
  entries: LoreBookEntry[];
  /** 元数据 */
  meta?: {
    name?: string;
    description?: string;
    created?: string;
  };
}

// ---- 默认值 ----

function defaultEntry(overrides?: Partial<LoreBookEntry>): LoreBookEntry {
  return {
    key: "",
    content: "",
    keywords: [],
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

// ---- LoreBook 管理器 ----

export class LoreBookManager {
  private book: LoreBook;

  constructor(book?: LoreBook) {
    this.book = book ?? { format: "lore-book-1", entries: [] };
  }

  /** 获取当前 lore book */
  getBook(): LoreBook {
    return this.book;
  }

  /** 添加/更新条目 */
  setEntry(entry: LoreBookEntry): void {
    const idx = this.book.entries.findIndex((e) => e.key === entry.key);
    if (idx >= 0) {
      this.book.entries[idx] = entry;
    } else {
      this.book.entries.push(entry);
    }
  }

  /** 删除条目 */
  removeEntry(key: string): boolean {
    const before = this.book.entries.length;
    this.book.entries = this.book.entries.filter((e) => e.key !== key);
    return this.book.entries.length < before;
  }

  /**
   * 根据用户消息和当前上下文，返回需要激活的 lore 条目
   *
   * @param userMessage 用户最新消息
   * @param historyText 最近对话的合并文本（用于正则匹配）
   * @returns 排序后的激活条目（before_char, after_char, author_note 分别分组）
   */
  activate(
    userMessage: string,
    historyText: string = "",
  ): {
    beforeChar: LoreBookEntry[];
    afterChar: LoreBookEntry[];
    authorNote: LoreBookEntry[];
  } {
    const combined = userMessage + "\n" + historyText;
    const activeEntries = this.findActive(combined, 0, new Set());

    const sorted = activeEntries.sort((a, b) => b.priority - a.priority);

    return {
      beforeChar: sorted.filter((e) => e.position === "before_char"),
      afterChar: sorted.filter((e) => e.position === "after_char"),
      authorNote: sorted.filter((e) => e.position === "author_note"),
    };
  }

  /**
   * 递归查找激活的条目
   */
  private findActive(
    text: string,
    depth: number,
    visited: Set<string>,
  ): LoreBookEntry[] {
    const results: LoreBookEntry[] = [];

    for (const entry of this.book.entries) {
      if (entry.disabled) continue;
      if (visited.has(entry.key)) continue;

      if (this.matches(entry, text)) {
        visited.add(entry.key);
        results.push(entry);

        // 递归激活：扫描条目的 content 和 keywords 是否能触发更深层的条目
        if (entry.recursiveDepth > depth) {
          const entryText = entry.content + " " + entry.keywords.join(" ");
          const deeper = this.findActive(entryText, depth + 1, visited);
          results.push(...deeper);
        }
      }
    }

    return results;
  }

  /**
   * 检查条目是否匹配文本
   */
  private matches(entry: LoreBookEntry, text: string): boolean {
    if (entry.alwaysOn) {
      return Math.random() < entry.probability;
    }

    let matched = false;

    // 关键词匹配
    if (entry.keywords.length > 0) {
      matched = entry.keywords.every((kw) => {
        if (kw.includes("&")) {
          // AND 逻辑：& 分隔的子关键词必须全部出现
          return kw.split("&").every((sub) =>
            text.toLowerCase().includes(sub.trim().toLowerCase()),
          );
        }
        return text.toLowerCase().includes(kw.toLowerCase());
      });
    }

    // 正则匹配
    if (!matched && entry.regex) {
      try {
        matched = new RegExp(entry.regex, "i").test(text);
      } catch {
        logger.warn(`Lore book regex error for entry "${entry.key}": ${entry.regex}`);
      }
    }

    // 概率过滤
    if (matched && entry.probability < 1) {
      matched = Math.random() < entry.probability;
    }

    return matched;
  }

  /**
   * 格式化激活条目为 prompt 文本
   */
  formatForPrompt(
    entries: LoreBookEntry[],
    label: string = "相关设定",
  ): string {
    if (entries.length === 0) return "";

    const lines = [`[${label}]`];
    for (const entry of entries) {
      lines.push(entry.content);
    }
    return lines.join("\n");
  }
}

// ---- SillyTavern 导入 ----

export interface STLoreBookEntry {
  key?: string;
  content?: string;
  keys?: string[] | string;
  extensions?: Record<string, unknown>;
  enabled?: boolean;
  priority?: number;
  probability?: number;
  depth?: number;
  position?: string;
  comment?: string;
  group?: string;
}

export interface STLoreBook {
  entries?: Record<string, STLoreBookEntry>;
}

/**
 * 从 SillyTavern V1/V2/V3 lorebook JSON 导入
 */
export function importSTLoreBook(json: STLoreBook): LoreBook {
  const entries: LoreBookEntry[] = [];

  if (json.entries) {
    for (const [key, raw] of Object.entries(json.entries)) {
      const keywords: string[] = [];
      if (typeof raw.keys === "string") {
        keywords.push(...raw.keys.split(",").map((k) => k.trim()).filter(Boolean));
      } else if (Array.isArray(raw.keys)) {
        keywords.push(...raw.keys);
      }

      let position: LoreBookEntry["position"] = "before_char";
      if (raw.position === "after_char") position = "after_char";
      else if (raw.position === "author_note" || raw.position === "chat_start") position = "author_note";

      entries.push(defaultEntry({
        key: raw.key ?? key,
        content: raw.content ?? "",
        keywords,
        priority: raw.priority ?? 0,
        probability: raw.probability ?? 1,
        recursiveDepth: raw.depth ?? 0,
        position,
        disabled: raw.enabled === false,
        group: raw.group ?? "",
        comment: raw.comment ?? "",
      }));
    }
  }

  return { format: "lore-book-1", entries };
}

/**
 * 创建空 LoreBook
 */
export function createEmptyLoreBook(name?: string): LoreBook {
  return {
    format: "lore-book-1",
    entries: [],
    meta: name ? { name, created: new Date().toISOString() } : undefined,
  };
}
