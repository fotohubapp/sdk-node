/**
 * fotohub — Official TypeScript SDK for the FOTOhub AI Platform.
 *
 * Provides access to image generation, video generation, music generation,
 * speech synthesis, transcription, chat/LLM completions, image analysis,
 * Stability AI tools, billing management, and webhook configuration.
 *
 * @example
 * ```typescript
 * import { FotoHub } from "fotohub";
 *
 * const client = new FotoHub({ apiKey: process.env.FOTOHUB_API_KEY! });
 *
 * // Generate an image
 * const image = await client.generateImage({
 *   prompt: "A sunset over mountains",
 * });
 * console.log(image.images[0]);
 *
 * // Stream a chat response
 * const stream = await client.chatStream({
 *   messages: [{ role: "user", content: "Hello!" }],
 * });
 * for await (const chunk of stream) {
 *   process.stdout.write(chunk.choices[0]?.delta.content ?? "");
 * }
 * ```
 *
 * @packageDocumentation
 */

// Main client
export { FotoHub } from "./client.js";

// Streaming utilities
export { ChatStream } from "./streaming.js";

// Error classes
export {
  FotoHubError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  RateLimitError,
  InsufficientCreditsError,
  ValidationError,
  TimeoutError,
  NetworkError,
  ServerError,
  JobFailedError,
  JobTimeoutError,
  WebhookError,
} from "./errors.js";

// Types — Client configuration
export type { FotoHubConfig } from "./types.js";

// Types — Image generation
export type {
  GenerateImageOptions,
  ImageResult,
  ImageMetadata,
} from "./types.js";

// Types — Image editing
export type {
  EditImageOptions,
  EditResult,
} from "./types.js";

// Types — Video generation
export type {
  GenerateVideoOptions,
  VideoResult,
  PollOptions,
} from "./types.js";

// Types — Music generation
export type {
  GenerateMusicOptions,
  MusicResult,
} from "./types.js";

// Types — SFX generation
export type {
  GenerateSfxOptions,
  SfxResult,
} from "./types.js";

// Types — Speech generation
export type {
  GenerateSpeechOptions,
  SpeechResult,
} from "./types.js";

// Types — Transcription
export type {
  TranscribeOptions,
  TranscriptionResult,
} from "./types.js";

// Types — Chat / LLM
export type {
  ChatOptions,
  ChatBedrockOptions,
  ChatMessage,
  ChatResult,
  ChatChoice,
  TokenUsage,
  ChatStreamChunk,
  ChatStreamChunkChoice,
  ChatDelta,
} from "./types.js";

// Types — Image analysis
export type {
  AnalyzeImageOptions,
  AnalysisResult,
} from "./types.js";

// Types — Stability AI tools
export type {
  StabilityTool,
  StabilityOptions,
  StabilityResult,
  OutpaintPadding,
} from "./types.js";

// Types — Billing
export type {
  BillingInfo,
  BillingBalance,
  PricingCatalog,
  ApiPlan,
  CreditsInfo,
  OverageResult,
  TopupPackage,
  TopupResult,
  TransactionOptions,
  TransactionPage,
  Transaction,
  CostOperation,
  CostEstimate,
  CostBreakdownItem,
  Invoice,
} from "./types.js";

// Types — Webhooks
export type {
  Webhook,
  CreateWebhookOptions,
  UpdateWebhookOptions,
  WebhookTestResult,
  WebhookLog,
} from "./types.js";

// Types — Models
export type { Model } from "./types.js";

// Types — API envelope
export type { ApiResponse, ApiError } from "./types.js";

// Types — Internal (for advanced use)
export type { RequestOptions } from "./types.js";
