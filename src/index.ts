/**
 * @fotohub/sdk — Official TypeScript SDK for the FOTOhub AI Platform.
 *
 * Provides access to image generation, video generation, music generation,
 * chat/LLM completions, translation, intent orchestration, usage analytics,
 * and storage management.
 *
 * @example
 * ```typescript
 * import { FotoHub } from "@fotohub/sdk";
 *
 * const client = new FotoHub({ apiKey: process.env.FOTOHUB_API_KEY! });
 *
 * // Generate an image
 * const image = await client.generateImage({
 *   prompt: "A sunset over mountains",
 * });
 * console.log(image.images[0].url);
 *
 * // Stream a chat response
 * const stream = await client.streamChat({
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
} from "./errors.js";

// Types — Client configuration
export type { FotoHubConfig } from "./types.js";

// Types — Image generation
export type {
  ImageGenerateParams,
  ImageResult,
  ImageOutput,
  ImageMetadata,
} from "./types.js";

// Types — Video generation
export type {
  VideoGenerateParams,
  VideoJob,
  VideoJobStatus,
  VideoResult,
  VideoMetadata,
  VideoWaitOptions,
} from "./types.js";

// Types — Music generation
export type {
  MusicGenerateParams,
  MusicResult,
  MusicMetadata,
} from "./types.js";

// Types — Chat / LLM
export type {
  ChatParams,
  ChatMessage,
  ChatCompletion,
  ChatChoice,
  ChatUsage,
  ChatChunk,
  ChatChunkChoice,
  ChatDelta,
} from "./types.js";

// Types — Gabriel
export type {
  GabrielParams,
  GabrielContext,
  GabrielResponse,
  GabrielAction,
} from "./types.js";

// Types — Translation
export type { TranslateParams, TranslateResult } from "./types.js";

// Types — Usage
export type {
  UsageParams,
  UsageResult,
  UsageByService,
  UsageTimeSeries,
} from "./types.js";

// Types — Storage
export type {
  Bucket,
  CreateBucketParams,
  S3BucketProvisionParams,
  S3CorsRule,
  S3BucketResult,
  S3Credentials,
  PresignUploadParams,
  PresignedUrl,
  PresignDownloadParams,
} from "./types.js";

// Types — API envelope
export type { ApiResponse, ApiError } from "./types.js";
