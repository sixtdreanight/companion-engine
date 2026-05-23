/**
 * Checkpointer — 持久化会话状态，替代内存 Map。
 *
 * 默认 JsonCheckpointer 将状态写入 JSON 文件，进程重启不丢失。
 * MemoryCheckpointer 用于测试。
 */

import {
  readFileSync, writeFileSync, renameSync,
  existsSync, mkdirSync, unlinkSync, readdirSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { getDataRoot, sanitizePathId } from "./config.js";
import { logger } from "./utils.js";

export interface Checkpointer<T = unknown> {
  /** 加载指定 key 的状态，不存在则返回 null */
  get(key: string): Promise<T | null>;
  /** 保存状态 */
  set(key: string, state: T): Promise<void>;
  /** 删除状态 */
  delete(key: string): Promise<void>;
  /** 列出所有 key */
  list(): Promise<string[]>;
}

// ---- JSON 文件实现（默认） ----

export class JsonCheckpointer<T = unknown> implements Checkpointer<T> {
  private dir: string;

  constructor(namespace: string) {
    const safeNs = sanitizePathId(namespace);
    this.dir = resolve(getDataRoot(), "data", "checkpoints", safeNs);
  }

  private filePath(key: string): string {
    return resolve(this.dir, `${sanitizePathId(key)}.json`);
  }

  async get(key: string): Promise<T | null> {
    const path = this.filePath(key);
    if (!existsSync(path)) return null;
    try {
      return JSON.parse(readFileSync(path, "utf-8")) as T;
    } catch {
      logger.warn("Checkpointer: failed to read %s", path);
      return null;
    }
  }

  async set(key: string, state: T): Promise<void> {
    if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true });
    const path = this.filePath(key);
    const tmp = path + ".tmp." + Date.now();
    writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
    renameSync(tmp, path);
  }

  async delete(key: string): Promise<void> {
    const path = this.filePath(key);
    try {
      if (existsSync(path)) unlinkSync(path);
    } catch { /* best effort */ }
  }

  async list(): Promise<string[]> {
    if (!existsSync(this.dir)) return [];
    return readdirSync(this.dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""));
  }
}

// ---- 内存实现（测试用） ----

export class MemoryCheckpointer<T = unknown> implements Checkpointer<T> {
  private store = new Map<string, T>();

  async get(key: string): Promise<T | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, state: T): Promise<void> {
    this.store.set(key, state);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(): Promise<string[]> {
    return [...this.store.keys()];
  }
}
