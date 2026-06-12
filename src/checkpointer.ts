/**
 * Checkpointer — 持久化会话状态，替代内存 Map。
 *
 * 默认 JsonCheckpointer 将状态写入 JSON 文件，进程重启不丢失。
 * MemoryCheckpointer 用于测试。
 */

import { getDataRoot, sanitizePathId, getStorage } from "./config.js";
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
    this.dir = [getDataRoot(), "data", "checkpoints", safeNs].join("/").replace(/\/+/g, "/");
  }

  private filePath(key: string): string {
    return [this.dir, `${sanitizePathId(key)}.json`].join("/").replace(/\/+/g, "/");
  }

  async get(key: string): Promise<T | null> {
    const storage = getStorage();
    const path = this.filePath(key);
    if (!(await storage.exists(path))) return null;
    try {
      return JSON.parse(await storage.read(path)) as T;
    } catch {
      logger.warn("Checkpointer: failed to read %s", path);
      return null;
    }
  }

  async set(key: string, state: T): Promise<void> {
    const storage = getStorage();
    if (!(await storage.exists(this.dir))) await storage.mkdir(this.dir, { recursive: true });
    const path = this.filePath(key);
    await storage.writeAtomic(path, JSON.stringify(state, null, 2));
  }

  async delete(key: string): Promise<void> {
    const path = this.filePath(key);
    try {
      await getStorage().unlink(path);
    } catch { /* best effort */ }
  }

  async list(): Promise<string[]> {
    if (!(await getStorage().exists(this.dir))) return [];
    return (await getStorage().readdir(this.dir))
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
