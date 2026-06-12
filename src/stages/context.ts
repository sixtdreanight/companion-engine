/**
 * ContextStage — 系统提示词分层组装
 *
 * 合并 6 个来源: 时间/心情/情绪/记忆/反馈/关系阶段
 */

import type { AppConfig, Profile } from "../config.js";
import { logger } from "../utils.js";
import {
  buildSystemPrompt,
  buildTimeContext,
  getTodayMood,
  detectSadness,
  buildEmotionalSupportHint,
  buildCrisisHint,
  isConversationDying,
  suggestTopic,
  createSession,
  updateSession,
  shouldRemindBreak,
  buildBreakReminder,
  type SessionState,
} from "../girlfriend.js";
import { buildStageGuidance } from "../relationship.js";
import type { getOrCreateState, RelationshipState } from "../relationship.js";
import { buildFeedbackContext } from "../feedback.js";
import { buildMessageHistory, type MemoryContext, type LearnedInterest } from "../memory.js";
import { getModelStrategy } from "../model-strategy.js";
import {
  buildAuthorsNote,
  generateChatExamples,
  formatChatExamples,
  formatSystemPromptForModel,
} from "../model-tuning.js";
import { buildSensoryContext } from "../girlfriend.js";
import type { LoreBookEntry } from "../lore-book.js";

export interface ContextInput {
  userId: string;
  userMessage: string;
  profile: Profile;
  config: AppConfig;
  searchResults: string | undefined;
  memoryContext: MemoryContext;
  learnedInterests: LearnedInterest[];
  conversationSummary: string | undefined;
  relState: RelationshipState;
  /** Lore Book 激活条目（由 LoreBookManager.activate() 返回） */
  loreBeforeChar?: LoreBookEntry[];
  loreAfterChar?: LoreBookEntry[];
  loreAuthorNote?: LoreBookEntry[];
}

export interface ContextOutput {
  systemPrompt: string;
  session: SessionState;
  authorsNote: string | null;
  authorNotePosition: "system-start" | "pre-user";
}

/** 每个用户的会话状态（外部管理，避免模块级 Map） */
const sessions = new Map<string, SessionState>();

export function getSession(userId: string): SessionState {
  let session = sessions.get(userId);
  if (!session) {
    session = createSession();
    sessions.set(userId, session);
  }
  return session;
}

export async function contextStage(input: ContextInput): Promise<ContextOutput> {
  const {
    userId, userMessage, profile, config,
    searchResults, memoryContext, learnedInterests,
    conversationSummary, relState,
  } = input;

  // 1. 会话状态
  const session = getSession(userId);
  updateSession(session, userMessage);

  // 2. 时间 + 心情 + 感官记忆
  const timeContext = buildTimeContext(profile.user_timezone) + "\n" + buildSensoryContext(profile.user_timezone);
  const todayMood = getTodayMood();

  // 3. 情绪检测
  const emotion = detectSadness(userMessage);

  // 4. 冷场检测
  const recentUserMsgs = (await buildMessageHistory(userId, 5))
    .filter((m) => m.role === "user")
    .map((m) => m.content);
  const isDying = isConversationDying([...recentUserMsgs, userMessage]);

  // 5. 模型策略
  const strategy = getModelStrategy(config.ai.provider);

  // 6. Chat Examples (Layer 4)
  const examples = generateChatExamples(profile, strategy);
  const chatExamples = examples.length > 0 ? formatChatExamples(examples, strategy) : undefined;

  // 7. 构建系统提示词
  let systemPrompt = buildSystemPrompt(
    profile,
    timeContext,
    todayMood,
    memoryContext,
    learnedInterests.length > 0 ? learnedInterests : undefined,
    searchResults,
    undefined, // refusalContext
    session,
    conversationSummary,
    chatExamples,
  );

  // 8. 关系阶段行为指引
  if (relState.mode === "slow_burn") {
    const stageGuidance = buildStageGuidance(relState, profile);
    if (stageGuidance) systemPrompt += "\n\n" + stageGuidance;
  }

  // 9. 用户反馈上下文
  const feedbackCtx = await buildFeedbackContext(userId);
  if (feedbackCtx) systemPrompt += "\n\n" + feedbackCtx;

  // 10. 冷场话题引导
  if (isDying) {
    const topic = suggestTopic(profile, learnedInterests);
    systemPrompt += `\n\n对话有点冷场了。${topic}。如果觉得对方真的累了，就温柔地说'要不你去歇会儿吧'。不要勉强尬聊。`;
    logger.debug("检测到冷场，注入话题建议");
  }

  // 11. 防沉迷提醒
  if (shouldRemindBreak(session)) {
    systemPrompt += buildBreakReminder(profile.user_nickname, timeContext);
    logger.debug("防沉迷提醒");
  }

  // 12. 情绪支持
  if (emotion === "sad") {
    systemPrompt += buildEmotionalSupportHint(profile.user_nickname);
  } else if (emotion === "crisis") {
    systemPrompt += buildCrisisHint(profile.user_nickname);
    logger.warn(`用户 ${userId} 触发危机关键词`);
  }

  // 13. 模型格式化
  systemPrompt = formatSystemPromptForModel(systemPrompt, strategy);

  // 14. Lore Book 条目注入
  const { loreBeforeChar, loreAfterChar, loreAuthorNote } = input;
  if (loreBeforeChar && loreBeforeChar.length > 0) {
    const loreText = loreBeforeChar.map((e) => e.content).join("\n\n");
    systemPrompt = `[相关世界设定]\n${loreText}\n\n${systemPrompt}`;
    logger.debug(`注入 ${loreBeforeChar.length} 条 Lore Book (before_char)`);
  }
  if (loreAfterChar && loreAfterChar.length > 0) {
    const loreText = loreAfterChar.map((e) => e.content).join("\n\n");
    systemPrompt += `\n\n[补充设定]\n${loreText}`;
    logger.debug(`注入 ${loreAfterChar.length} 条 Lore Book (after_char)`);
  }

  // 15. Author's Note — 最高优先级指令，追加到系统提示词末尾
  let authorsNote = buildAuthorsNote(session, userMessage);
  if (loreAuthorNote && loreAuthorNote.length > 0) {
    const loreNote = loreAuthorNote.map((e) => e.content).join("\n\n");
    authorsNote = authorsNote ? `${authorsNote}\n\n${loreNote}` : loreNote;
  }
  if (authorsNote) {
    systemPrompt += "\n\n" + authorsNote;
  }

  return {
    systemPrompt,
    session,
    authorsNote,
    authorNotePosition: strategy.authorNotePosition,
  };
}
