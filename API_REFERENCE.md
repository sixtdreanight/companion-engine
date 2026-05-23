# API Reference — @sixtdreamnight/companion-engine v0.2.0

## Pipeline

### `processMessage(userId, userMessage, ctx) -> Promise<string[]>`
处理一条消息，返回 AI 回复气泡数组。5 阶段管道：PreProcess → Memory → Context → Generation → PostProcess。

### `processMessageStream(userId, userMessage, ctx) -> AsyncGenerator<string>`
流式版本，逐 token yield。前 3 阶段同步，Generation 流式输出，PostProcess 在流结束后保存。

### `PipelineContext`
```typescript
interface PipelineContext {
  model: LanguageModel;
  config: AppConfig;
  profile: Profile;
  checkpointer?: Checkpointer<SummaryState>;  // 默认 JsonCheckpointer
}
```

---

## Checkpointer

### `Checkpointer<T>`
```typescript
interface Checkpointer<T> {
  get(key: string): Promise<T | null>;
  set(key: string, state: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
}
```

### `JsonCheckpointer<T>` — JSON 文件持久化
### `MemoryCheckpointer<T>` — 内存实现（测试用）

---

## EmbeddingProvider

### `EmbeddingProvider`
```typescript
interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  similarity(a: number[], b: number[]): number;
  readonly dimensions: number;
}
```

### `TfIdfEmbeddingProvider` — 零依赖默认实现
- 中文分词：单字 + bigram
- TF-IDF 向量化 + L2 归一化
- `buildVocabulary(docs: string[])` — 用文档集构建词汇表
- `static tokenize(text: string)` — 公开的分词工具函数

---

## Emotion Model

### `EmotionState`
```typescript
type Emotion = "happy" | "neutral" | "sad" | "anxious" | "excited" | "tired" | "caring";

interface EmotionState {
  current: Emotion;
  intensity: number;      // 0.0-1.0
  previous: Emotion;
  updatedAt: string;
}
```

### Functions
| Function | Description |
|----------|-------------|
| `createEmotionState()` | 基于时间创建初始情绪 |
| `updateEmotion(state, userMsg, sessionCount)` | 基于对话更新情绪 |
| `getEmotionContext(state)` | 获取 system prompt 注入文本 |
| `getCurrentMood(state?)` | 获取当前心情文本（替代旧的 getTodayMood） |

---

## Validation (Zod)

### `validateProfileSchema(data: unknown) -> { success, profile? } | { success, error }`
Zod 运行时校验 Profile 对象。

### `validateAppConfig(data: unknown) -> { success, config? } | { success, error }`
Zod 运行时校验 AppConfig 对象。

### Exported Schemas
`ProfileSchema`, `AppConfigSchema` — 可单独使用 `.parse()` / `.safeParse()`。

---

## Relationship System

### `RelationshipState`
```typescript
interface RelationshipState {
  mode: "direct" | "slow_burn";
  stage: "stranger" | "friend" | "close_friend" | "crush" | "lover";
  affection: number;       // 0-100
  lastInteractionAt: string;
  startedAt: string;
  // ... more fields
}
```

### Key Functions
| Function | Description |
|----------|-------------|
| `createRelationshipState(mode)` | 创建初始状态 |
| `loadRelationshipState(characterId?)` | 加载（支持多角色） |
| `saveRelationshipState(state, characterId?)` | 保存 |
| `updateAffection(state, delta)` | 更新好感度 + 阶段晋升 |
| `applyAffectionDecay(state)` | 好感度衰减（7天-1/天） |
| `handleConfession(state)` | 处理告白 |
| `handleBoundaryViolation(state)` | 处理越线 |
| `executeBreakup(state)` | 分手 |
| `stayFriends(state)` | 分手后做朋友 |
| `buildStageGuidance(state, profile)` | 阶段行为指引 |

---

## Safety

### RegexSafetyChecker — 默认
```typescript
class RegexSafetyChecker implements SafetyChecker {
  checkInput(message: string, context?: string[]) -> Promise<SafetyCheckResult>
  checkOutput(reply: string, context?: string[]) -> Promise<SafetyCheckResult>
}
```

### LLMSafetyChecker — 可选 LLM 增强
```typescript
class LLMSafetyChecker implements SafetyChecker {
  constructor(options: { generateText: (system, user) => Promise<string> })
}
```

### CompositeSafetyChecker — 组合（推荐）
```typescript
class CompositeSafetyChecker implements SafetyChecker {
  constructor(llmOptions?)  // 先 Regex 快速拦截，再 LLM 判断边界
}
```

### Legacy functions (from safety.ts)
`checkInput(msg, level)`, `checkOutput(reply)`, `validateProfile(profile)`,
`buildRefusalPrompt(nickname, reason)`, `fallbackRefusal()`

---

## Personality Engine

### Key Functions
| Function | Description |
|----------|-------------|
| `buildSystemPrompt(profile, time, mood, ...)` | 构建完整 system prompt |
| `buildTimeContext(tz)` | 时间上下文（含节日） |
| `buildSensoryContext(tz)` | 感官环境描写 |
| `detectSadness(msg)` | 情绪检测（normal/sad/crisis） |
| `isConversationDying(msgs)` | 冷场检测 |
| `suggestTopic(profile)` | 冷场话题建议 |
| `shouldRemindBreak(session)` | 防沉迷检测 |
| `buildEmotionalSupportHint(nickname)` | 情绪支持提示 |
| `buildCrisisHint(nickname)` | 危机干预提示 |

---

## Memory System

### Key Functions
| Function | Description |
|----------|-------------|
| `loadShortTerm(userId, maxTurns)` | 加载短期记忆 |
| `saveShortTerm(userId, userMsg, aiMsg)` | 追加对话 |
| `buildMessageHistory(userId, maxTurns)` | 转为 LLM 消息格式 |
| `loadLongTerm()` | 加载长期记忆 |
| `updateFact(topic, content)` | 更新/新增事实 |
| `applyForgettingCurve()` | 艾宾浩斯遗忘曲线 |
| `buildMemoryContext(maxFacts, query?)` | 多维度评分检索 |
| `extractFactsFromConversation(userId, generateText)` | LLM 事实提取 |

---

## MBTI Inference

### `inferMBTI(history, generateText, minMessages=20) -> Promise<MBTIResult | null>`
基于对话历史推断用户 MBTI。

### `formatMBTIContext(result, userNickname) -> string`
格式化为 system prompt 注入片段。

---

## Card Import

### SillyTavern
`parseSTCard(raw: string) -> Partial<Profile>` — 支持 v1/v2/v3
`extractCardFromPNG(buffer: Buffer) -> string | null`

### Extras (card-import-extra.ts)
`parseCAICard(raw: string) -> Partial<Profile>` — Character.AI 格式
`extractGreetings(card) -> { main, alternates }` — alternate_greetings
`CARD_TEX_KEYWORDS` — PNG tEXt 块关键字 `["chara", "ccv3", "st", "chub"]`

---

## Model Strategy

### `ModelStrategy`
```typescript
interface ModelStrategy {
  provider: string;
  temperature: number;
  topP: number;
  minP?: number;          // NEW v0.2.0
  topK?: number;          // NEW v0.2.0
  mirostat?: number;      // NEW v0.2.0 (0/1/2)
  mirostatTau?: number;   // NEW v0.2.0
  mirostatEta?: number;   // NEW v0.2.0
  systemPromptStyle: "narrative" | "structured" | "technical";
  chatExampleCount: number;
  authorNotePosition: "system-start" | "pre-user";
  supportsThinking: boolean;
  supportsPromptCaching: boolean;
  maxContextTokens: number;
}
```

### Built-in Strategies
`CLAUDE_STRATEGY`, `OPENAI_STRATEGY`, `DEEPSEEK_STRATEGY`, `OLLAMA_STRATEGY`

### `getModelStrategy(provider: string) -> ModelStrategy`
按 provider 字符串解析策略。
