/**
 * 消息处理管道 — 编排器
 *
 * 流程: PreProcess → Memory → Context → Generation → PostProcess
 *
 * 每个 stage 是独立可测试的纯函数（或注入依赖）。
 * 参考 Letta OS-style memory + LangGraph Checkpointer/Store 模式。
 */

import type { LanguageModel } from "ai";
import type { AppConfig, Profile } from "./config.js";
import { logger, recordPipelineMessage, recordPipelineError } from "./utils.js";
import { saveShortTerm } from "./memory.js";
import { splitForChat } from "./split.js";
import { preProcessStage } from "./stages/preprocess.js";

// ---- 速率限制 ----

const _msgTimestamps = new Map<string, number>();
const MIN_MSG_INTERVAL_MS = 500;

const RATE_LIMIT_MAX_ENTRIES = 10000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const last = _msgTimestamps.get(userId);
  if (last && now - last < MIN_MSG_INTERVAL_MS) return false;
  // Prevent unbounded map growth under sustained load
  if (_msgTimestamps.size > RATE_LIMIT_MAX_ENTRIES) {
    for (const [key, ts] of _msgTimestamps) {
      if (now - ts > 3600000) _msgTimestamps.delete(key); // 1h TTL
    }
  }
  _msgTimestamps.set(userId, now);
  return true;
}
import { memoryStage, type SummaryState } from "./stages/memory.js";
import { contextStage } from "./stages/context.js";
import { generationStage, createAIProvider } from "./stages/generation.js";
import { postProcessStage } from "./stages/postprocess.js";

import { Checkpointer, JsonCheckpointer } from "./checkpointer.js";

export { createAIProvider, splitForChat };

export interface PipelineContext {
  model: LanguageModel;
  config: AppConfig;
  profile: Profile;
  /** 可选的持久化 checkpointer，默认 JSON 文件 */
  checkpointer?: Checkpointer<SummaryState>;
}

/** 活跃会话 Track（用于 TTL 淘汰），独立于持久化存储 */
const _activeTimestamps = new Map<string, number>();

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_MAX = 100;

/** 默认 JSON 文件 checkpointer */
const _defaultCheckpointer = new JsonCheckpointer<SummaryState>("sessions");

function _getCheckpointer(ctx: PipelineContext): Checkpointer<SummaryState> {
  return ctx.checkpointer ?? _defaultCheckpointer;
}

export function cleanupSessions(): void {
  const now = Date.now();
  for (const [userId, ts] of _activeTimestamps) {
    if (now - ts > SESSION_TTL_MS) {
      _activeTimestamps.delete(userId);
    }
  }
  if (_activeTimestamps.size > SESSION_MAX) {
    const sorted = [..._activeTimestamps.entries()].sort((a, b) => a[1] - b[1]);
    for (const [userId] of sorted.slice(0, _activeTimestamps.size - SESSION_MAX)) {
      _activeTimestamps.delete(userId);
    }
  }
}

async function getSummaryState(
  userId: string,
  cp: Checkpointer<SummaryState>,
): Promise<SummaryState | undefined> {
  _activeTimestamps.set(userId, Date.now());
  const state = await cp.get(userId);
  return state ?? undefined;
}

async function setSummaryState(
  userId: string,
  state: SummaryState,
  cp: Checkpointer<SummaryState>,
): Promise<void> {
  _activeTimestamps.set(userId, Date.now());
  await cp.set(userId, state);
}

/**
 * 处理一条消息，返回 AI 生成的回复气泡数组
 *
 * 编排 5 个独立 stage:
 *   PreProcess → Memory → Context → Generation → PostProcess
 */
export async function processMessage(
  userId: string,
  userMessage: string,
  ctx: PipelineContext,
): Promise<string[]> {
  const { model, config, profile } = ctx;
  const cp = _getCheckpointer(ctx);
  const t0 = Date.now();

  if (!checkRateLimit(userId)) {
    logger.debug(`Rate limited: ${userId}`);
    return ["消息太快了，让我喘口气吧~"];
  }

  cleanupSessions();

  // Stage 1: PreProcess
  const t1 = Date.now();
  const pre = await preProcessStage({ userId, userMessage, model, config, profile });
  if (pre.earlyReturn !== null) {
    saveShortTerm(userId, userMessage, pre.earlyReturn);
    return splitForChat(pre.earlyReturn);
  }

  // Stage 2: Memory — 使用持久化 checkpointer
  const t2 = Date.now();
  const prevState = await getSummaryState(userId, cp);
  const mem = await memoryStage(
    { userId, userMessage, model, config },
    prevState,
  );
  await setSummaryState(userId, mem.summaryState, cp);

  // Stage 3-5: 同前
  const t3 = Date.now();
  const ctxOut = contextStage({
    userId, userMessage, profile, config,
    searchResults: pre.searchResults,
    memoryContext: mem.memoryContext,
    learnedInterests: mem.learnedInterests,
    conversationSummary: mem.conversationSummary,
    relState: pre.relState,
  });

  const t4 = Date.now();
  const gen = await generationStage({
    userMessage,
    systemPrompt: ctxOut.systemPrompt,
    history: mem.history,
    model,
    config,
    authorsNote: ctxOut.authorsNote,
    authorNotePosition: ctxOut.authorNotePosition,
  });

  const t5 = Date.now();
  const result = postProcessStage({
    userId,
    userMessage,
    reply: gen.reply,
    model,
    config,
    profile,
    totalTurns: mem.summaryState.totalTurns,
  });
  const t6 = Date.now();

  const totalMs = t6 - t0;
  logger.debug(
    `Pipeline: pre=${t2 - t1}ms mem=${t3 - t2}ms ctx=${t4 - t3}ms gen=${t5 - t4}ms post=${t6 - t5}ms total=${totalMs}ms`,
  );
  recordPipelineMessage(totalMs);

  return result;
}

/**
 * 流式消息处理 — 返回 token 级别的异步生成器。
 * 前 3 个阶段同步执行，Generation 阶段流式输出 token，
 * PostProcess 在流结束后执行记忆保存。
 */
export async function* processMessageStream(
  userId: string,
  userMessage: string,
  ctx: PipelineContext,
): AsyncGenerator<string, void, void> {
  const { model, config, profile } = ctx;
  const cp = _getCheckpointer(ctx);

  cleanupSessions();

  // Stage 1: PreProcess
  const pre = await preProcessStage({ userId, userMessage, model, config, profile });
  if (pre.earlyReturn !== null) {
    saveShortTerm(userId, userMessage, pre.earlyReturn);
    for (const bubble of splitForChat(pre.earlyReturn)) {
      yield bubble;
    }
    return;
  }

  // Stage 2: Memory
  const prevState = await getSummaryState(userId, cp);
  const mem = await memoryStage(
    { userId, userMessage, model, config },
    prevState,
  );
  await setSummaryState(userId, mem.summaryState, cp);

  // Stage 3: Context
  const ctxOut = contextStage({
    userId, userMessage, profile, config,
    searchResults: pre.searchResults,
    memoryContext: mem.memoryContext,
    learnedInterests: mem.learnedInterests,
    conversationSummary: mem.conversationSummary,
    relState: pre.relState,
  });

  // Stage 4: Generation — 流式
  let reply = "";
  try {
    const { streamText } = await import("ai");
    const result = streamText({
      model,
      system: ctxOut.systemPrompt,
      messages: [
        ...mem.history.map((t) => ({
          role: t.role as "user" | "assistant",
          content: t.content,
        })),
        { role: "user" as const, content: userMessage },
      ],
      maxOutputTokens: config.ai.maxTokens || 1024,
      temperature: config.ai.temperature || 0.85,
    });

    for await (const chunk of result.textStream) {
      reply += chunk;
      yield chunk;
    }
  } catch {
    const fallback = "呜...刚才走神了，再说一遍好吗？(｡•́︿•̀｡)";
    reply = fallback;
    yield fallback;
  }

  // Stage 5: PostProcess
  postProcessStage({
    userId,
    userMessage,
    reply,
    model,
    config,
    profile,
    totalTurns: mem.summaryState.totalTurns,
  });
}
