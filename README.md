# @sixtdreamnight/companion-engine

**AI companion core engine — personality, relationship, memory, safety, and pipeline.**

Powers [Yumema](https://github.com/sixtdreanight/Yumema).

[![npm version](https://img.shields.io/npm/v/@sixtdreamnight/companion-engine.svg)](https://www.npmjs.com/package/@sixtdreamnight/companion-engine)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![TypeScript](https://img.shields.io/badge/%3C/%3E-TypeScript-3178C6.svg)](https://www.typescriptlang.org/)

---

[English](#english) | [中文](#中文)

---

## English

### Installation

```bash
npm install @sixtdreamnight/companion-engine
```

### Quick Start

```typescript
import { loadConfig, processMessage, processMessageStream } from "@sixtdreamnight/companion-engine";
import "dotenv/config";

const config = loadConfig();

// Standard pipeline
const reply = await processMessage("Hello!", { userId: "user-1", config });
console.log(reply);

// Streaming pipeline (token-level)
for await (const chunk of processMessageStream("Hello!", { userId: "user-1", config })) {
  process.stdout.write(chunk);
}
```

### API Overview

| Module | Description |
|--------|-------------|
| **Config** | Load and manage app configuration, profiles, environment variables |
| **Pipeline** | 5-stage message pipeline with streaming support + persistent checkpoints |
| **Personality** | Character engine — mood, topic suggestion, emotional support, session management |
| **Emotion** | Stateful emotion model — 7 emotions with probabilistic transitions |
| **Relationship** | Affection system, relationship stages, confession/breakup, affection decay, multi-character |
| **Memory** | Short-term / long-term memory, summarization, forgetting curve, semantic search |
| **Safety** | Multi-layer safety — regex, LLM-based, composite checker. Profile validation |
| **Scheduler** | Cron-based background task scheduler |
| **Search** | Web search and conversation history search |
| **Checkpointer** | Persistent session state (JSON default) |
| **Embedding** | Text vectorization for semantic memory (TF-IDF default) |
| **Validation** | Zod runtime schema validation |
| **MBTI** | Conversation-based MBTI inference |
| **Card Import** | SillyTavern V1/V2/V3 + Character.AI character card import |

### Key Features (v0.2.0)

- **Persistent sessions**: `JsonCheckpointer` survives process restarts
- **Streaming pipeline**: `processMessageStream()` token-level async generator
- **Emotion model**: 7-state emotional system with intensity tracking
- **Affection decay**: Gradual affection loss after 7 days of inactivity
- **Multi-character relationships**: Each character gets independent state
- **Semantic memory**: `TfIdfEmbeddingProvider` for vector-based retrieval
- **Zod validation**: Runtime type validation for Profile and AppConfig
- **LLM safety checker**: Optional LLM-based safety layer
- **MBTI inference**: Personality type detection from conversation
- **C.AI import**: Character.AI export format support

### Peer Dependencies

- `@ai-sdk/anthropic` ^3.0.0
- `@ai-sdk/openai` ^3.0.0
- `ai` ^6.0.0
- `dotenv` ^17.0.0
- `node-cron` ^3.0.0
- `zod` ^3.0.0

Full API docs: [API_REFERENCE.md](API_REFERENCE.md)

### License

GPL-3.0 — see [LICENSE](./LICENSE).

---

## 中文

### 安装

```bash
npm install @sixtdreamnight/companion-engine
```

### 快速开始

```typescript
import { loadConfig, processMessage, processMessageStream } from "@sixtdreamnight/companion-engine";
import "dotenv/config";

const config = loadConfig();

// 标准管道
const reply = await processMessage("你好！", { userId: "user-1", config });
console.log(reply);

// 流式管道（逐 token 输出）
for await (const chunk of processMessageStream("你好！", { userId: "user-1", config })) {
  process.stdout.write(chunk);
}
```

### API 概览

| 模块 | 说明 |
|------|------|
| **Config** | 应用配置、用户档案、环境变量 |
| **Pipeline** | 5 阶段消息管道 + 流式输出 + 持久化检查点 |
| **Personality** | 角色引擎 — 心情、话题建议、情感支持、会话管理 |
| **Emotion** | 状态化情绪模型 — 7 种情绪 + 概率转移 |
| **Relationship** | 好感度系统、关系阶段、告白/分手、好感衰减、多角色支持 |
| **Memory** | 短期/长期记忆、摘要、遗忘曲线、语义检索 |
| **Safety** | 多层安全 — Regex/LLM/组合检查器。角色设定审核 |
| **Scheduler** | 基于 cron 的后台任务调度 |
| **Search** | 网页搜索及聊天历史搜索 |
| **Checkpointer** | 持久化会话状态（JSON 文件默认） |
| **Embedding** | 文本向量化语义检索（TF-IDF 默认） |
| **Validation** | Zod 运行时 schema 校验 |
| **MBTI** | 对话式 MBTI 推断 |
| **Card Import** | SillyTavern V1/V2/V3 + Character.AI 角色卡导入 |

### 核心特性 (v0.2.0)

- **持久化会话**: `JsonCheckpointer` 进程重启不丢失
- **流式管道**: `processMessageStream()` token 级异步生成器
- **情绪模型**: 7 状态情绪系统 + 强度追踪
- **好感衰减**: 7 天未互动后每天 -1 好感度
- **多角色关系**: 每个角色独立关系状态
- **语义记忆**: `TfIdfEmbeddingProvider` 向量检索
- **Zod 校验**: Profile/AppConfig 运行时类型校验
- **LLM 安全检查器**: 可选 LLM 安全增强
- **MBTI 推断**: 基于对话推断性格类型
- **C.AI 导入**: Character.AI 导出格式支持

### 对等依赖

- `@ai-sdk/anthropic` ^3.0.0
- `@ai-sdk/openai` ^3.0.0
- `ai` ^6.0.0
- `dotenv` ^17.0.0
- `node-cron` ^3.0.0
- `zod` ^3.0.0

完整 API 文档: [API_REFERENCE.md](API_REFERENCE.md)

### 许可证

GPL-3.0 — 详见 [LICENSE](./LICENSE)。
