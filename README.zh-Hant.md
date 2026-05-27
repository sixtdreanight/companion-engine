**語言 / Language:** [English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-Hant.md) | [日本語](README.ja.md)

# @sixtdreamnight/companion-engine

**AI 伴侶核心引擎 — 人格、關係、記憶、安全、訊息管道。**

驅動 [Yumema](https://github.com/sixtdreanight/Yumema)。

[![npm version](https://img.shields.io/npm/v/@sixtdreamnight/companion-engine.svg)](https://www.npmjs.com/package/@sixtdreamnight/companion-engine)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![TypeScript](https://img.shields.io/badge/%3C/%3E-TypeScript-3178C6.svg)](https://www.typescriptlang.org/)

---

## 安裝

```bash
npm install @sixtdreamnight/companion-engine
```

## 快速開始

```typescript
import { loadConfig, processMessage, processMessageStream } from "@sixtdreamnight/companion-engine";
import "dotenv/config";

const config = loadConfig();

// 標準管道
const reply = await processMessage("你好！", { userId: "user-1", config });
console.log(reply);

// 串流管道（逐 token 輸出）
for await (const chunk of processMessageStream("你好！", { userId: "user-1", config })) {
  process.stdout.write(chunk);
}
```

## API 概覽

| 模組 | 說明 |
|------|------|
| **Config** | 應用設定、使用者設定檔、環境變數 |
| **Pipeline** | 5 階段訊息管道 + 串流輸出 + 持久化檢查點 |
| **Personality** | 角色引擎 — 心情、話題建議、情感支援、會話管理 |
| **Emotion** | 狀態化情緒模型 — 7 種情緒 + 機率轉移 |
| **Relationship** | 好感度系統、關係階段、告白/分手、好感衰減、多角色支援 |
| **Memory** | 短期/長期記憶、摘要、遺忘曲線、語義檢索 |
| **Safety** | 多層安全 — Regex/LLM/組合檢查器。角色設定審核 |
| **Scheduler** | 基於 cron 的背景任務排程 |
| **Search** | 網頁搜尋及聊天歷史搜尋 |
| **Checkpointer** | 持久化會話狀態（JSON 檔案預設） |
| **Embedding** | 文字向量化語義檢索（TF-IDF 預設） |
| **Validation** | Zod 執行階段 schema 校驗 |
| **MBTI** | 對話式 MBTI 推斷 |
| **Card Import** | SillyTavern V1/V2/V3 + Character.AI 角色卡匯入 |

## 核心特性 (v0.2.0)

- **持久化會話**: `JsonCheckpointer` 處理程序重啟不丟失
- **串流管道**: `processMessageStream()` token 級非同步生成器
- **情緒模型**: 7 狀態情緒系統 + 強度追蹤
- **好感衰減**: 7 天未互動後每天 -1 好感度
- **多角色關係**: 每個角色獨立關係狀態
- **語義記憶**: `TfIdfEmbeddingProvider` 向量檢索
- **Zod 校驗**: Profile/AppConfig 執行階段型別校驗
- **LLM 安全檢查器**: 可選 LLM 安全增強
- **MBTI 推斷**: 基於對話推斷性格型別
- **C.AI 匯入**: Character.AI 匯出格式支援

## 對等依賴

- `@ai-sdk/anthropic` ^3.0.0
- `@ai-sdk/openai` ^3.0.0
- `ai` ^6.0.0
- `dotenv` ^17.0.0
- `node-cron` ^3.0.0
- `zod` ^3.0.0

完整 API 文件: [API_REFERENCE.md](API_REFERENCE.md)

## 授權條款

GPL-3.0 — 詳見 [LICENSE](./LICENSE)。

---

<div align="center">

**Language / 语言 / 言語**

[**English**](README.md) | [**简体中文**](README.zh-CN.md) | [**繁體中文**](README.zh-Hant.md) | [**日本語**](README.ja.md)

</div>
