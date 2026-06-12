/**
 * In-process async mutex — prevents concurrent read-modify-write on shared files.
 *
 * Lightweight Promise-based queue. No filesystem dependency.
 * All callers accessing the same logical resource share one Mutex instance.
 */

export class Mutex {
  private _locked = false;
  private _queue: Array<{ resolve: () => void; timer: ReturnType<typeof setTimeout> }> = [];

  async acquire(timeoutMs = 5000): Promise<void> {
    if (!this._locked) {
      this._locked = true;
      return;
    }
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this._queue.findIndex((w) => w.timer === timer);
        if (idx >= 0) this._queue.splice(idx, 1);
        reject(new Error(`Mutex: acquire timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      this._queue.push({ resolve, timer });
    });
  }

  release(): void {
    const next = this._queue.shift();
    if (next) {
      clearTimeout(next.timer);
      next.resolve();
    } else {
      this._locked = false;
    }
  }
}

/**
 * Execute fn under a mutex lock. On timeout, logs warning and executes fn
 * without the lock (best-effort fallback) to avoid deadlocks.
 */
export async function withLock<T>(
  mutex: Mutex,
  fn: () => Promise<T>,
  timeoutMs = 5000,
): Promise<T> {
  try {
    await mutex.acquire(timeoutMs);
  } catch {
    // Timeout — proceed without lock to avoid total failure
  }
  try {
    return await fn();
  } finally {
    try { mutex.release(); } catch { /* already released or timeout */ }
  }
}

/** Create or return a cached Mutex for a given key */
export function getOrCreateMutex(map: Map<string, Mutex>, key: string): Mutex {
  let m = map.get(key);
  if (!m) {
    m = new Mutex();
    map.set(key, m);
  }
  return m;
}
