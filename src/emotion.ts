/**
 * EmotionModel — 状态化情绪模型，跨会话持久化。
 *
 * 对标 Inworld AI 的多维情绪系统，替代 girlfriend.ts 中的随机 getTodayMood()。
 * 情绪影响回复风格：开心→活泼，疲惫→简短，焦虑→更温柔。
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDataRoot, writeFileAtomic } from "./config.js";
import { getDateInTimezone, pickRandom } from "./utils.js";

// ---- 类型 ----

export type Emotion = "happy" | "neutral" | "sad" | "anxious" | "excited" | "tired" | "caring";

export interface EmotionState {
  current: Emotion;
  intensity: number;      // 0.0–1.0
  previous: Emotion;
  updatedAt: string;       // ISO timestamp
}

// ---- 情绪标签到风格映射 ----

const EMOTION_DESCRIPTIONS: Record<Emotion, string> = {
  happy:    "心情不错，回复比较活泼轻快",
  neutral:  "日常状态，回复自然随意",
  sad:      "有点低落，回复比较简短含蓄",
  anxious:  "有点不安，会比平时更在意对方的反应",
  excited:  "特别开心，回复热情洋溢",
  tired:    "有点累，回复简短慵懒",
  caring:   "很关心对方，回复温柔体贴",
};

const EMOTION_TRANSITIONS: Record<Emotion, Partial<Record<Emotion, number>>> = {
  happy:    { neutral: 0.3, excited: 0.2, caring: 0.2 },
  neutral:  { happy: 0.2, tired: 0.2, caring: 0.1, sad: 0.1 },
  sad:      { neutral: 0.3, caring: 0.3, anxious: 0.2 },
  anxious:  { neutral: 0.3, sad: 0.2, caring: 0.2 },
  excited:  { happy: 0.4, neutral: 0.3 },
  tired:    { neutral: 0.5, sad: 0.1 },
  caring:   { happy: 0.3, neutral: 0.3 },
};

// ═══════════════════════════════════════════════════════
// 情绪计算
// ═══════════════════════════════════════════════════════

/** 基于一天中的时间和星期创建初始情绪 */
export function createEmotionState(): EmotionState {
  const now = getDateInTimezone("Asia/Shanghai");
  const hour = now.getHours();
  const dayOfWeek = now.getDay();

  let current: Emotion = "neutral";

  if (hour < 7) current = "tired";
  else if (hour < 10 && dayOfWeek >= 1 && dayOfWeek <= 5) current = "neutral";
  else if (hour >= 14 && hour <= 17 && dayOfWeek >= 1 && dayOfWeek <= 5) current = "tired";
  else if (hour >= 20 && hour < 22) current = "happy";
  else if (hour >= 22 || hour < 2) current = "tired";

  return {
    current,
    intensity: 0.5,
    previous: "neutral",
    updatedAt: now.toISOString(),
  };
}

/** 基于对话内容更新情绪 */
export function updateEmotion(
  state: EmotionState,
  userMsg: string,
  sessionMessageCount: number,
): EmotionState {
  const now = new Date().toISOString();

  // 检测情绪信号
  const triggers = _detectEmotionTriggers(userMsg);

  let newEmotion: Emotion = state.current;
  let newIntensity = state.intensity;

  if (triggers.length > 0) {
    // 用户消息直接触发情绪变化
    newEmotion = triggers[0];
    newIntensity = Math.min(1.0, state.intensity + 0.2);
  } else {
    // 自然衰减
    newIntensity = Math.max(0.1, state.intensity - 0.05);

    // 概率性情绪漂移
    const transitions = EMOTION_TRANSITIONS[state.current];
    if (transitions) {
      const roll = Math.random();
      let cumulative = 0;
      for (const [target, prob] of Object.entries(transitions)) {
        cumulative += prob;
        if (roll < cumulative) {
          newEmotion = target as Emotion;
          break;
        }
      }
    }
  }

  // 长会话 → 趋近 tired
  if (sessionMessageCount > 50) {
    newEmotion = newEmotion === "excited" ? "happy" : "tired";
    newIntensity = Math.max(0.3, newIntensity - 0.1);
  }

  return {
    current: newEmotion,
    intensity: newIntensity,
    previous: state.current,
    updatedAt: now,
  };
}

/** 获取情绪对系统提示词的注入文本 */
export function getEmotionContext(state: EmotionState): string {
  const desc = EMOTION_DESCRIPTIONS[state.current];
  const intensityNote = state.intensity > 0.7
    ? "情绪比较强烈"
    : state.intensity < 0.3
    ? "情绪很淡"
    : "";
  return `当前情绪: ${desc}${intensityNote ? `（${intensityNote}）` : ""}。`;
}

/** 获取当前心情（替换旧的 getTodayMood） */
export function getCurrentMood(state?: EmotionState): string {
  if (!state) return pickRandom(["挺好的", "还不错，日常状态"]);

  const moods: Record<Emotion, string[]> = {
    happy:    ["心情不错，嘴角不自觉上扬", "今天挺开心的", "感觉一切都很好"],
    neutral:  ["日常状态", "普普通通的一天", "没啥特别的心情"],
    sad:      ["有点低落", "心情不是很好", "不太想说话但不想让你担心"],
    anxious:  ["有点心慌，不知道怎么了", "感觉不太安定", "有点想你了"],
    excited:  ["超级开心！", "今天太棒了", "开心到飞起"],
    tired:    ["有点困了揉揉眼睛", "刚忙完有点累", "好累呀"],
    caring:   ["突然很想关心你", "觉得你最近辛苦了", "想给你一个拥抱"],
  };

  return pickRandom(moods[state.current] || moods.neutral);
}

// ═══════════════════════════════════════════════════════
// 内部：情绪触发器
// ═══════════════════════════════════════════════════════

function _detectEmotionTriggers(msg: string): Emotion[] {
  const triggers: Emotion[] = [];

  const maps: [Emotion, string[]][] = [
    ["excited", ["太好了", "太棒", "哈哈", "笑死", "好开心", "耶"]],
    ["sad",     ["难过", "不开心", "伤心", "郁闷", "好烦", "崩溃", "想哭"]],
    ["anxious", ["担心", "害怕", "紧张", "不安", "压力", "焦虑"]],
    ["caring",  ["辛苦了", "谢谢你", "想你", "抱抱", "爱你", "暖心"]],
    ["tired",   ["好累", "困了", "熬夜", "加班", "睡吧"]],
    ["happy",   ["开心", "喜欢", "感动", "真好", "不错"]],
  ];

  for (const [emotion, keywords] of maps) {
    for (const kw of keywords) {
      if (msg.includes(kw)) {
        triggers.push(emotion);
        break;
      }
    }
  }

  return triggers;
}

// ---- 持久化 ----

function emotionPath() {
  return resolve(getDataRoot(), "data", "emotion-state.json");
}

export function saveEmotionState(state: EmotionState): void {
  writeFileAtomic(emotionPath(), JSON.stringify(state, null, 2));
}

export function loadEmotionState(): EmotionState | null {
  const path = emotionPath();
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as EmotionState;
  } catch {
    return null;
  }
}
