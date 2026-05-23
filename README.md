# @sleepnight/companion-core

**AI companion core engine — personality, relationship, memory, safety, and pipeline.**

Powers [Yumema](https://github.com/sixtdreanight) and V-Partner.

[![npm version](https://img.shields.io/npm/v/@sleepnight/companion-core.svg)](https://www.npmjs.com/package/@sleepnight/companion-core)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![TypeScript](https://img.shields.io/badge/%3C/%3E-TypeScript-3178C6.svg)](https://www.typescriptlang.org/)

---

[English](#english) | [中文](#中文)

---

## English

### Installation

```bash
npm install @sleepnight/companion-core
```

### Quick Start

```typescript
import { loadConfig, processMessage } from "@sleepnight/companion-core";
import "dotenv/config";

const config = loadConfig();
const reply = await processMessage("Hello!", { userId: "user-1", config });
console.log(reply);
```

### API Overview

| Module | Description |
|--------|-------------|
| **Config** | Load and manage app configuration, profiles, environment variables |
| **Pipeline** | Message processing pipeline with pluggable stages |
| **Personality** | Character engine — mood, topic suggestion, emotional support, session management |
| **Relationship** | Affection system, relationship stages, confession/breakup logic |
| **Memory** | Short-term / long-term memory, summarization, forgetting curve |
| **Safety** | Input/output filtering, profile validation, refusal responses |
| **Scheduler** | Cron-based background task scheduler |
| **Search** | Web search and conversation history search |

### Peer Dependencies

This package does not bundle these — install them alongside:

- `@ai-sdk/anthropic` ^3.0.0
- `@ai-sdk/openai` ^3.0.0
- `ai` ^6.0.0
- `dotenv` ^17.0.0
- `node-cron` ^3.0.0
- `zod` ^3.0.0

### License

GPL-3.0 — see [LICENSE](./LICENSE).

---

## 中文

### 安装

```bash
npm install @sleepnight/companion-core
```

### 快速开始

```typescript
import { loadConfig, processMessage } from "@sleepnight/companion-core";
import "dotenv/config";

const config = loadConfig();
const reply = await processMessage("你好！", { userId: "user-1", config });
console.log(reply);
```

### API 概览

| 模块 | 说明 |
|------|------|
| **Config** | 应用配置、用户档案、环境变量 |
| **Pipeline** | 可插拔的消息处理流水线 |
| **Personality** | 角色引擎 — 心情、话题建议、情感支持、会话管理 |
| **Relationship** | 好感度系统、关系阶段、告白/分手 |
| **Memory** | 短期/长期记忆、摘要、遗忘曲线 |
| **Safety** | 输入/输出过滤、档案校验、拒绝回复 |
| **Scheduler** | 基于 cron 的后台任务调度 |
| **Search** | 网页搜索及聊天历史搜索 |

### 对等依赖

不随包自带，需自行安装：

- `@ai-sdk/anthropic` ^3.0.0
- `@ai-sdk/openai` ^3.0.0
- `ai` ^6.0.0
- `dotenv` ^17.0.0
- `node-cron` ^3.0.0
- `zod` ^3.0.0

### 许可证

GPL-3.0 — 详见 [LICENSE](./LICENSE)。
