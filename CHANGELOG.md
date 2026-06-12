# Changelog

## v0.4.0 (2026-06-12)

### Breaking Changes
- **StorageAdapter 接口全面异步化**：所有方法返回 `Promise`（`read/write/exists/mkdir/readdir/unlink/rmdir/stat/writeAtomic`）
- 新增 `KVStore` 接口（`get/set/delete`），用于键值存储抽象
- 顶层 API 改为 async：`loadProfile()`, `initDataRoot()`, `writeEnvFile()`, `reloadEnv()`, `writeFileAtomic()`, `setLogFile()`
- 记忆系统全 async：`loadShortTerm`, `saveShortTerm`, `removeLastTurn`, `loadLongTerm`, `updateFact`, `deleteFact`, `applyForgettingCurve`, `buildMemoryContext`, `scoreMemoryFacts`, `loadLearnedInterests`, `buildMessageHistory`, `loadSummary`, `saveSummary`
- 关系系统 async：`loadRelationshipState`, `saveRelationshipState`, `getOrCreateState`, `updateAffection`, `handleConfession`, `handleBoundaryViolation`, `executeBreakup`, `stayFriends`
- 其他 async：`saveFeedback`, `loadRecentFeedback`, `buildFeedbackContext`, `searchConversations`, `saveEmotionState`, `loadEmotionState`

### Added
- `setStorageAdapter(adapter)` / `getStorage()` — 全局存储适配器注入
- `setKVStore(store)` / `getKVStore()` — 全局键值存储注入
- `NodeStorage` 异步实现（基于 `node:fs/promises`）
- `MemoryStorage` 异步实现（测试用）

### Changed
- 全部 35 个源文件中 8 个文件的 `node:fs` 调用替换为 `getStorage()`
- `node:path` 的 `resolve/join/dirname` 替换为跨平台字符串拼接
- `writeAtomic` 使用 `writeFile` 覆盖替代 `rename`，避免 Windows EPERM

### Fixed
- 3 个测试文件异步化，全部 111 项测试通过

## v0.1.0 (2026-05-23)

### Initial Release

- Initial release — extracted from yumema.

## v0.2.0 (2026-05-23)

### New Features
- **Checkpointer**: `Checkpointer<T>` interface with `JsonCheckpointer` (persistent) and `MemoryCheckpointer` (test)
  - Pipeline sessions now survive process restarts
- **EmbeddingProvider**: `EmbeddingProvider` interface with `TfIdfEmbeddingProvider` (zero-dependency default)
  - Chinese tokenization (single char + bigram), TF-IDF with L2 normalization
- **Zod Validation**: `ProfileSchema`, `AppConfigSchema`, `validateProfileSchema()`, `validateAppConfig()`
- **Emotion Model**: `createEmotionState()`, `updateEmotion()`, `getEmotionContext()`, `getCurrentMood()`
  - 7 emotional states with probabilistic transitions and intensity tracking
- **Streaming Pipeline**: `processMessageStream()` async generator for token-level streaming
- **Affection Decay**: `applyAffectionDecay()` — 7 days of no interaction → -1/day
- **Multi-Character Relationships**: `loadRelationshipState(characterId)`, `saveRelationshipState(state, characterId)`
- **Advanced Sampling**: `minP`, `topK`, `mirostat` params added to `ModelStrategy`

### Improvements
- Pipeline state persistence via `Checkpointer` (was in-memory `Map` only)
- `relationship.ts` tracks `lastInteractionAt` for decay calculation
- `OLLAMA_STRATEGY` now includes sensible `minP` and `topK` defaults

## v0.2.2 (2026-05-24)

### Security Fixes
- **Path traversal**: `sanitizePathId()` added to `config.ts` — applied to `userId` in `memory.ts` and `characterId` in `relationship.ts` to prevent directory traversal via crafted IDs
- **Unicode bypass**: `checkInput()` now normalizes to NFKC before regex matching (homoglyph defense)
- **LLM safety checker**: Changed from fail-open to fail-closed — checker unavailability now blocks content
- **Safety judge hardening**: User input wrapped in `<user_message>` XML boundaries to prevent prompt injection into the safety LLM
- **Checkpointer namespace**: `sanitizePathId()` applied to `JsonCheckpointer` namespace and keys

### Bug Fixes
- **Confession false match**: `我不喜欢你` no longer triggers confession flow (`(?<!不)` negative lookbehind)
- **Dynamic imports removed**: `renameSync`/`unlinkSync`/`readdirSync` now imported statically in `checkpointer.ts`
- **Emotion persistence**: `saveEmotionState()`/`loadEmotionState()` added (`emotion.ts`)
- **Postprocess topic**: Fact extraction now uses captured match group instead of meaningless `slice(0, 2)`
- **Rate limiting**: `processMessage()` enforces 500ms minimum interval between messages (`pipeline.ts`)

### Tests
- 75 tests: safety, relationship, emotion, embedding, checkpointer, personality
