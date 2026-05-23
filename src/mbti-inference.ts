/**
 * MBTI Inference — 基于对话推断用户 MBTI 类型。
 *
 * 用户积累足够对话后，用 LLM 分析语言模式并推断 MBTI。
 * 结果注入 system prompt 作为个性化上下文。
 */

import type { Profile } from "./config.js";

// 16 MBTI 类型及简短描述
export const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
] as const;

export type MBTIType = typeof MBTI_TYPES[number];

export interface MBTIResult {
  type: MBTIType;
  confidence: number;       // 0-1
  traits: string[];         // 观察到的性格特征
  reasoning: string;        // 推断理由
}

const INFERENCE_PROMPT = `你是一个 MBTI 性格分析专家。基于以下对话记录，推断说话者的 MBTI 类型。

对话记录（用户的消息以 "用户:" 开头）:
{history}

请分析用户的语言模式、思维方式和社交风格，推断最可能的 MBTI 类型。

返回 JSON:
{
  "type": "INTJ",
  "confidence": 0.7,
  "traits": ["逻辑性强", "计划周密", "独立"],
  "reasoning": "用户倾向于系统化思考，喜欢提前规划..."
}`;

/**
 * 从对话历史推断 MBTI。
 * @param history 用户消息列表（只需用户侧）
 * @param generateText LLM 调用函数
 * @param minMessages 最少需要的消息数
 */
export async function inferMBTI(
  history: string[],
  generateText: (systemPrompt: string, userMessage: string) => Promise<string>,
  minMessages = 20,
): Promise<MBTIResult | null> {
  if (history.length < minMessages) return null;

  const sample = history.slice(-50); // 最多取最近 50 条
  const historyText = sample
    .map((msg, i) => `用户: ${msg.slice(0, 200)}`)
    .join("\n");

  const prompt = INFERENCE_PROMPT.replace("{history}", historyText);

  try {
    const raw = await generateText(prompt, "请分析以上对话记录中的用户 MBTI 类型。");
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const result = JSON.parse(jsonMatch[0]);
    if (!MBTI_TYPES.includes(result.type)) return null;

    return {
      type: result.type,
      confidence: Math.min(1, Math.max(0, result.confidence || 0.5)),
      traits: result.traits || [],
      reasoning: result.reasoning || "",
    };
  } catch {
    return null;
  }
}

/**
 * 将 MBTI 推断结果格式化为 system prompt 注入片段。
 */
export function formatMBTIContext(
  result: MBTIResult | null,
  userNickname: string,
): string {
  if (!result || result.confidence < 0.5) return "";

  const lines = [
    `根据我们的聊天，我觉得${userNickname}像是 ${result.type} 类型——`,
    result.reasoning,
    `（当然这只是我的感觉，不一定准啦~）`,
  ];

  return lines.join("");
}
