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

### Tests
- 56 tests: safety, relationship (affection/confession/breakup/decay/boundary), emotion, embedding, checkpointer
