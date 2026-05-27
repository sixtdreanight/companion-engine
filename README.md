**Language:** [English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-Hant.md) | [日本語](README.ja.md)

# @sixtdreamnight/companion-engine

**AI companion core engine — personality, relationship, memory, safety, and pipeline.**

Powers [Yumema](https://github.com/sixtdreanight/Yumema).

[![npm version](https://img.shields.io/npm/v/@sixtdreamnight/companion-engine.svg)](https://www.npmjs.com/package/@sixtdreamnight/companion-engine)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![TypeScript](https://img.shields.io/badge/%3C/%3E-TypeScript-3178C6.svg)](https://www.typescriptlang.org/)

---

## Installation

```bash
npm install @sixtdreamnight/companion-engine
```

## Quick Start

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

## API Overview

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

## Key Features (v0.2.0)

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

## Peer Dependencies

- `@ai-sdk/anthropic` ^3.0.0
- `@ai-sdk/openai` ^3.0.0
- `ai` ^6.0.0
- `dotenv` ^17.0.0
- `node-cron` ^3.0.0
- `zod` ^3.0.0

Full API docs: [API_REFERENCE.md](API_REFERENCE.md)

## License

GPL-3.0 — see [LICENSE](./LICENSE).

---

<div align="center">

**Language / 语言 / 言語**

[**English**](README.md) | [**简体中文**](README.zh-CN.md) | [**繁體中文**](README.zh-Hant.md) | [**日本語**](README.ja.md)

</div>
