/**
 * Zod 运行时校验 — Profile、AppConfig 等核心类型。
 *
 * zod 已声明为 peerDependency，本模块提供实际的运行时校验，
 * 在配置加载时捕获损坏数据，避免 downstream 静默错误。
 */

import { z } from "zod";

// ---- Profile Schema ----

export const CustomStyleSchema = z.object({
  emoticons: z.string().optional(),
  verbal_tics: z.array(z.string()).optional(),
  catchphrases: z.array(z.string()).optional(),
  typing_quirks: z.string().optional(),
});

export const ProfileSchema = z.object({
  name: z.string().min(1, "角色名不能为空"),
  age: z.number().min(14, "年龄不能低于14岁").max(120),
  city: z.string().default(""),
  occupation: z.string().default(""),
  education: z.string().default(""),
  major: z.string().default(""),
  hobbies: z.array(z.string()).default([]),
  temperament: z.string().default("温柔"),
  speaking_style: z.string().default(""),
  user_nickname: z.string().min(1, "用户昵称不能为空"),
  user_gender: z.enum(["male", "female", "other"]),
  partner_gender: z.enum(["male", "female", "other"]),
  relationship_type: z.enum(["girlfriend", "boyfriend"]),
  relationship_mode: z.enum(["direct", "slow_burn"]),
  user_city: z.string().default(""),
  user_timezone: z.string().default("Asia/Shanghai"),
  opinions: z.record(z.string()).default({}),
  daily_life: z.string().default(""),
  quirks: z.array(z.string()).default([]),
  meme_style: z.string().default("适中使用表情包"),
  custom_style: CustomStyleSchema.optional(),
});

export type ValidatedProfile = z.infer<typeof ProfileSchema>;

// ---- AppConfig Schema ----

export const AIConfigSchema = z.object({
  provider: z.enum(["anthropic", "openai", "openai-compatible", "ollama"]),
  model: z.string().min(1),
  apiKey: z.string().default(""),
  baseUrl: z.string().optional(),
  maxTokens: z.number().int().positive().default(2048),
  temperature: z.number().min(0).max(2).default(0.85),
  backupProvider: z.enum(["anthropic", "openai", "openai-compatible", "ollama"]).optional(),
  backupModel: z.string().optional(),
  backupApiKey: z.string().optional(),
  backupBaseUrl: z.string().optional(),
});

export const AppConfigSchema = z.object({
  ai: AIConfigSchema,
  memory: z.object({
    maxHistoryTurns: z.number().int().positive().default(8),
    longTermExtractInterval: z.number().int().positive().default(20),
    maxFactsInContext: z.number().int().positive().default(5),
  }),
  contentFilter: z.enum(["strict", "moderate", "off"]).default("strict"),
  topicSelfCheck: z.boolean().default(false),
});

export type ValidatedAppConfig = z.infer<typeof AppConfigSchema>;

// ---- 校验函数 ----

export function validateProfileSchema(data: unknown): {
  success: true; profile: ValidatedProfile
} | {
  success: false; error: string
} {
  const result = ProfileSchema.safeParse(data);
  if (result.success) {
    return { success: true, profile: result.data };
  }
  return { success: false, error: result.error.issues.map((i) => i.message).join("; ") };
}

export function validateAppConfig(data: unknown): {
  success: true; config: ValidatedAppConfig
} | {
  success: false; error: string
} {
  const result = AppConfigSchema.safeParse(data);
  if (result.success) {
    return { success: true, config: result.data };
  }
  return { success: false, error: result.error.issues.map((i) => i.message).join("; ") };
}
