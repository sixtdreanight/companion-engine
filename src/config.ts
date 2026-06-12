import { randomBytes } from "node:crypto";
import { parse as dotenvParse } from "dotenv";
import { logger } from "./utils.js";
import { NodeStorage, type StorageAdapter, type KVStore } from "./storage.js";

// Lazy-load electron safeStorage for OS keychain encryption.
// Wrapped in a function to avoid static analysis by bundlers (Rollup/Vite)
// which would fail on `await import("electron")` outside an Electron context.
let _safeStorage: typeof import("electron").safeStorage | null = null;
let _safeStorageLoaded = false;
async function getSafeStorage() {
  if (_safeStorageLoaded) return _safeStorage;
  _safeStorageLoaded = true;
  try {
    const electron = await (Function("return import('electron')")()) as typeof import("electron");
    _safeStorage = electron.safeStorage;
  } catch { /* not in Electron */ }
  return _safeStorage;
}

// ---- 类型定义 ----

/** 用户的性别 */
export type UserGender = "male" | "female" | "other";

/** 关系类型: 女友还是男友 */
export type RelationshipType = "girlfriend" | "boyfriend";

/** 关系模式 */
export type RelationshipMode = "direct" | "slow_burn";

/** 养成模式的关系阶段 */
export type RelationshipStage =
  | "stranger"      // 刚认识
  | "friend"        // 朋友
  | "close_friend"  // 好朋友
  | "crush"         // 暧昧期
  | "lover";        // 恋人

export interface Profile {
  name: string;
  age: number;
  city: string;
  occupation: string;
  education: string;
  major: string;
  hobbies: string[];
  temperament: string;
  speaking_style: string;
  /** 用户怎么被称呼 */
  user_nickname: string;
  /** 用户的性别 */
  user_gender: UserGender;
  /** 伴侣的性别 */
  partner_gender: UserGender;
  /** 伴侣是女友还是男友 */
  relationship_type: RelationshipType;
  /** 关系模式: 直接情侣 / 养成模式 */
  relationship_mode: RelationshipMode;
  /** 用户所在城市（用于地区相关话题） */
  user_city: string;
  user_timezone: string;
  opinions: Record<string, string>;
  daily_life: string;
  quirks: string[];
  meme_style: string;
  custom_style?: CustomStyle;
}

export interface CustomStyle {
  emoticons?: string;
  verbal_tics?: string[];
  catchphrases?: string[];
  typing_quirks?: string;
}

export interface AIConfig {
  provider: "anthropic" | "openai" | "openai-compatible" | "ollama";
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxTokens: number;
  temperature: number;
  backupProvider?: "anthropic" | "openai" | "openai-compatible" | "ollama";
  backupModel?: string;
  backupApiKey?: string;
  backupBaseUrl?: string;
}

export interface QQConfig {
  wsUrl: string;
  accessToken: string;
  reconnectIntervalMs: number;
}

export interface WeChatConfig {
  baseUrl: string;
  fileUrl: string;
  token?: string;
  appid?: string;
}

export interface AppConfig {
  ai: AIConfig;
  qq: QQConfig;
  wechat: WeChatConfig;
  memory: {
    maxHistoryTurns: number;
    longTermExtractInterval: number;
    maxFactsInContext: number;
  };
  contentFilter: "strict" | "moderate" | "off";
  topicSelfCheck: boolean;
  /** Optional: enable LLM-based safety checker (slow but more accurate) */
  safety?: {
    useLlmChecker?: boolean;
  };
}

const __dirname_pattern = "/src";

let _dataRoot: string | null = null;

// ---- 平台适配器注入 ----

let _storage: StorageAdapter = new NodeStorage();
let _kvstore: KVStore | null = null;

export function setStorageAdapter(adapter: StorageAdapter): void { _storage = adapter; }
export function getStorage(): StorageAdapter { return _storage; }
export function setKVStore(store: KVStore): void { _kvstore = store; }
export function getKVStore(): KVStore {
  if (!_kvstore) throw new Error("KVStore not set — call setKVStore() before using KV operations");
  return _kvstore;
}

/** 构建数据目录下的绝对路径（纯字符串操作，不依赖 node:path） */
function dataPath(...segments: string[]): string {
  const root = _dataRoot ?? ".";
  return [root, ...segments].join("/").replace(/\/+/g, "/");
}

export async function initDataRoot(path: string): Promise<void> {
  if (_dataRoot !== null) {
    logger.warn("Data root already initialized, ignoring");
    return;
  }
  _dataRoot = path;
  await loadEnvFile(path);
}

export function getDataRoot(): string {
  if (_dataRoot !== null) return _dataRoot;
  return "."; // fallback: current directory
}

const VALID_PROVIDERS = ["anthropic", "openai", "openai-compatible", "ollama"] as const;

/**
 * Load .env from data root into process.env (only keys not already set by system)
 *
 * 安全警告: 在 Electron 中，任何有权限的扩展或渲染进程代码都能读取 process.env。
 * 生产环境应考虑使用 electron.safeStorage 加密存储敏感值（如 API key），
 * 并在运行时解密后注入，而非将其放在 .env / process.env 中。
 */
async function loadEnvFile(dataRoot: string): Promise<void> {
  const storage = getStorage();
  const envPath = dataPath(dataRoot, ".env");
  if (!(await storage.exists(envPath))) return;
  try {
    const content = await storage.read(envPath);
    const parsed = dotenvParse(content);
    for (const [key, value] of Object.entries(parsed)) {
      if (value) {
        process.env[key] = value;
      }
    }
    /** 检查是否加载了敏感字段 */
    if (parsed.AI_API_KEY || parsed.ANTHROPIC_API_KEY || parsed.OPENAI_API_KEY) {
      if (!(await getSafeStorage())?.isEncryptionAvailable?.()) {
        logger.warn(
          "CRITICAL: API key stored in plaintext. Install electron.safeStorage or use OS keychain for production.",
        );
      }
    }
    logger.info(`Loaded .env from ${envPath}`);
  } catch (err) {
    logger.error(`Failed to load .env from ${envPath}:`, err);
  }
}

/** Re-read .env from current data root — picks up runtime config changes */
export async function reloadEnv(): Promise<void> {
  await loadEnvFile(getDataRoot());
}

/** Write env values to .env in data root */
export async function writeEnvFile(partial: {
  ai?: Partial<AIConfig>;
  qq?: Partial<QQConfig>;
  wechat?: Partial<WeChatConfig>;
  contentFilter?: AppConfig["contentFilter"];
}): Promise<void> {
  const storage = getStorage();
  const envPath = dataPath(getDataRoot(), ".env");
  let content = "";
  if (await storage.exists(envPath)) {
    content = await storage.read(envPath);
  }
  const setEnv = (key: string, value: string | undefined) => {
    if (value === undefined) return;
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^${escapedKey}=.*`, "m");
    if (re.test(content)) {
      content = content.replace(re, `${key}=${value}`);
    } else {
      content = content.endsWith("\n") ? content : content + "\n";
      content += `${key}=${value}\n`;
    }
  };
  if (partial.ai) {
    setEnv("AI_PROVIDER", partial.ai.provider);
    setEnv("AI_MODEL", partial.ai.model);
    setEnv("AI_API_KEY", partial.ai.apiKey);
    if (partial.ai.baseUrl) setEnv("AI_BASE_URL", partial.ai.baseUrl);
    if (partial.ai.maxTokens !== undefined) setEnv("AI_MAX_TOKENS", String(partial.ai.maxTokens));
    if (partial.ai.temperature !== undefined) setEnv("AI_TEMPERATURE", String(partial.ai.temperature));
    if (partial.ai.backupProvider) setEnv("AI_BACKUP_PROVIDER", partial.ai.backupProvider);
    if (partial.ai.backupModel) setEnv("AI_BACKUP_MODEL", partial.ai.backupModel);
    if (partial.ai.backupApiKey) setEnv("AI_BACKUP_API_KEY", partial.ai.backupApiKey);
    if (partial.ai.backupBaseUrl) setEnv("AI_BACKUP_BASE_URL", partial.ai.backupBaseUrl);
  }
  if (partial.qq) {
    setEnv("QQ_WS_URL", partial.qq.wsUrl);
    setEnv("QQ_ACCESS_TOKEN", partial.qq.accessToken);
  }
  if (partial.wechat) {
    setEnv("WECHAT_BASE_URL", partial.wechat.baseUrl);
    setEnv("WECHAT_FILE_URL", partial.wechat.fileUrl);
    if (partial.wechat.token) setEnv("WECHAT_TOKEN", partial.wechat.token);
    if (partial.wechat.appid) setEnv("WECHAT_APPID", partial.wechat.appid);
  }
  if (partial.contentFilter) {
    setEnv("CONTENT_FILTER", partial.contentFilter);
  }
  await storage.writeAtomic(envPath, content);
  await reloadEnv();
}

/** 默认配置，提供所有 fallback 值 */
const DEFAULTS: Partial<AppConfig> = {
  memory: {
    maxHistoryTurns: 8,
    longTermExtractInterval: 20,
    maxFactsInContext: 5,
  },
  contentFilter: "strict",
  topicSelfCheck: false,
};

// ---- 加载函数 ----

/** Validate provider string against allowed values */
function validateProvider(raw: string | undefined, fallback: AIConfig["provider"]): AIConfig["provider"] {
  if (!raw) return fallback;
  if (VALID_PROVIDERS.includes(raw as typeof VALID_PROVIDERS[number])) {
    return raw as AIConfig["provider"];
  }
  logger.warn(`Invalid AI_PROVIDER "${raw}", falling back to "${fallback}"`);
  return fallback;
}

/** 从 .env 加载 AI、QQ 和微信配置 */
async function loadEnvConfig(): Promise<{ ai: AIConfig; qq: QQConfig; wechat: WeChatConfig }> {
  const provider = validateProvider(process.env.AI_PROVIDER, "anthropic");
  const model = process.env.AI_MODEL || "claude-sonnet-4-20250514";
  // SECURITY: process.env is readable by any Electron extension in the renderer.
  // For production, prefer electron.safeStorage over plaintext env vars.
  const apiKey =
    process.env.AI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.OPENAI_API_KEY ||
    "";

  if (!apiKey) {
    logger.warn("未设置 AI_API_KEY，AI 功能将不可用");
  } else if (!(await getSafeStorage())?.isEncryptionAvailable?.()) {
    logger.warn(
      "CRITICAL: API key loaded from plaintext process.env — any Electron extension can read it. " +
      "Use electron.safeStorage for production.",
    );
  }

  return {
    ai: {
      provider,
      model,
      apiKey: await protectSecret(apiKey),
      baseUrl: process.env.AI_BASE_URL,
      maxTokens: Number(process.env.AI_MAX_TOKENS) || 2048,
      temperature: Number(process.env.AI_TEMPERATURE) || 0.85,
      backupProvider: process.env.AI_BACKUP_PROVIDER
        ? validateProvider(process.env.AI_BACKUP_PROVIDER, "anthropic")
        : undefined,
      backupModel: process.env.AI_BACKUP_MODEL || undefined,
      backupApiKey: process.env.AI_BACKUP_API_KEY || undefined,
      backupBaseUrl: process.env.AI_BACKUP_BASE_URL || undefined,
    },
    qq: {
      wsUrl: process.env.QQ_WS_URL || "ws://127.0.0.1:3001",
      accessToken: process.env.QQ_ACCESS_TOKEN || "",
      reconnectIntervalMs: 5000,
    },
    wechat: {
      baseUrl: process.env.WECHAT_BASE_URL || "",
      fileUrl: process.env.WECHAT_FILE_URL || "",
      token: process.env.WECHAT_TOKEN || "",
      appid: process.env.WECHAT_APPID || "",
    },
  };
}

/** 从 data/profile.json 加载女友角色卡 */
export async function loadProfile(): Promise<Profile | null> {
  const storage = getStorage();
  const profilePath = dataPath(getDataRoot(), "data", "profile.json");
  if (!(await storage.exists(profilePath))) {
    logger.warn("未找到 data/profile.json，请先运行 npm run setup");
    return null;
  }
  let raw: string;
  try {
    raw = await storage.read(profilePath);
  } catch {
    logger.error("无法读取 data/profile.json");
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    logger.error("data/profile.json 格式损坏，无法解析");
    return null;
  }
  const profile = parsed as Record<string, unknown>;
  if (typeof profile.name !== "string" || !profile.name) {
    logger.error("data/profile.json 缺少必填字段 name");
    return null;
  }
  if (typeof profile.user_gender !== "string" || !["male", "female", "other"].includes(profile.user_gender as string)) {
    logger.error("data/profile.json user_gender 无效");
    return null;
  }
  if (typeof profile.relationship_type !== "string" || !["girlfriend", "boyfriend"].includes(profile.relationship_type as string)) {
    logger.error("data/profile.json relationship_type 无效");
    return null;
  }
  // Backward compat: default partner_gender from relationship_type if missing
  if (typeof profile.partner_gender !== "string" || !["male", "female", "other"].includes(profile.partner_gender as string)) {
    profile.partner_gender = profile.relationship_type === "boyfriend" ? "male" : "female";
  }
  if (typeof profile.relationship_mode !== "string" || !["direct", "slow_burn"].includes(profile.relationship_mode as string)) {
    logger.error("data/profile.json relationship_mode 无效");
    return null;
  }
  return parsed as Profile;
}

/** 加载完整应用配置 */
export async function loadConfig(): Promise<AppConfig> {
  const env = await loadEnvConfig();
  const filter = process.env.CONTENT_FILTER as AppConfig["contentFilter"] | undefined;
  return {
    ai: env.ai,
    qq: env.qq,
    wechat: env.wechat,
    memory: DEFAULTS.memory!,
    contentFilter: filter === "strict" || filter === "moderate" || filter === "off"
      ? filter
      : DEFAULTS.contentFilter!,
    topicSelfCheck: process.env.TOPIC_SELF_CHECK === "true",
  };
}

/** Atomic write: write to temp then rename (crash-safe on same filesystem) */
export async function writeFileAtomic(filePath: string, content: string): Promise<void> {
  await getStorage().writeAtomic(filePath, content);
}

/** Encrypt sensitive value using OS keychain (safeStorage). Returns prefix-tagged string. */
export async function protectSecret(plaintext: string): Promise<string> {
  const ss = await getSafeStorage();
  if (!ss?.isEncryptionAvailable?.()) return plaintext;
  try {
    return "safe:" + ss.encryptString(plaintext).toString("base64");
  } catch { return plaintext; }
}

/** Decrypt a value protected by protectSecret. */
export async function revealSecret(protected_: string): Promise<string> {
  if (!protected_?.startsWith("safe:")) return protected_ || "";
  const ss = await getSafeStorage();
  if (!ss?.isEncryptionAvailable?.()) return protected_.replace("safe:", "");
  try {
    return ss.decryptString(Buffer.from(protected_.slice(5), "base64"));
  } catch { return protected_.replace("safe:", ""); }
}

/** 路径 ID 消毒：防止目录穿越攻击 */
export function sanitizePathId(id: string): string {
  return id.replace(/[/\\:*?"<>|]/g, "_").replace(/\.\./g, "_").replace(/\0/g, "").slice(0, 200) || "unknown";
}
