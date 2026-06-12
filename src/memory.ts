/**
 * 记忆系统 — 模拟人类的两层记忆
 *
 * 短期记忆: 最近 N 轮对话，像人的"刚才我们聊了什么"
 * 长期记忆: 反复提到的事实，像人的"我知道关于你的一些事"
 * 遗忘曲线: 不是无限完美记忆 — 久了不提就忘了
 */

import { getDataRoot, getStorage, sanitizePathId } from "./config.js";
import { logger, retry } from "./utils.js";

// ---- 类型 ----

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Fact {
  topic: string;
  content: string;
  mentions: number;
  firstMentioned: string;
  lastMentioned: string;
  /** high = 提到 5+ 次, medium = 3-4 次, low = 1-2 次 */
  confidence: "high" | "medium" | "low";
  /** 重要性评分 [0, 1]，初始 0.5，受反馈调整 */
  importance: number;
  /** 上次被检索/注入上下文的时间 */
  lastAccess: string;
}

export interface LongTermMemory {
  facts: Fact[];
  lastUpdated: string;
}

export interface MemoryContext {
  highConfidence: string[];
  mediumConfidence: string[];
}

// ---- 路径工具 ----

function convDir() { return [getDataRoot(), "data", "conversations"].join("/").replace(/\/+/g, "/"); }
function ltmPath() { return [getDataRoot(), "data", "long-term-memory.json"].join("/").replace(/\/+/g, "/"); }
function learnedPath() { return [getDataRoot(), "data", "learned-interests.json"].join("/").replace(/\/+/g, "/"); }

/** 确保数据目录存在 */
async function ensureDirs() {
  const storage = getStorage();
  const dir = convDir();
  if (!(await storage.exists(dir))) await storage.mkdir(dir, { recursive: true });
}

/**
 * 加载用户的短期对话历史
 * 返回最近 N 轮（由 maxTurns 参数限制）
 */
export async function loadShortTerm(userId: string, maxTurns: number): Promise<ConversationTurn[]> {
  const storage = getStorage();
  await ensureDirs();
  const safeId = sanitizePathId(userId);
  const filePath = [convDir(), `${safeId}.json`].join("/").replace(/\/+/g, "/");
  if (!(await storage.exists(filePath))) return [];

  try {
    const raw = await storage.read(filePath);
    const history: ConversationTurn[] = JSON.parse(raw);
    return history.slice(-maxTurns * 2);
  } catch {
    try {
      const backupPath = filePath + `.corrupted-${Date.now()}.json`;
      await storage.write(backupPath, await storage.read(filePath));
      await storage.unlink(filePath);
      logger.warn(`对话历史损坏，已备份至 ${backupPath}，从头开始`);
    } catch {
      logger.warn(`读取 ${userId} 对话历史失败，从头开始`);
    }
    return [];
  }
}

/**
 * 追加一轮对话到短期记忆
 * 安全做法：读取当前数组 → 追加新消息 → 原子写入
 */
export async function saveShortTerm(userId: string, userMsg: string, assistantMsg: string): Promise<void> {
  await ensureDirs();
  const safeId = sanitizePathId(userId);
  const filePath = [convDir(), `${safeId}.json`].join("/").replace(/\/+/g, "/");
  const now = new Date().toISOString();
  const userTurn = { role: "user" as const, content: userMsg, timestamp: now };
  const assistantTurn = { role: "assistant" as const, content: assistantMsg, timestamp: now };

  const history = await loadShortTerm(userId, 9999);
  history.push(userTurn, assistantTurn);
  await getStorage().writeAtomic(filePath, JSON.stringify(history, null, 2) + "\n");
}

/**
 * 移除最后一轮对话（user+assistant），返回被移除的用户消息。
 */
export async function removeLastTurn(userId: string): Promise<string | null> {
  await ensureDirs();
  const history = await loadShortTerm(userId, 9999);
  if (history.length < 2) return null;
  const lastAssistant = history[history.length - 1];
  const lastUser = history[history.length - 2];
  if (lastAssistant.role !== "assistant" || lastUser.role !== "user") return null;
  history.splice(-2, 2);
  const safeId = sanitizePathId(userId);
  await getStorage().writeAtomic([convDir(), `${safeId}.json`].join("/").replace(/\/+/g, "/"), JSON.stringify(history, null, 2));
  return lastUser.content;
}

/**
 * 加载最近 N 轮对话并转为 LLM 消息格式
 */
export async function buildMessageHistory(
  userId: string,
  maxTurns: number,
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  const history = await loadShortTerm(userId, maxTurns);
  return history.map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));
}

// ---- 对话摘要 ----

function summaryPath(userId: string) {
  const safeId = sanitizePathId(userId);
  return [convDir(), `${safeId}.summary.json`].join("/").replace(/\/+/g, "/");
}

export async function loadSummary(userId: string): Promise<string | null> {
  const storage = getStorage();
  await ensureDirs();
  const filePath = summaryPath(userId);
  if (!(await storage.exists(filePath))) return null;
  try {
    const data = JSON.parse(await storage.read(filePath));
    return data.summary || null;
  } catch {
    return null;
  }
}

export async function saveSummary(userId: string, summary: string): Promise<void> {
  await ensureDirs();
  await getStorage().writeAtomic(
    summaryPath(userId),
    JSON.stringify({ summary, updatedAt: new Date().toISOString() }, null, 2),
  );
}

// ---- 长期记忆 ----

/** 加载长期记忆 */
export async function loadLongTerm(): Promise<LongTermMemory> {
  const storage = getStorage();
  if (!(await storage.exists(ltmPath()))) {
    return { facts: [], lastUpdated: new Date().toISOString() };
  }
  try {
    return JSON.parse(await storage.read(ltmPath())) as LongTermMemory;
  } catch {
    return { facts: [], lastUpdated: new Date().toISOString() };
  }
}

/** 保存长期记忆 */
async function saveLongTerm(memory: LongTermMemory) {
  memory.lastUpdated = new Date().toISOString();
  await getStorage().writeAtomic(ltmPath(), JSON.stringify(memory, null, 2));
}

/**
 * 更新长期记忆中的事实
 */
export async function updateFact(topic: string, content: string) {
  const memory = await loadLongTerm();
  const existing = memory.facts.find(
    (f) => f.topic === topic || f.content.includes(content.slice(0, 10)),
  );

  if (existing) {
    existing.mentions += 1;
    existing.lastMentioned = new Date().toISOString();
    existing.content = content;
    if (existing.mentions >= 5) existing.confidence = "high";
    else if (existing.mentions >= 3) existing.confidence = "medium";
    else existing.confidence = "low";
    existing.importance = Math.min(1.0, (existing.importance ?? 0.5) + 0.05);
    logger.debug(`长期记忆更新: ${topic} (提及 ${existing.mentions} 次)`);
  } else {
    memory.facts.push({
      topic,
      content,
      mentions: 1,
      firstMentioned: new Date().toISOString(),
      lastMentioned: new Date().toISOString(),
      confidence: "low",
      importance: 0.5,
      lastAccess: new Date().toISOString(),
    });
    logger.debug(`长期记忆新增: ${topic}`);
  }

  await saveLongTerm(memory);
}

/**
 * 应用艾宾浩斯遗忘曲线
 */
export async function applyForgettingCurve() {
  const memory = await loadLongTerm();
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const SIXTY_DAYS = 60 * 24 * 60 * 60 * 1000;

  const before = memory.facts.length;

  memory.facts = memory.facts.filter((fact) => {
    const importance = fact.importance ?? 0.5;
    let scale = 1;
    if (importance > 0.7) scale = 2;
    else if (importance < 0.3) scale = 0.5;

    const degradeThreshold = THIRTY_DAYS * scale;
    const deleteThreshold = SIXTY_DAYS * scale;

    const lastMentioned = new Date(fact.lastMentioned).getTime();
    const elapsed = now - lastMentioned;

    if (elapsed > deleteThreshold) {
      logger.debug(`遗忘: ${fact.topic} (超过${Math.round(deleteThreshold / (24 * 60 * 60 * 1000))}天未提及, importance=${importance.toFixed(2)})`);
      return false;
    }
    if (elapsed > degradeThreshold && fact.confidence === "high") {
      fact.confidence = "medium";
      fact.importance = Math.max(0, importance - 0.1);
      logger.debug(`记忆降级: ${fact.topic} (超过${Math.round(degradeThreshold / (24 * 60 * 60 * 1000))}天未提及)`);
    }
    return true;
  });

  if (before !== memory.facts.length) {
    await saveLongTerm(memory);
  }
}

/**
 * 构建注入提示词的记忆上下文 — 三维评分排序
 */
export async function buildMemoryContext(maxFacts = 5, userQuery?: string): Promise<MemoryContext> {
  const memory = await loadLongTerm();
  const now = Date.now();

  const score = (f: Fact): number => {
    let relevance = 0.5;
    if (userQuery) {
      relevance = topicRelevance(f, userQuery);
    }
    const recency = expRecencyDecay(f.lastAccess || f.lastMentioned, now);
    const importance = f.importance ?? 0.5;
    return 0.4 * relevance + 0.3 * recency + 0.3 * importance;
  };

  const sorted = [...memory.facts].sort((a, b) => score(b) - score(a));

  const selectedHigh = sorted.filter((f) => f.confidence === "high").slice(0, maxFacts);
  const selectedMedium = sorted.filter((f) => f.confidence === "medium").slice(0, maxFacts);
  const selected = [...selectedHigh, ...selectedMedium];

  for (const fact of selected) {
    fact.lastAccess = new Date().toISOString();
  }
  if (selected.length > 0) await saveLongTerm(memory);

  return {
    highConfidence: selectedHigh.map((f) => f.content),
    mediumConfidence: selectedMedium.map((f) => f.content),
  };
}

/**
 * 多维度记忆评分 — 用于检索与当前查询最相关的记忆
 */
export async function scoreMemoryFacts(userId: string, query: string, topN = 5): Promise<Fact[]> {
  const memory = await loadLongTerm();
  const now = Date.now();

  const scored = memory.facts.map((fact) => {
    const relevance = topicRelevance(fact, query);
    const recency = expRecencyDecay(fact.lastAccess || fact.lastMentioned, now);
    const importance = fact.importance ?? 0.5;
    return { fact, score: 0.4 * relevance + 0.3 * recency + 0.3 * importance };
  });

  scored.sort((a, b) => b.score - a.score);

  const top = scored.slice(0, topN).map((s) => s.fact);
  for (const fact of top) {
    fact.lastAccess = new Date().toISOString();
  }
  if (top.length > 0) await saveLongTerm(memory);

  return top;
}

// ---- 评分辅助函数 ----

function topicRelevance(fact: Fact, query: string): number {
  const queryTokens = tokenize(query.toLowerCase());
  const factText = `${fact.topic} ${fact.content}`.toLowerCase();
  let matches = 0;
  for (const token of queryTokens) {
    if (factText.includes(token)) matches++;
  }
  if (matches === 0) return 0;
  const factTokens = new Set(tokenize(factText));
  const intersection = queryTokens.filter((t) => factTokens.has(t)).length;
  const union = new Set([...queryTokens, ...factTokens]).size;
  return union > 0 ? intersection / union : 0;
}

function tokenize(text: string): string[] {
  return text
    .split(/[\s,，。！？、；：""''「」【】《》（）\(\)]+/)
    .filter((t) => t.length > 0)
    .flatMap((t) => {
      if (/^[一-鿿]+$/.test(t) && t.length > 2) {
        const chars = [...t];
        const result: string[] = [t];
        for (let i = 0; i < chars.length - 1; i++) {
          result.push(chars[i] + chars[i + 1]);
        }
        return result;
      }
      return [t];
    });
}

function expRecencyDecay(lastTimestamp: string, now: number): number {
  const lastTime = new Date(lastTimestamp).getTime();
  const daysAgo = (now - lastTime) / (24 * 60 * 60 * 1000);
  const lambda = 0.05;
  return Math.exp(-lambda * daysAgo);
}

// ---- 重要性调整（反馈闭环） ----

export async function deleteFact(topic: string): Promise<void> {
  const memory = await loadLongTerm();
  const before = memory.facts.length;
  memory.facts = memory.facts.filter((f) => f.topic !== topic);
  if (memory.facts.length !== before) {
    memory.lastUpdated = new Date().toISOString();
    await getStorage().writeAtomic(ltmPath(), JSON.stringify(memory, null, 2));
    logger.debug(`记忆删除: ${topic}`);
  }
}

export async function adjustFactImportance(
  topic: string,
  delta: number,
  newContent?: string,
): Promise<void> {
  const memory = await loadLongTerm();
  const fact = memory.facts.find(
    (f) => f.topic === topic || f.content.includes(topic.slice(0, 10)),
  );
  if (!fact) return;

  fact.importance = Math.max(0, Math.min(1, (fact.importance ?? 0.5) + delta));
  if (newContent) {
    fact.content = newContent;
    fact.mentions += 1;
    fact.lastMentioned = new Date().toISOString();
  }
  fact.lastAccess = new Date().toISOString();

  await saveLongTerm(memory);
  logger.debug(`记忆重要性调整: ${topic} ${delta >= 0 ? "+" : ""}${delta} → ${fact.importance.toFixed(2)}`);
}

export async function extractFactsFromConversation(
  userId: string,
  generateText: (prompt: string) => Promise<string>,
) {
  const history = await loadShortTerm(userId, 50);
  if (history.length < 6) return;

  const conversationText = history
    .map((t) => `[${t.role === "user" ? "用户" : "伴侣"}]: ${t.content}`)
    .join("\n");

  const extractionPrompt = `请从以下对话中提取关于"用户"的值得长期记住的事实。
只提取提及了 2 次以上的信息。每条事实一句话概括。

对话:
${conversationText}

请以 JSON 数组格式输出，每个元素包含 topic（话题）和 content（事实内容）两个字段。
只输出 JSON 数组，不要其他内容。
如果没有值得记录的事实，输出空数组 []。

示例输出:
[{"topic": "用户的工作", "content": "在字节跳动做后端开发"}, {"topic": "用户喜欢的游戏", "content": "最近在玩塞尔达传说"}]`;

  try {
    const result = await retry(() => generateText(extractionPrompt));
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const facts: { topic: string; content: string }[] = JSON.parse(jsonMatch[0]);
    for (const fact of facts) {
      await updateFact(fact.topic, fact.content);
    }
    logger.info(`从对话中提取了 ${facts.length} 条事实`);
  } catch (err) {
    logger.warn("事实提取失败:", err);
  }
}

// ---- 渐进式学习 ----

export interface LearnedInterest {
  topic: string;
  herAngle: string;
  learnedPhrases: string[];
  depth: "shallow" | "moderate";
}

export interface LearnedInterests {
  interests: LearnedInterest[];
  rejected: { topic: string; reason: string }[];
}

export async function loadLearnedInterests(): Promise<LearnedInterests> {
  const storage = getStorage();
  if (!(await storage.exists(learnedPath()))) {
    return { interests: [], rejected: [] };
  }
  try {
    return JSON.parse(await storage.read(learnedPath())) as LearnedInterests;
  } catch {
    return { interests: [], rejected: [] };
  }
}

async function saveLearnedInterests(data: LearnedInterests) {
  await getStorage().writeAtomic(learnedPath(), JSON.stringify(data, null, 2));
}

export async function analyzeUserInterests(
  userId: string,
  profile: { name: string; temperament: string; hobbies: string[]; occupation: string },
  generateText: (prompt: string) => Promise<string>,
) {
  const history = await loadShortTerm(userId, 80);
  if (history.length < 20) return;

  const conversationText = history
    .map((t) => `[${t.role === "user" ? "他" : "她"}]: ${t.content}`)
    .join("\n");

  const current = await loadLearnedInterests();

  const prompt = `请分析以下对话中用户反复提到的话题。

女友的人设: ${profile.name}, ${profile.temperament}, 爱好${profile.hobbies.join("/")}, 职业${profile.occupation}。

对话:
${conversationText}

请找出用户频繁提到（2次以上）的话题。
对于每个话题，判断女友是否应该去了解它。判断标准：
- 如果话题和女友的人设、爱好、职业方向完全相反——不学（如: 女友讨厌投机但用户常聊炒股）
- 如果可以从女友自己的角度去理解——学习（如: 女友是设计师，可以欣赏用户玩的游戏的美术风格）
- 如果女友的爱好/专业确实相关——学习

输出 JSON 格式（只输出 JSON 数组，不要其他内容）:
[{"topic": "话题", "action": "learn", "her_angle": "女友怎么从自己的角度去理解和参与这个话题"}, ...]

action 为 "learn" 或 "reject"。对于 reject，在 her_angle 中说明原因。
如果没有值得关注的话题，输出 [].

示例:
[{"topic": "独立游戏开发", "action": "learn", "her_angle": "虽然我不懂写代码，但喜欢听他聊游戏设计里的美术和视觉部分"}]`;

  try {
    const result = await retry(() => generateText(prompt));
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const items: { topic: string; action: string; her_angle: string }[] =
      JSON.parse(jsonMatch[0]);

    for (const item of items) {
      if (
        current.interests.some((i) => i.topic === item.topic) ||
        current.rejected.some((r) => r.topic === item.topic)
      ) {
        continue;
      }

      if (item.action === "learn") {
        current.interests.push({
          topic: item.topic,
          herAngle: item.her_angle,
          learnedPhrases: [],
          depth: "shallow",
        });
        logger.info(`新学习兴趣: ${item.topic}`);
      } else {
        current.rejected.push({
          topic: item.topic,
          reason: item.her_angle,
        });
        logger.debug(`拒绝学习: ${item.topic}`);
      }
    }

    if (items.length > 0) await saveLearnedInterests(current);
  } catch (err) {
    logger.warn("兴趣分析失败:", err);
  }
}
