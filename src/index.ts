// companion-core — AI companion engine
// Re-exports all public APIs from each module

// ---- Config & Types ----
export {
  type UserGender,
  type RelationshipType,
  type RelationshipMode,
  type RelationshipStage,
  type Profile,
  type CustomStyle,
  type AIConfig,
  type QQConfig,
  type WeChatConfig,
  type AppConfig,
  initDataRoot,
  getDataRoot,
  reloadEnv,
  writeEnvFile,
  loadProfile,
  loadConfig,
  writeFileAtomic,
} from "./config.js";

// ---- Pipeline ----
export {
  type PipelineContext,
  processMessage,
  cleanupSessions,
  createAIProvider,
  splitForChat,
} from "./pipeline.js";

// ---- Personality Engine ----
export {
  type MemoryContext,
  type LearnedInterest,
  type SessionState,
  buildSystemPrompt,
  buildTimeContext,
  buildSensoryContext,
  getTodayMood,
  isConversationDying,
  suggestTopic,
  buildEmotionalSupportHint,
  buildCrisisHint,
  detectSadness,
  createSession,
  updateSession,
  shouldRemindBreak,
  buildBreakReminder,
} from "./girlfriend.js";

// ---- Relationship System ----
export {
  type RelationshipState,
  type ConfessionRecord,
  type ConfessionResult,
  STAGE_LABELS,
  createRelationshipState,
  loadRelationshipState,
  saveRelationshipState,
  getOrCreateState,
  calculateAffectionDelta,
  updateAffection,
  handleConfession,
  checkBoundaryViolation,
  handleBoundaryViolation,
  executeBreakup,
  stayFriends,
  buildStageGuidance,
} from "./relationship.js";

// ---- Memory System ----
export {
  type ConversationTurn,
  type Fact,
  type LongTermMemory,
  loadShortTerm,
  saveShortTerm,
  removeLastTurn,
  buildMessageHistory,
  loadSummary,
  saveSummary,
  loadLongTerm,
  updateFact,
  applyForgettingCurve,
  buildMemoryContext,
  scoreMemoryFacts,
  deleteFact,
  adjustFactImportance,
  extractFactsFromConversation,
  analyzeUserInterests,
  loadLearnedInterests,
} from "./memory.js";

// ---- Safety ----
export {
  type SafetyResult,
  type FilterLevel,
  type ProfileValidationResult,
  checkInput,
  buildRefusalPrompt,
  checkOutput,
  validateProfile,
  fallbackRefusal,
} from "./safety.js";

// ---- Scheduler ----
export {
  type ScheduledTasks,
  startScheduler,
} from "./scheduler.js";

// ---- Search ----
export {
  type SearchResult,
  needsSearch,
  extractSearchQuery,
  searchWeb,
} from "./search.js";

export {
  type SearchHit,
  searchConversations,
} from "./search-history.js";

// ---- Utilities ----
export {
  setLogLevel,
  setLogFile,
  logger,
  createCorrelationId,
  cidLogger,
  retry,
  sleep,
  pickRandom,
  getDateInTimezone,
  GUI_USER_ID,
  recordPipelineMessage,
  recordPipelineError,
  getPipelineStats,
} from "./utils.js";

// ---- Conversation Tools ----
export { splitForChat as splitForChat_alias } from "./split.js";
export { buildSemanticHints } from "./semantic.js";
export {
  generateConversationSummary,
  formatSummaryBlock,
  estimateTokenUsage,
  shouldTriggerSummary,
  computeHistoryLimit,
} from "./summary.js";

// ---- Model Strategy & Tuning ----
export {
  type ModelStrategy,
  CLAUDE_STRATEGY,
  OPENAI_STRATEGY,
  DEEPSEEK_STRATEGY,
  OLLAMA_STRATEGY,
  getModelStrategy,
  getAuthorNotePosition,
} from "./model-strategy.js";

export {
  buildAuthorsNote,
  generateChatExamples,
  applyModelStrategy,
  formatSystemPromptForModel,
  formatChatExamples,
} from "./model-tuning.js";

// ---- Role Templates & MBTI ----
export {
  type RoleTemplate,
  getTemplates,
  getTemplateByKey,
} from "./role-templates.js";

export {
  type MBTIProfile,
  getMBTIProfile,
  getAllMBTITypes,
  MBTI_MAP,
} from "./mbti.js";

// ---- Card Import ----
export {
  parseSTCard,
  extractCardFromPNG,
} from "./card-import.js";

// ---- Export ----
export {
  exportToTXT,
  exportToMarkdown,
  exportToHTML,
} from "./export.js";

// ---- Feedback ----
export {
  type FeedbackEntry,
  saveFeedback,
  loadRecentFeedback,
  buildFeedbackContext,
} from "./feedback.js";

// ---- Storage ----
export {
  type StorageAdapter,
  NodeStorage,
  MemoryStorage,
} from "./storage.js";

// ---- Pipeline Stages ----
export { preProcessStage } from "./stages/preprocess.js";
export { memoryStage, type SummaryState } from "./stages/memory.js";
export { contextStage, getSession } from "./stages/context.js";
export { generationStage } from "./stages/generation.js";
export { postProcessStage } from "./stages/postprocess.js";
