**言語 / Language:** [English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-Hant.md) | [日本語](README.ja.md)

# @sixtdreamnight/companion-engine

**AI コンパニオンコアエンジン — 人格、関係、記憶、安全性、メッセージパイプライン。**

[Yumema](https://github.com/sixtdreanight/Yumema) を駆動します。

[![npm version](https://img.shields.io/npm/v/@sixtdreamnight/companion-engine.svg)](https://www.npmjs.com/package/@sixtdreamnight/companion-engine)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![TypeScript](https://img.shields.io/badge/%3C/%3E-TypeScript-3178C6.svg)](https://www.typescriptlang.org/)

---

## インストール

```bash
npm install @sixtdreamnight/companion-engine
```

## クイックスタート

```typescript
import { loadConfig, processMessage, processMessageStream } from "@sixtdreamnight/companion-engine";
import "dotenv/config";

const config = loadConfig();

// 標準パイプライン
const reply = await processMessage("こんにちは！", { userId: "user-1", config });
console.log(reply);

// ストリーミングパイプライン（トークン単位）
for await (const chunk of processMessageStream("こんにちは！", { userId: "user-1", config })) {
  process.stdout.write(chunk);
}
```

## API 概要

| モジュール | 説明 |
|-----------|------|
| **Config** | アプリ設定、プロファイル、環境変数の管理 |
| **Pipeline** | 5 段階メッセージパイプライン + ストリーミング出力 + 永続チェックポイント |
| **Personality** | キャラクターエンジン — 気分、話題提案、感情的サポート、セッション管理 |
| **Emotion** | ステートフル感情モデル — 7 感情 + 確率的遷移 |
| **Relationship** | 好感度システム、関係段階、告白/別れ、好感度減衰、複数キャラ対応 |
| **Memory** | 短期/長期記憶、要約、忘却曲線、意味検索 |
| **Safety** | 多層安全 — Regex/LLM/複合チェッカー。プロファイル検証 |
| **Scheduler** | cron ベースのバックグラウンドタスクスケジューラ |
| **Search** | Web 検索および会話履歴検索 |
| **Checkpointer** | 永続セッション状態（JSON ファイルデフォルト） |
| **Embedding** | 意味記憶のためのテキストベクトル化（TF-IDF デフォルト） |
| **Validation** | Zod ランタイムスキーマ検証 |
| **MBTI** | 会話ベースの MBTI 推論 |
| **Card Import** | SillyTavern V1/V2/V3 + Character.AI キャラクターカードインポート |

## 主要機能 (v0.2.0)

- **永続セッション**: `JsonCheckpointer` プロセス再起動後も保持
- **ストリーミングパイプライン**: `processMessageStream()` トークンレベルの非同期ジェネレータ
- **感情モデル**: 7 状態感情システム + 強度追跡
- **好感度減衰**: 7 日間の非アクティブ後に徐々に減少
- **複数キャラクター関係**: 各キャラクターが独立した状態を保持
- **意味記憶**: `TfIdfEmbeddingProvider` ベクトル検索
- **Zod 検証**: Profile/AppConfig のランタイム型検証
- **LLM 安全チェッカー**: オプションの LLM ベース安全レイヤー
- **MBTI 推論**: 会話からの性格タイプ検出
- **C.AI インポート**: Character.AI エクスポート形式対応

## ピア依存関係

- `@ai-sdk/anthropic` ^3.0.0
- `@ai-sdk/openai` ^3.0.0
- `ai` ^6.0.0
- `dotenv` ^17.0.0
- `node-cron` ^3.0.0
- `zod` ^3.0.0

完全な API ドキュメント: [API_REFERENCE.md](API_REFERENCE.md)

## ライセンス

GPL-3.0 — 詳細は [LICENSE](./LICENSE) をご参照ください。

---

<div align="center">

**Language / 语言 / 言語**

[**English**](README.md) | [**简体中文**](README.zh-CN.md) | [**繁體中文**](README.zh-Hant.md) | [**日本語**](README.ja.md)

</div>
