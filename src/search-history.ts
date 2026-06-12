/**
 * 聊天记录全文搜索
 * 遍历 data/conversations/*.json，匹配消息内容
 */

import { getDataRoot, getStorage } from "./config.js";
import type { ConversationTurn } from "./memory.js";

export interface SearchHit {
  userId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  /** 匹配所在的内容片段（前后若干字） */
  snippet: string;
}

export async function searchConversations(query: string): Promise<SearchHit[]> {
  if (!query || query.trim().length < 2) return [];

  const storage = getStorage();
  const convDir = [getDataRoot(), "data", "conversations"].join("/").replace(/\/+/g, "/");
  if (!(await storage.exists(convDir))) return [];

  const hits: SearchHit[] = [];
  const q = query.toLowerCase();
  const files = (await storage.readdir(convDir)).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const userId = file.replace(".json", "");
    const filePath = [convDir, file].join("/").replace(/\/+/g, "/");
    try {
      const raw = await storage.read(filePath);
      const turns = JSON.parse(raw) as ConversationTurn[];
      for (const turn of turns) {
        const content = turn.content || "";
        if (content.toLowerCase().includes(q)) {
          const idx = content.toLowerCase().indexOf(q);
          const start = Math.max(0, idx - 30);
          const end = Math.min(content.length, idx + q.length + 30);
          const snippet = (start > 0 ? "..." : "") + content.slice(start, end) + (end < content.length ? "..." : "");
          hits.push({
            userId,
            role: turn.role,
            content,
            timestamp: turn.timestamp || "",
            snippet,
          });
        }
      }
    } catch {
      // skip corrupted files
    }
  }

  // 按时间倒序
  hits.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return hits.slice(0, 50);
}
