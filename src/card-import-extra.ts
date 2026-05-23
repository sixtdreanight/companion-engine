/**
 * Card Import Extras — Character.AI 格式导入 + alternate_greetings 处理。
 *
 * 补充 card-import.ts 的功能：
 * 1. Character.AI 导出格式导入
 * 2. SillyTavern V3 alternate_greetings 处理
 * 3. PNG tEXt 块扩展（ccv3, st, chub）
 */

import type { Profile, CustomStyle } from "./config.js";

// ═══════════════════════════════════════════════════════
// Character.AI 格式
// ═══════════════════════════════════════════════════════

interface CAICharacter {
  participant__name?: string;
  greeting?: string;
  definition?: string;
  description?: string;
  title?: string;
  avatar_file_name?: string;
}

/**
 * 解析 Character.AI 导出格式 → Profile 片段。
 * C.AI 导出格式与 SillyTavern 不同：使用 participant__name, greeting, definition。
 */
export function parseCAICard(raw: string): Partial<Profile> | null {
  let data: CAICharacter;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  const name = data.participant__name || data.title || "";
  if (!name) return null;

  // definition 字段包含示例对话和描述
  const fullText = [
    data.definition,
    data.description,
    data.greeting,
  ].filter(Boolean).join("\n");

  // 从 C.AI greeting 提取开场白作为 speaking_style 参考
  const speakingStyle = data.greeting?.slice(0, 200) || "";
  const customStyle: CustomStyle = {};
  if (data.greeting) {
    customStyle.emoticons = data.greeting.slice(0, 500);
  }

  return {
    name,
    age: 0,
    city: "",
    occupation: "",
    education: "",
    major: "",
    hobbies: [],
    temperament: "温柔",
    speaking_style: speakingStyle,
    user_nickname: "",
    user_gender: "other",
    partner_gender: "female",
    relationship_type: "girlfriend",
    relationship_mode: "slow_burn",
    user_city: "",
    user_timezone: "Asia/Shanghai",
    opinions: {},
    daily_life: "",
    quirks: [],
    meme_style: "适中使用表情包",
    custom_style: customStyle.emoticons ? customStyle : undefined,
  };
}

// ═══════════════════════════════════════════════════════
// Alternate Greetings
// ═══════════════════════════════════════════════════════

/**
 * 从 SillyTavern V3 角色卡提取 alternate_greetings 作为可选开场白列表。
 * 用户可以在开始对话时选择一个开场白。
 */
export function extractGreetings(card: Record<string, unknown>): {
  main: string;
  alternates: string[];
} {
  const data = (card.data || card) as Record<string, unknown>;
  const main = (data.first_mes || data.greeting || "") as string;
  const alts = (data.alternate_greetings as string[]) || [];
  return { main, alternates: alts.filter(Boolean) };
}

// ═══════════════════════════════════════════════════════
// PNG tEXt 扩展
// ═══════════════════════════════════════════════════════

/**
 * PNG tEXt 块中可能包含角色卡的关键字。
 * 除了 'chara'，还有 'ccv3' (Character Card V3)、'st'、'chub'。
 */
export const CARD_TEX_KEYWORDS = ["chara", "ccv3", "st", "chub"] as const;
