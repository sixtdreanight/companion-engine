# Changelog

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

## v0.2.1 (2026-05-24)

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
