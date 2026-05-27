**語言 / Language:** [English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-Hant.md) | [日本語](README.ja.md)

# @sixtdreamnight/companion-engine

**AI 伴侶核心引擎 — 人格、關係、記憶、安全、訊息管道。**

驅動 [Yumema](https://github.com/sixtdreanight/Yumema)。

[![npm version](https://img.shields.io/npm/v/@sixtdreamnight/companion-engine.svg)](https://www.npmjs.com/package/@sixtdreamnight/companion-engine)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![TypeScript](https://img.shields.io/badge/%3C/%3E-TypeScript-3178C6.svg)](https://www.typescriptlang.org/)

---

> 繁體中文翻譯正在進行中，部分內容請參考 [English](README.md) 或 [简体中文](README.zh-CN.md) 版本。
>
> Traditional Chinese translation in progress. Please refer to [English](README.md) or [简体中文](README.zh-CN.md) for complete content.

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

完整 API 文件: [API_REFERENCE.md](API_REFERENCE.md)

## 許可證

GPL-3.0 — 詳見 [LICENSE](./LICENSE)。

---

<div align="center">

**Language / 语言 / 言語**

[**English**](README.md) | [**简体中文**](README.zh-CN.md) | [**繁體中文**](README.zh-Hant.md) | [**日本語**](README.ja.md)

</div>
