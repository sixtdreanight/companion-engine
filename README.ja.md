**言語 / Language:** [English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-Hant.md) | [日本語](README.ja.md)

# @sixtdreamnight/companion-engine

**AI コンパニオンコアエンジン — 人格、関係、記憶、安全性、メッセージパイプライン。**

[Yumema](https://github.com/sixtdreanight/Yumema) を駆動します。

[![npm version](https://img.shields.io/npm/v/@sixtdreamnight/companion-engine.svg)](https://www.npmjs.com/package/@sixtdreamnight/companion-engine)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![TypeScript](https://img.shields.io/badge/%3C/%3E-TypeScript-3178C6.svg)](https://www.typescriptlang.org/)

---

> 日本語翻訳は準備中です。完全な内容は [English](README.md) または [简体中文](README.zh-CN.md) をご参照ください。
>
> Japanese translation in progress. Please refer to [English](README.md) or [简体中文](README.zh-CN.md) for complete content.

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

// ストリーミングパイプライン
for await (const chunk of processMessageStream("こんにちは！", { userId: "user-1", config })) {
  process.stdout.write(chunk);
}
```

完全な API ドキュメント: [API_REFERENCE.md](API_REFERENCE.md)

## ライセンス

GPL-3.0 — 詳細は [LICENSE](./LICENSE) をご参照ください。

---

<div align="center">

**Language / 语言 / 言語**

[**English**](README.md) | [**简体中文**](README.zh-CN.md) | [**繁體中文**](README.zh-Hant.md) | [**日本語**](README.ja.md)

</div>
