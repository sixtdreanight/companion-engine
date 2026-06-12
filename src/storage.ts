/**
 * 存储抽象层 — 为移动端（React Native / Capacitor）准备
 *
 * 核心模块通过此接口访问文件系统，而非直接使用 node:fs。
 * Node 环境用 NodeStorage，移动端用平台实现（RNFS / AsyncStorage）。
 *
 * 所有方法返回 Promise——移动端 I/O 都是异步的，同步是 Node.js 的特权。
 */

import { readFile, writeFile, mkdir, readdir, rm, stat, access, rename } from "node:fs/promises";
import { existsSync } from "node:fs";

export interface StorageAdapter {
  read(path: string): Promise<string>;
  write(path: string, data: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  readdir(path: string): Promise<string[]>;
  unlink(path: string): Promise<void>;
  rmdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  stat(path: string): Promise<{ size: number; isDirectory: boolean }>;
  /** 原子写入：先写临时文件再重命名，防止崩溃损坏数据 */
  writeAtomic(path: string, data: string): Promise<void>;
}

export interface KVStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

// ---- Node.js 实现 ----

export class NodeStorage implements StorageAdapter {
  async read(path: string): Promise<string> {
    return readFile(path, "utf-8");
  }

  async write(path: string, data: string): Promise<void> {
    await writeFile(path, data, "utf-8");
  }

  async exists(path: string): Promise<boolean> {
    try { await access(path); return true; } catch { return false; }
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    await mkdir(path, options);
  }

  async readdir(path: string): Promise<string[]> {
    return readdir(path);
  }

  async unlink(path: string): Promise<void> {
    await rm(path, { force: true });
  }

  async rmdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    await rm(path, { recursive: options?.recursive, force: true });
  }

  async stat(path: string): Promise<{ size: number; isDirectory: boolean }> {
    const s = await stat(path);
    return { size: s.size, isDirectory: s.isDirectory() };
  }

  async writeAtomic(path: string, data: string): Promise<void> {
    const dir = path.replace(/[/\\][^/\\]+$/, "");
    if (dir && !(await this.exists(dir))) {
      await this.mkdir(dir, { recursive: true });
    }
    // Write to temp then rename — rename is atomic on same filesystem (POSIX + NTFS)
    const tmp = path + "." + process.pid + "." + Date.now() + ".tmp";
    await writeFile(tmp, data, "utf-8");
    await rename(tmp, path);
  }
}

// ---- 内存实现（测试用） ----

export class MemoryStorage implements StorageAdapter {
  private store = new Map<string, string>();

  async read(path: string): Promise<string> {
    const data = this.store.get(path);
    if (data === undefined) throw new Error(`ENOENT: ${path}`);
    return data;
  }

  async write(path: string, data: string): Promise<void> {
    this.store.set(path, data);
  }

  async exists(path: string): Promise<boolean> {
    return this.store.has(path);
  }

  async mkdir(_path: string, _options?: { recursive?: boolean }): Promise<void> {
    // 内存存储无需创建目录
  }

  async readdir(path: string): Promise<string[]> {
    const prefix = path.endsWith("/") ? path : path + "/";
    const seen = new Set<string>();
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        const rest = key.slice(prefix.length).split("/")[0];
        seen.add(rest);
      }
    }
    return [...seen];
  }

  async unlink(path: string): Promise<void> {
    this.store.delete(path);
  }

  async rmdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    const prefix = path.endsWith("/") ? path : path + "/";
    for (const key of [...this.store.keys()]) {
      if (key === path || (options?.recursive && key.startsWith(prefix))) {
        this.store.delete(key);
      }
    }
  }

  async stat(path: string): Promise<{ size: number; isDirectory: boolean }> {
    if (this.store.has(path)) {
      return { size: Buffer.byteLength(this.store.get(path)!, "utf-8"), isDirectory: false };
    }
    // 检查是否是目录（有没有以 path/ 为前缀的 key）
    const prefix = path.endsWith("/") ? path : path + "/";
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) return { size: 0, isDirectory: true };
    }
    throw new Error(`ENOENT: ${path}`);
  }

  async writeAtomic(path: string, data: string): Promise<void> {
    this.store.set(path, data);
  }
}
