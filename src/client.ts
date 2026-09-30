import type {
  FotoHubConfig,
  RequestOptions,
  GenerateImageOptions,
  ImageResult,
  ImageMetadata,
  GenerateIdaQOptions,
  IdaQJobSubmitResult,
  IdaQJobStatus,
  EditImageOptions,
  EditResult,
  GenerateVideoOptions,
  VideoResult,
  PollOptions,
  GenerateSeedanceOptions,
  SeedanceResult,
  RegisterVideoAssetResult,
  GenerateMusicOptions,
  MusicResult,
  GenerateSfxOptions,
  SfxResult,
  GenerateSpeechOptions,
  SpeechResult,
  TranscribeOptions,
  TranscriptionResult,
  ChatOptions,
  ChatResult,
  ChatClaudeOptions,
  ChatBedrockOptions,
  AnalyzeImageOptions,
  AnalysisResult,
  StabilityTool,
  StabilityOptions,
  StabilityResult,
  OutpaintPadding,
  BillingBalance,
  PricingCatalog,
  ApiPlan,
  CreditsInfo,
  OverageResult,
  TopupPackage,
  TopupPackageList,
  TopupResult,
  TransactionOptions,
  TransactionPage,
  CostOperation,
  CostEstimate,
  Invoice,
  Webhook,
  CreateWebhookOptions,
  UpdateWebhookOptions,
  WebhookTestResult,
  WebhookLog,
  Model,
  Generate3DOptions,
  ThreeDResult,
  ThreeDModelInfo,
  ThreeDPollOptions,
  TryOnOptions,
  TryOnSubmitResult,
  TryOnResult,
  TryOnPollOptions,
  TierCatalog,
  TierInfo,
  TierComparison,
  WalletInfo,
  EnterpriseApplication,
  GabrielClassifyOptions,
  GabrielResult,
  GabrielSuggestOptions,
  GabrielSuggestion,
  GabrielRecommendOptions,
  GabrielRecommendation,
  TranslateOptions,
  TranslateResult,
  CreateVideoProjectOptions,
  VideoProject,
  ListVideoProjectsResult,
  ApplyVideoOpsOptions,
  ApplyOpsResult,
  VideoDigestOptions,
  VideoDigestResult,
  VideoLintOptions,
  LintResult,
  CaptureVideoOptions,
  RenderVideoOptions,
  VideoJob,
  AutoEditOptions,
  WaitForVideoJobOptions,
  VideoOpsCatalog,
  DetectScenesOptions,
  DetectSilenceOptions,
  DetectBeatsOptions,
  TranscribeVideoOptions,
  VideoAnalysisResult,
  VideoTranscribeJob,
} from "./types.js";

import {
  FotoHubError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  RateLimitError,
  InsufficientFundsError,
  ValidationError,
  TimeoutError,
  NetworkError,
  ServerError,
  JobFailedError,
  JobTimeoutError,
  SaveConflictError,
} from "./errors.js";

// parseSSEStream is no longer used here: chatStream() throws instead of
// parsing a body that never contains SSE frames. It stays exported from
// ./streaming.js for callers that hand it a real SSE response.
import type { ChatStream } from "./streaming.js";

const DEFAULT_BASE_URL = "https://apis.fotohub.app";
const DEFAULT_TIMEOUT = 60_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_IMAGE_MODEL = "seedream-5-0-260128";
// Seedance is the one video family that runs asynchronously (202 + job_id), so
// it has its own method rather than being reachable through generateVideo().
const DEFAULT_SEEDANCE_MODEL = "seedance-2-5";

const SDK_VERSION = "1.11.0";
const USER_AGENT = `fotohub-sdk-node/${SDK_VERSION}`;

/**
 * Header the API reads to de-duplicate a retried charged request. The client
 * sends one automatically on every guarded POST — see {@link idempotencyKeyFor}.
 */
const IDEMPOTENCY_HEADER = "X-Idempotency-Key";

/**
 * Path prefixes the API protects with `X-Idempotency-Key`. Mirrors
 * `_IDEMPOTENT_PREFIXES` in api-server's `main.py`. Sending the header outside
 * these prefixes is harmless (the server ignores it), but generating a key only
 * where it does something keeps request logs honest.
 */
const IDEMPOTENT_PREFIXES = [
  "/v1/ai/",
  "/v1/images/",
  "/v1/video/",
  "/v1/shorts/",
  "/v1/story/",
  "/v1/3d/",
  "/v1/generate/",
  "/v1/voice/",
] as const;

/**
 * Streaming endpoints, which the server deliberately excludes: a buffered
 * stream cannot be replayed, and holding one back in full before its first byte
 * reached the caller would defeat streaming. Mirrors
 * `_IDEMPOTENCY_EXCLUDE_PREFIXES` server-side.
 */
const IDEMPOTENCY_EXCLUDE_PREFIXES = [
  "/v1/ai/chat",
  "/v1/ai/agent/stream",
  "/v1/ai/gabriel",
  "/v1/ai/tts/",
  "/v1/story/generate",
] as const;

/**
 * Video timeline routes answer with `{"error": {code, message, details?}}` and
 * kebab-case codes (`save-conflict`, `media-not-found`, `payment-required`,
 * `rate-limited`, ...). On these paths the code is passed through to the thrown
 * error instead of the generic per-status one, so callers can branch on it.
 */
const TIMELINE_ERROR_PATH =
  /^\/v1\/video\/(projects|jobs|ops|detect-scenes|detect-silence|detect-beats|transcribe)(\/|$)/;

/** Headers carrying a caller-supplied idempotency key; none means the client mints one. */
function idempotencyHeaders(key: string | undefined): Record<string, string> | undefined {
  return key ? { [IDEMPOTENCY_HEADER]: key } : undefined;
}

/** The idempotency key the caller put in `options.headers`, if any. */
function callerIdempotencyKey(options: RequestOptions): string | undefined {
  if (!options.headers) return undefined;
  for (const [name, value] of Object.entries(options.headers)) {
    if (name.toLowerCase() === IDEMPOTENCY_HEADER.toLowerCase()) return value;
  }
  return undefined;
}

/** Monotonic suffix, so two keys minted in the same millisecond still differ. */
let idempotencyCounter = 0;

/**
 * A random, collision-resistant key.
 *
 * `crypto.randomUUID()` is not universally available: in Node 18 (this
 * package's declared floor) the Web Crypto global needed
 * `--experimental-global-webcrypto`, and in a browser `crypto` is only exposed
 * in a secure context. This walks down to `getRandomValues` and then to
 * `Math.random`, because a key that is merely unique is worth far more here than
 * no key at all — without one, a retry is a second charge.
 */
function randomIdempotencyKey(): string {
  const c: Crypto | undefined = (globalThis as { crypto?: Crypto }).crypto;
  if (typeof c?.randomUUID === "function") {
    return c.randomUUID();
  }
  const suffix = `-${(idempotencyCounter++).toString(36)}`;
  if (typeof c?.getRandomValues === "function") {
    const bytes = c.getRandomValues(new Uint8Array(16));
    return (
      Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("") + suffix
    );
  }
  // Last resort. Not cryptographic, but the key only has to be unique within
  // one API credential's 24-hour window.
  return (
    `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}` +
    `${Date.now().toString(36)}${suffix}`
  );
}

/**
 * A fresh key for one logical call, or `undefined` if the call is not guarded.
 *
 * Minted per `rawRequest` invocation, NOT per HTTP attempt: that is the whole
 * point. This client retries 429/408 and 5xx up to `maxRetries` times by
 * default, and a 504 arriving after a render had already started used to bill
 * the same job again on every retry. Reusing one key across the attempts of a
 * single call turns those retries into replays.
 *
 * A key is deliberately never carried across separate calls: two calls with the
 * same arguments are two requests the caller asked for, and collapsing them
 * would lose a generation somebody paid for.
 */
function idempotencyKeyFor(options: RequestOptions): string | undefined {
  if (options.method !== "POST" && options.method !== "PUT" && options.method !== "PATCH") {
    return undefined;
  }
  if (options.stream) return undefined;
  // An explicit key on the request wins (the video timeline methods take an
  // `idempotencyKey` option), so it must never be clobbered by a minted one:
  // that would be a de-duplication bug with a charge behind it. A
  // caller-supplied key can be stable across process restarts; the one minted
  // below deliberately cannot. rawRequest() still treats it as the call's key
  // for the in-flight wait (see callerIdempotencyKey()).
  if (callerIdempotencyKey(options)) return undefined;
  const path = options.path;
  if (!IDEMPOTENT_PREFIXES.some((p) => path.startsWith(p))) return undefined;
  if (IDEMPOTENCY_EXCLUDE_PREFIXES.some((p) => path.startsWith(p))) return undefined;
  return randomIdempotencyKey();
}

/**
 * FOTOhub AI Platform SDK client.
 *
 * Provides methods for image generation, video generation, music generation,
 * speech synthesis, transcription, chat/LLM completions, image analysis,
 * Stability AI tools, billing management, and webhook configuration.
 *
 * @example
 * ```typescript
 * import { FotoHub } from "fotohub";
 *
 * const client = new FotoHub({ apiKey: "your-api-key" });
 *
 * // Generate an image
 * const result = await client.generateImage({ prompt: "A sunset over mountains" });
 * console.log(result.images[0]);
 *
 * // Stream a chat response
 * const stream = await client.chatStream({
 *   messages: [{ role: "user", content: "Hello!" }],
 * });
 * for await (const chunk of stream) {
 *   process.stdout.write(chunk.choices[0]?.delta.content ?? "");
 * }
 * ```
 */
export class FotoHub {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly fetchFn: typeof globalThis.fetch;

  constructor(config: FotoHubConfig) {
    if (!config.apiKey) {
      throw new FotoHubError(
        "API key is required. Get yours at https://fotohub.app/settings/api",
        "missing_api_key"
      );
    }

    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.fetchFn = config.fetch ?? globalThis.fetch;

    if (!this.fetchFn) {
      throw new FotoHubError(
        "fetch is not available. Use Node.js 18+ or provide a custom fetch implementation.",
        "missing_fetch"
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AI GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate images from a text prompt.
   *
   * @param options - Image generation parameters
   * @returns Generated image result with URLs, the USD charged, and metadata
   *
   * @example
   * ```typescript
   * const result = await client.generateImage({
   *   prompt: "A futuristic cityscape at night",
   *   model: "seedream-5-0-260128",
   *   aspect_ratio: "16:9",
   *   num_images: 2,
   * });
   *
   * for (const imageUrl of result.images) {
   *   console.log(imageUrl);
   * }
   * ```
   */
  async generateImage(options: GenerateImageOptions): Promise<ImageResult> {
    const body: Record<string, unknown> = {
      prompt: options.prompt,
      model: options.model ?? DEFAULT_IMAGE_MODEL,
    };

    if (options.negative_prompt !== undefined) body.negative_prompt = options.negative_prompt;
    if (options.width !== undefined) body.width = options.width;
    if (options.height !== undefined) body.height = options.height;
    if (options.aspect_ratio !== undefined) body.aspect_ratio = options.aspect_ratio;
    if (options.num_images !== undefined) body.num_images = options.num_images;
    if (options.image_size !== undefined) body.image_size = options.image_size;
    if (options.guidance_scale !== undefined) body.guidance_scale = options.guidance_scale;
    if (options.steps !== undefined) body.steps = options.steps;
    if (options.seed !== undefined) body.seed = options.seed;
    if (options.style !== undefined) body.style = options.style;
    if (options.output_format !== undefined) body.output_format = options.output_format;
    if (options.reference_image_url !== undefined) body.reference_image_url = options.reference_image_url;
    if (options.reference_strength !== undefined) body.reference_strength = options.reference_strength;

    return await this.request<ImageResult>({
      method: "POST",
      path: "/v1/ai/generate/image",
      body,
      requiresAuth: true,
    });
  }

  /**
   * Generate an image with IDA Q 1.0, FOTOhub's proprietary image model.
   *
   * Unlike {@link generateImage}, IDA Q 1.0 runs on a self-hosted, single-GPU
   * queue and is asynchronous — generation takes 30 seconds to ~3.5 minutes
   * depending on `image_size`. This method submits the job and polls until it
   * completes, returning the finished result. Any prompt (including non-English
   * text) is automatically translated and restructured for best results — see
   * the {@link https://docs.fotohub.app/api/ida-q | IDA Q 1.0 docs}.
   *
   * @param options - IDA Q 1.0 generation parameters
   * @returns The finished image result once generation completes
   *
   * @example
   * ```typescript
   * const result = await client.generateIdaQ({
   *   prompt: "A cinematic portrait of an astronaut on Mars at sunset",
   *   aspect_ratio: "16:9",
   *   image_size: "1.5K",
   * });
   * console.log(result.images[0]);
   * ```
   */
  async generateIdaQ(options: GenerateIdaQOptions): Promise<ImageResult> {
    const body: Record<string, unknown> = {
      prompt: options.prompt,
      model: "ida-q-image",
      aspect_ratio: options.aspect_ratio ?? "1:1",
      image_size: options.image_size ?? "1K",
      num_images: options.num_images ?? 1,
    };
    if (options.seed !== undefined) body.seed = options.seed;

    const submitResult = await this.request<IdaQJobSubmitResult>({
      method: "POST",
      path: "/v1/ai/generate/image",
      body,
      requiresAuth: true,
    });

    const pollIntervalMs = (options.poll_interval_seconds ?? 3) * 1000;
    const timeoutMs = (options.timeout_seconds ?? 300) * 1000;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const status = await this.request<IdaQJobStatus>({
        method: "GET",
        path: `/v1/ai/generate/image/ida-q/${submitResult.job_id}`,
        requiresAuth: true,
      });

      if (status.status === "completed") {
        return {
          model: "ida-q-image",
          // The charge happens at submit, not at completion, so the poll never
          // reports it — carry it across. `billing.cost_usd` is the same figure.
          cost_usd: submitResult.cost_usd ?? submitResult.billing?.cost_usd,
          billing: submitResult.billing,
          images: status.images ?? [],
          metadata: status.metadata as ImageMetadata | undefined,
        };
      }
      if (status.status === "failed") {
        throw new FotoHubError(status.error ?? "IDA Q 1.0 generation failed", "generation_failed");
      }

      await this.sleep(pollIntervalMs);
    }

    throw new TimeoutError(`IDA Q 1.0 job ${submitResult.job_id} did not complete within ${options.timeout_seconds ?? 300}s`);
  }

  /**
   * Edit an existing image using AI (inpaint, outpaint, background swap, upscale, or remove background).
   *
   * @param options - Image editing parameters including mode and image URL
   * @returns Edited image result with processed URLs
   *
   * @example
   * ```typescript
   * const result = await client.editImage({
   *   image_url: "https://example.com/photo.jpg",
   *   prompt: "Replace the sky with a sunset",
   *   mode: "inpaint",
   *   mask_url: "https://example.com/mask.png",
   * });
   * console.log(result.images[0]);
   * ```
   */
  async editImage(options: EditImageOptions): Promise<EditResult> {
    const body: Record<string, unknown> = {
      image_url: options.image_url,
      prompt: options.prompt,
      mode: options.mode,
    };

    if (options.mask_url !== undefined) body.mask_url = options.mask_url;
    if (options.model !== undefined) body.model = options.model;

    return await this.request<EditResult>({
      method: "POST",
      path: "/v1/ai/edit/image",
      body,
      requiresAuth: true,
    });
  }

  /**
   * Generate a video from a text prompt, resolving once the file is ready.
   *
   * Most models render inside the request. Some (Alibaba Wan, xAI Grok) answer
   * immediately with `status: "processing"` and a `job_id` instead, so this
   * polls until the job reaches a terminal state — either way the resolved
   * result carries `video_url`.
   *
   * `duration` is snapped to a length the provider actually renders (Veo accepts
   * only 4/6/8s, Kling 5/10s) and the charge follows the snapped value, so read
   * `duration` on the result rather than assuming your request.
   *
   * Credits for a failed video are refunded automatically, so a thrown
   * {@link JobFailedError} does not mean you paid for an undelivered render.
   *
   * @param options - Video generation parameters
   * @returns Completed video result with `video_url`
   *
   * @example
   * ```typescript
   * const video = await client.generateVideo({
   *   prompt: "A drone flying over a forest at sunset",
   *   model: "veo-2",
   *   duration: 5,
   *   aspect_ratio: "16:9",
   * });
   * console.log(video.video_url);
   * ```
   */
  async generateVideo(options: GenerateVideoOptions): Promise<VideoResult> {
    const body: Record<string, unknown> = {
      prompt: options.prompt,
    };

    if (options.model !== undefined) body.model = options.model;
    if (options.duration !== undefined) body.duration = options.duration;
    if (options.aspect_ratio !== undefined) body.aspect_ratio = options.aspect_ratio;
    if (options.image_url !== undefined) body.image_url = options.image_url;
    if (options.resolution !== undefined) body.resolution = options.resolution;
    if (options.negative_prompt !== undefined) body.negative_prompt = options.negative_prompt;
    if (options.seed !== undefined) body.seed = options.seed;
    if (options.guidance_scale !== undefined) body.guidance_scale = options.guidance_scale;
    if (options.fps !== undefined) body.fps = options.fps;

    const submitted = await this.request<VideoResult>({
      method: "POST",
      path: "/v1/ai/generate/video",
      body,
      requiresAuth: true,
    });

    // Already finished, or queued with nothing pollable: hand it back as-is.
    if (submitted.video_url || submitted.status !== "processing" || !submitted.job_id) {
      return submitted;
    }

    const jobId = submitted.job_id;
    const pollInterval = options.pollInterval ?? 5_000;
    const maxWait = options.maxWait ?? 900_000;
    const startTime = Date.now();

    while (true) {
      if (Date.now() - startTime >= maxWait) {
        throw new JobTimeoutError(
          jobId,
          `Video job ${jobId} did not complete within ${Math.round(maxWait / 1000)}s. ` +
            `It may still finish — poll GET /v1/ai/generate/video/${jobId}.`
        );
      }

      await this.sleep(pollInterval);

      const result = await this.request<VideoResult>({
        method: "GET",
        path: `/v1/ai/generate/video/${jobId}`,
        requiresAuth: true,
      });

      options.onProgress?.(result);

      // The poll route reports job state, not the charge — only the submit
      // response carries the price. Returning the poll body alone left
      // `cost_usd` undefined on exactly the models that queue, so carry it
      // across rather than making callers hold on to the submit result.
      if (result.status === "completed") {
        return {
          ...result,
          cost_usd:
            result.cost_usd ?? submitted.cost_usd ?? submitted.billing?.cost_usd,
        };
      }
      if (result.status === "failed" || result.status === "cancelled") {
        throw new JobFailedError(
          jobId,
          result.error || `Video job ${jobId} ${result.status}`
        );
      }
    }
  }

  /**
   * Generate a video with a Seedance model, waiting for the result.
   *
   * Unlike {@link generateVideo}, the Seedance family is asynchronous: the API
   * answers 202 with a `job_id` and the render runs in a queue. This method
   * submits, polls, and resolves once the job is finished, so the result already
   * contains `video_url`.
   *
   * `seedance-2-5` (the default) is the only model on the platform that produces
   * a 30-second clip in one request, and the only one that accepts a source
   * video for editing or extension. Video is billed per second of output, and
   * 720p costs more per second than 480p; native audio is included, so
   * `generate_audio` does not change the price. Call `GET /v1/pricing` for the
   * current per-second rate — it is the provider's own, 1:1. It does **not** do
   * 1080p or 4K; those return a 400. For higher resolution use
   * `seedance-2-0-pro` (up to 4K, but capped at 15s).
   *
   * @param options - Seedance generation parameters
   * @returns The finished job, including `video_url` and `cost_usd`
   *
   * @example
   * ```typescript
   * // A 30-second clip with audio, billed per second at 720p
   * const video = await client.generateSeedance({
   *   prompt: "A chef plates a dish in a warm kitchen, steam rising, slow push-in",
   *   duration: 30,
   *   resolution: "720p",
   *   generate_audio: true,
   *   onProgress: (r) => console.log(`${r.status} ${r.progress ?? 0}%`),
   * });
   * console.log(video.video_url);
   * ```
   *
   * @example
   * ```typescript
   * // Edit an existing clip — aspect ratio and duration follow the source
   * const edited = await client.generateSeedance({
   *   prompt: "Replace the grey sky with a clear blue sky and warm afternoon light",
   *   reference_videos: ["https://s1.fotohub.app/storage/v1/object/public/videos/source.mp4"],
   *   duration: -1,
   * });
   * console.log(edited.task_type); // "editing"
   * ```
   */
  async generateSeedance(options: GenerateSeedanceOptions): Promise<SeedanceResult> {
    const body: Record<string, unknown> = {
      prompt: options.prompt,
      model: options.model ?? DEFAULT_SEEDANCE_MODEL,
      duration: options.duration ?? 5,
      resolution: options.resolution ?? "720p",
      aspect_ratio: options.aspect_ratio ?? "16:9",
      generate_audio: options.generate_audio ?? false,
    };

    // Only send what was set. An explicit `reference_videos: undefined` would
    // serialize away anyway, but `null` reads as an empty reference list, which
    // changes the task type the model infers.
    if (options.image_url !== undefined) body.image_url = options.image_url;
    if (options.last_frame_url !== undefined) body.last_frame_url = options.last_frame_url;
    if (options.reference_images !== undefined) body.reference_images = options.reference_images;
    if (options.reference_videos !== undefined) body.reference_videos = options.reference_videos;
    if (options.reference_audios !== undefined) body.reference_audios = options.reference_audios;
    if (options.asset_ids !== undefined) body.asset_ids = options.asset_ids;
    if (options.output_format !== undefined) body.output_format = options.output_format;
    if (options.negative_prompt !== undefined) body.negative_prompt = options.negative_prompt;
    if (options.seed !== undefined) body.seed = options.seed;
    if (options.callback_url !== undefined) body.callback_url = options.callback_url;
    if (options.smart_ratio) body.smart_ratio = true;
    if (options.smart_duration) body.smart_duration = true;

    const submitted = await this.request<SeedanceResult>({
      method: "POST",
      path: "/v1/ai/generate/video",
      body,
      requiresAuth: true,
    });

    // A non-Seedance model id was passed: that path is synchronous and has
    // already returned the finished video, so there is no job to poll.
    if (!submitted.job_id) return submitted;

    const jobId = submitted.job_id;
    const pollInterval = options.pollInterval ?? 10_000;
    const maxWait = options.maxWait ?? 1_800_000;
    const startTime = Date.now();

    while (true) {
      if (Date.now() - startTime >= maxWait) {
        throw new JobTimeoutError(
          jobId,
          `Seedance job ${jobId} did not complete within ${Math.round(maxWait / 1000)}s. ` +
            `It may still finish — poll GET /v1/ai/generate/video/${jobId}.`
        );
      }

      const result = await this.request<SeedanceResult>({
        method: "GET",
        path: `/v1/ai/generate/video/${jobId}`,
        requiresAuth: true,
      });

      options.onProgress?.(result);

      if (result.status === "completed") return result;
      if (result.status === "failed" || result.status === "cancelled") {
        throw new JobFailedError(
          jobId,
          result.error_message || `Seedance job ${jobId} ${result.status}`
        );
      }

      await this.sleep(pollInterval);
    }
  }

  /**
   * Register a hosted portrait as a reusable Seedance asset.
   *
   * Free — nothing is charged to the wallet. Pass the returned `uri` (or bare id) in
   * `asset_ids` on {@link generateSeedance} so the same face appears across
   * generations.
   *
   * @param imageUrl - HTTPS URL on a FOTOhub host. Upload the file first;
   *   third-party URLs are refused.
   *
   * @example
   * ```typescript
   * const asset = await client.registerVideoAsset(
   *   "https://s1.fotohub.app/storage/v1/object/public/photos/face.jpg"
   * );
   * const video = await client.generateSeedance({
   *   prompt: "The same woman walks through a night market, neon on wet pavement",
   *   duration: 15,
   *   asset_ids: [asset.uri],
   * });
   * ```
   */
  async registerVideoAsset(imageUrl: string): Promise<RegisterVideoAssetResult> {
    return await this.request<RegisterVideoAssetResult>({
      method: "POST",
      path: "/v1/ai/assets/register",
      body: { image_url: imageUrl },
      requiresAuth: true,
    });
  }

  /**
   * Generate music from a text description.
   *
   * @param options - Music generation parameters
   * @returns Generated music result with audio URL and duration
   *
   * @example
   * ```typescript
   * const result = await client.generateMusic({
   *   prompt: "Upbeat electronic track, 120 BPM, energetic",
   *   model: "minimax",
   *   duration: 30,
   *   instrumental: true,
   * });
   * console.log(result.audio_url);
   * ```
   */
  async generateMusic(options: GenerateMusicOptions): Promise<MusicResult> {
    const body: Record<string, unknown> = {
      prompt: options.prompt,
    };

    if (options.model !== undefined) body.model = options.model;
    if (options.duration !== undefined) body.duration = options.duration;
    if (options.genre !== undefined) body.genre = options.genre;
    if (options.mood !== undefined) body.mood = options.mood;
    if (options.tempo !== undefined) body.tempo = options.tempo;
    if (options.instrumental !== undefined) body.instrumental = options.instrumental;
    if (options.key !== undefined) body.key = options.key;
    if (options.output_format !== undefined) body.output_format = options.output_format;

    return await this.request<MusicResult>({
      method: "POST",
      path: "/v1/ai/generate/music",
      body,
      requiresAuth: true,
    });
  }

  /**
   * Generate a sound effect from a text description.
   *
   * @param options - SFX generation parameters
   * @returns Generated sound effect with audio URL
   *
   * @example
   * ```typescript
   * const result = await client.generateSfx({
   *   prompt: "Thunder rumbling in the distance",
   *   duration: 5,
   * });
   * console.log(result.audio_url);
   * ```
   */
  async generateSfx(options: GenerateSfxOptions): Promise<SfxResult> {
    const body: Record<string, unknown> = {
      prompt: options.prompt,
    };

    if (options.duration !== undefined) body.duration = options.duration;

    return await this.request<SfxResult>({
      method: "POST",
      path: "/v1/ai/generate/sfx",
      body,
      requiresAuth: true,
    });
  }

  /**
   * Generate speech audio from text (text-to-speech).
   *
   * @param options - Speech generation parameters (text, voice, language)
   * @returns Generated speech with audio URL
   *
   * @example
   * ```typescript
   * const result = await client.generateSpeech({
   *   text: "Welcome to FOTOhub, the AI creative platform.",
   *   model: "elevenlabs",
   *   voice_id: "alloy",
   *   language: "en",
   * });
   * console.log(result.audio_url);
   * ```
   */
  async generateSpeech(options: GenerateSpeechOptions): Promise<SpeechResult> {
    const body: Record<string, unknown> = {
      text: options.text,
    };

    if (options.voice_id !== undefined) body.voice_id = options.voice_id;
    if (options.model !== undefined) body.model = options.model;
    if (options.language !== undefined) body.language = options.language;
    if (options.speed !== undefined) body.speed = options.speed;
    if (options.pitch !== undefined) body.pitch = options.pitch;

    return await this.request<SpeechResult>({
      method: "POST",
      path: "/v1/ai/generate/speech",
      body,
      requiresAuth: true,
    });
  }

  /**
   * Transcribe an audio file to text (speech-to-text).
   *
   * @param options - Transcription parameters with audio URL
   * @returns Transcribed text with detected language
   *
   * @example
   * ```typescript
   * const result = await client.transcribe({
   *   audio_url: "https://example.com/recording.mp3",
   *   language: "en",
   * });
   * console.log(result.text);
   * ```
   */
  async transcribe(options: TranscribeOptions): Promise<TranscriptionResult> {
    const body: Record<string, unknown> = {
      audio_url: options.audio_url,
    };

    if (options.language !== undefined) body.language = options.language;

    return await this.request<TranscriptionResult>({
      method: "POST",
      path: "/v1/ai/transcribe",
      body,
      requiresAuth: true,
    });
  }

  /**
   * Create a chat completion (non-streaming). Compatible with OpenAI chat format.
   *
   * Billed on the tokens actually used, so the charge scales with the length of
   * the answer rather than being flat per request — a 120-in/350-out turn on
   * `gemini-flash` costs $0.000911. Input and output are priced separately
   * because every provider charges output several times input ($0.30 vs $2.50
   * per 1M tokens here). Read `billing.basis` to confirm the charge came from
   * real token counts.
   * Accepts only `gemini-flash`, `gemini-pro`, `gpt-4o` and `claude-sonnet` —
   * any other model id is rejected with 400 rather than silently substituted.
   *
   * @param options - Chat parameters (messages, model, temperature, etc.)
   * @returns Complete chat response with choices and usage info
   *
   * @example
   * ```typescript
   * const response = await client.chat({
   *   messages: [
   *     { role: "user", content: "Explain quantum computing in simple terms" }
   *   ],
   *   model: "gemini-flash",
   *   max_tokens: 1000,
   * });
   * console.log(response.choices[0].message.content);
   * console.log(response.billing?.cost_usd);      // e.g. 0.000911
   * console.log(response.billing?.balance_usd);   // what is left afterwards
   * ```
   */
  async chat(options: ChatOptions): Promise<ChatResult> {
    const body = this.buildChatBody(options, false);

    return await this.request<ChatResult>({
      method: "POST",
      path: "/v1/ai/chat/completions",
      body,
      requiresAuth: true,
    });
  }

  /**
   * @deprecated Not supported — always throws. `/v1/ai/chat/completions`
   * accepts `stream: true` for OpenAI compatibility and then ignores it,
   * returning one complete JSON body. `parseSSEStream` finds no `data:` frames
   * in that body, so the iterator completed after zero chunks and threw
   * nothing — an empty result for a request that was still billed. It now
   * throws before the request so the call stays free.
   *
   * For token-by-token output use `POST /v1/ai/agent/stream`, whose frames are
   * keyed by `type` (`text_delta`, `tool_use`, `done`, `error`) and terminated
   * by `data: [DONE]`. There is no SDK wrapper for it yet — call it with
   * `fetch`. See https://docs.fotohub.app/guides/streaming
   *
   * @throws {ValidationError} Always.
   */
  async chatStream(_options: ChatOptions): Promise<ChatStream> {
    throw new ValidationError(
      "chatStream() is not supported: /v1/ai/chat/completions never streams, so " +
        "the iterator would yield nothing while the request is still billed. Use " +
        "POST /v1/ai/agent/stream for token-by-token output — see " +
        "https://docs.fotohub.app/guides/streaming"
    );
  }

  /**
   * Create a chat completion via a premium Claude (Anthropic) model.
   *
   * @param options - Claude chat parameters
   * @returns Chat response from the Claude model
   *
   * @example
   * ```typescript
   * const response = await client.chatClaude({
   *   messages: [{ role: "user", content: "Summarize this document" }],
   *   model: "claude-sonnet-4.6",
   *   system: "You are a helpful summarizer.",
   *   max_tokens: 2000,
   * });
   * console.log(response.choices[0].message.content);
   * ```
   */
  async chatClaude(options: ChatClaudeOptions): Promise<ChatResult> {
    const messages = options.system
      ? [{ role: "system" as const, content: options.system }, ...options.messages]
      : options.messages;

    const body: Record<string, unknown> = {
      messages,
      stream: false,
    };

    if (options.model !== undefined) body.model = options.model;
    if (options.max_tokens !== undefined) body.max_tokens = options.max_tokens;
    if (options.temperature !== undefined) body.temperature = options.temperature;

    return await this.request<ChatResult>({
      method: "POST",
      path: "/v1/ai/chat/claude",
      body,
      requiresAuth: true,
    });
  }

  /**
   * @deprecated Use {@link chatClaude} instead. This method will be removed in
   * a future release.
   */
  async chatBedrock(options: ChatBedrockOptions): Promise<ChatResult> {
    return await this.chatClaude(options);
  }

  /**
   * Analyze an image to extract labels, objects, faces, a content-safety verdict,
   * OCR text, colors, landmarks or logos.
   *
   * Costs a flat 1 credit no matter how many features you request, so asking for
   * everything in one call is cheaper than one call per feature. Results land on
   * the response under the feature name (`result.labels`, `result.ocr`, ...) --
   * there is no `analysis` wrapper. `result.auto_tags` is the flat tag list.
   *
   * @param options - Analysis parameters with image URL and feature selection
   * @returns Analysis results (only the requested features are present)
   *
   * @example
   * ```typescript
   * const result = await client.analyzeImage({
   *   image_url: "https://example.com/photo.jpg",
   *   features: ["labels", "colors", "ocr"],
   * });
   * console.log(result.labels?.[0].name, result.ocr?.text);
   * ```
   */
  async analyzeImage(options: AnalyzeImageOptions): Promise<AnalysisResult> {
    const body: Record<string, unknown> = {
      image_url: options.image_url,
    };

    if (options.features !== undefined) body.features = options.features;
    if (options.language !== undefined) body.language = options.language;
    if (options.max_labels !== undefined) body.max_labels = options.max_labels;
    if (options.min_confidence !== undefined) body.min_confidence = options.min_confidence;

    return await this.request<AnalysisResult>({
      method: "POST",
      path: "/v1/ai/analyze/image",
      body,
      requiresAuth: true,
    });
  }

  /**
   * Enhance a prompt using AI to make it more detailed and effective for image generation.
   *
   * @param prompt - The original prompt to enhance
   * @param style - Optional style direction (e.g. "photorealistic", "anime", "oil painting")
   * @returns The enhanced prompt string
   *
   * @example
   * ```typescript
   * const enhanced = await client.enhancePrompt("a cat", "photorealistic");
   * // Returns something like: "A photorealistic close-up of a domestic cat..."
   * const result = await client.generateImage({ prompt: enhanced });
   * ```
   */
  async enhancePrompt(prompt: string, style?: string): Promise<string> {
    const body: Record<string, unknown> = { prompt };

    if (style !== undefined) body.style = style;

    const result = await this.request<{ enhanced_prompt: string }>({
      method: "POST",
      path: "/v1/ai/enhance-prompt",
      body,
      requiresAuth: true,
    });

    return result.enhanced_prompt;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STABILITY AI TOOLS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List all available Stability AI tools, their USD price, and what each requires.
   *
   * `price_usd` is per image and comes from the same rate table the charge reads,
   * so it cannot drift from what you are billed. The spread is wide — $0.03 for a
   * fast upscale against $0.60 for a creative one — so read it before you pick a
   * tool. The `credits` field is a deprecated legacy weight, not a price.
   *
   * @returns The tool descriptors
   *
   * @example
   * ```typescript
   * const tools = await client.listStabilityTools();
   * for (const tool of tools) {
   *   const needs = [
   *     tool.requires_mask && "mask",
   *     tool.requires_prompt && "prompt",
   *     tool.requires_reference && "reference image",
   *   ].filter(Boolean);
   *   console.log(
   *     `${tool.id}: $${tool.price_usd.toFixed(2)}/image, ` +
   *       `needs ${needs.join(", ") || "image only"}`,
   *   );
   * }
   * ```
   */
  async listStabilityTools(): Promise<StabilityTool[]> {
    // Wrapped as `{ "tools": [...] }` — unwrapped here, like `/v1/models`. The
    // documented `for (const tool of tools)` threw before this.
    const response = await this.request<
      { tools?: StabilityTool[] } | StabilityTool[]
    >({
      method: "GET",
      path: "/stability/tools",
      requiresAuth: true,
    });

    if (Array.isArray(response)) return response;
    return response?.tools ?? [];
  }

  /**
   * Run a specific Stability AI tool by ID with custom options.
   *
   * @param toolId - The tool identifier (e.g. "fast-upscale", "remove-background")
   * @param options - Tool-specific options including input image
   * @returns Processed image result
   *
   * @example
   * ```typescript
   * const result = await client.runStabilityTool("remove-background", {
   *   image: imageBase64,
   * });
   * console.log(result.image); // base64 result
   * ```
   */
  async runStabilityTool(toolId: string, options: StabilityOptions): Promise<StabilityResult> {
    const body: Record<string, unknown> = {
      image: options.image,
    };

    if (options.mask !== undefined) body.mask = options.mask;
    if (options.prompt !== undefined) body.prompt = options.prompt;
    if (options.reference !== undefined) body.reference = options.reference;
    if (options.search_prompt !== undefined) body.search_prompt = options.search_prompt;
    if (options.output_format !== undefined) body.output_format = options.output_format;
    if (options.seed !== undefined) body.seed = options.seed;
    if (options.negative_prompt !== undefined) body.negative_prompt = options.negative_prompt;
    if (options.left !== undefined) body.left = options.left;
    if (options.right !== undefined) body.right = options.right;
    if (options.up !== undefined) body.up = options.up;
    if (options.down !== undefined) body.down = options.down;

    return await this.request<StabilityResult>({
      method: "POST",
      path: `/stability/${encodeURIComponent(toolId)}`,
      body,
      requiresAuth: true,
    });
  }

  /**
   * Upscale an image using Stability AI. Supports fast, creative, and conservative modes.
   *
   * @param imageBase64 - Input image as base64 string
   * @param type - Upscale algorithm: "fast" (default), "creative", or "conservative"
   * @returns Upscaled image as base64
   *
   * @example
   * ```typescript
   * const result = await client.stabilityUpscale(imageBase64, "creative");
   * // result.image contains the upscaled base64 image
   * ```
   */
  async stabilityUpscale(
    imageBase64: string,
    type: "fast" | "creative" | "conservative" = "fast"
  ): Promise<StabilityResult> {
    return await this.runStabilityTool(`${type}-upscale`, { image: imageBase64 });
  }

  /**
   * Remove the background from an image using Stability AI.
   *
   * @param imageBase64 - Input image as base64 string
   * @returns Image with background removed (transparent)
   *
   * @example
   * ```typescript
   * const result = await client.stabilityRemoveBackground(imageBase64);
   * ```
   */
  async stabilityRemoveBackground(imageBase64: string): Promise<StabilityResult> {
    return await this.runStabilityTool("remove-background", { image: imageBase64 });
  }

  /**
   * Erase a region of an image defined by a mask using Stability AI.
   *
   * @param imageBase64 - Input image as base64 string
   * @param maskBase64 - Mask image as base64 (white = area to erase)
   * @returns Image with the masked region erased/filled
   *
   * @example
   * ```typescript
   * const result = await client.stabilityErase(imageBase64, maskBase64);
   * ```
   */
  async stabilityErase(imageBase64: string, maskBase64: string): Promise<StabilityResult> {
    return await this.runStabilityTool("erase-object", { image: imageBase64, mask: maskBase64 });
  }

  /**
   * Inpaint a region of an image (replace masked area with generated content).
   *
   * @param imageBase64 - Input image as base64 string
   * @param maskBase64 - Mask image as base64 (white = area to replace)
   * @param prompt - Description of what to generate in the masked area
   * @returns Image with the masked region replaced
   *
   * @example
   * ```typescript
   * const result = await client.stabilityInpaint(
   *   imageBase64, maskBase64, "a golden retriever sitting"
   * );
   * ```
   */
  async stabilityInpaint(
    imageBase64: string,
    maskBase64: string,
    prompt: string
  ): Promise<StabilityResult> {
    return await this.runStabilityTool("inpaint", {
      image: imageBase64,
      mask: maskBase64,
      prompt,
    });
  }

  /**
   * Extend an image beyond its borders (outpainting) using Stability AI.
   *
   * @param imageBase64 - Input image as base64 string
   * @param padding - Pixels to extend in each direction
   * @returns Extended image
   *
   * @example
   * ```typescript
   * const result = await client.stabilityOutpaint(imageBase64, {
   *   left: 200, right: 200, up: 0, down: 100,
   * });
   * ```
   */
  async stabilityOutpaint(imageBase64: string, padding: OutpaintPadding): Promise<StabilityResult> {
    return await this.runStabilityTool("outpaint", {
      image: imageBase64,
      left: padding.left,
      right: padding.right,
      up: padding.up,
      down: padding.down,
    });
  }

  /**
   * Search for an element in an image and replace it with something else.
   *
   * @param imageBase64 - Input image as base64 string
   * @param searchPrompt - Description of the element to find
   * @param replacePrompt - Description of what to replace it with
   * @returns Image with the element replaced
   *
   * @example
   * ```typescript
   * const result = await client.stabilitySearchReplace(
   *   imageBase64, "the red car", "a blue sports car"
   * );
   * ```
   */
  async stabilitySearchReplace(
    imageBase64: string,
    searchPrompt: string,
    replacePrompt: string
  ): Promise<StabilityResult> {
    return await this.runStabilityTool("search-replace", {
      image: imageBase64,
      search_prompt: searchPrompt,
      prompt: replacePrompt,
    });
  }

  /**
   * Recolor a specific element in an image to a new color.
   *
   * @param imageBase64 - Input image as base64 string
   * @param searchPrompt - Description of the element to recolor
   * @param newColor - The target color (e.g. "bright red", "navy blue")
   * @returns Image with the element recolored
   *
   * @example
   * ```typescript
   * const result = await client.stabilityRecolor(
   *   imageBase64, "the jacket", "deep purple"
   * );
   * ```
   */
  async stabilityRecolor(
    imageBase64: string,
    searchPrompt: string,
    newColor: string
  ): Promise<StabilityResult> {
    return await this.runStabilityTool("search-recolor", {
      image: imageBase64,
      search_prompt: searchPrompt,
      prompt: newColor,
    });
  }

  /**
   * Transfer the style of a reference image onto an input image.
   *
   * @param imageBase64 - Input image as base64 string
   * @param referenceBase64 - Style reference image as base64
   * @returns Image with the transferred style
   *
   * @example
   * ```typescript
   * const result = await client.stabilityStyleTransfer(
   *   photoBase64, artworkBase64
   * );
   * ```
   */
  async stabilityStyleTransfer(
    imageBase64: string,
    referenceBase64: string
  ): Promise<StabilityResult> {
    return await this.runStabilityTool("style-transfer", {
      image: imageBase64,
      reference: referenceBase64,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BILLING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get the current billing balance, tier, and overage configuration.
   *
   * @returns Full billing balance details
   *
   * @example
   * ```typescript
   * const balance = await client.getBalance();
   * console.log(`Tier: ${balance.tier}`);
   * ```
   */
  async getBalance(): Promise<BillingBalance> {
    return await this.request<BillingBalance>({
      method: "GET",
      path: "/v1/billing/balance",
      requiresAuth: true,
    });
  }

  /**
   * Get the full pricing catalog including all models, operations, and credit costs.
   *
   * @returns Pricing catalog with per-model costs
   *
   * @example
   * ```typescript
   * const pricing = await client.getPricing();
   * console.log(pricing.pricing);
   * ```
   */
  async getPricing(): Promise<PricingCatalog> {
    return await this.request<PricingCatalog>({
      method: "GET",
      path: "/v1/billing/pricing",
      requiresAuth: true,
    });
  }

  /**
   * Get available API subscription plans — **always empty**.
   *
   * @deprecated There are no paid API plans. Paid plans were retired on
   * 2026-08-13 and the endpoint answers `{"plans": []}`: a 200 with nothing to
   * iterate. Rate limits follow the prepaid USD wallet, so
   * {@link topupWallet} / {@link createTopup} is the upgrade path, and
   * {@link compareTiers} is what to show a customer choosing limits.
   *
   * Kept because it is a published route and returning an empty array is kinder
   * to existing loops than removing the method.
   *
   * @returns An empty array
   *
   * @example
   * ```typescript
   * const plans = await client.getPlans();
   * console.log(plans.length); // 0 — compare tiers and fund the wallet instead
   * ```
   */
  async getPlans(): Promise<ApiPlan[]> {
    // Wrapped as `{ "plans": [...] }`, like `/v1/models` — unwrapped here for
    // the same reason: typing the wrapper as an array made the documented
    // `for (const plan of plans)` throw "plans is not iterable".
    const response = await this.request<{ plans?: ApiPlan[] } | ApiPlan[]>({
      method: "GET",
      path: "/v1/billing/plans",
      requiresAuth: true,
    });

    if (Array.isArray(response)) return response;
    return response?.plans ?? [];
  }

  /**
   * @deprecated The API has no credits — it is prepaid in USD. This endpoint now
   * answers with your wallet and a message saying so; `remaining` and `total` are
   * not in the response. Use {@link getBalance}.
   *
   * Kept because an integration already polling it deserves a self-explanatory
   * 200 rather than a 404 it has to guess about.
   *
   * @returns The deprecation envelope, carrying the wallet and period spend
   *
   * @example
   * ```typescript
   * const info = await client.getCredits();
   * console.log(info.message);        // why this endpoint no longer has credits
   * console.log(info.wallet);         // where the money actually is
   * ```
   */
  async getCredits(): Promise<CreditsInfo> {
    return await this.request<CreditsInfo>({
      method: "GET",
      path: "/v1/billing/credits",
      requiresAuth: true,
    });
  }

  /**
   * Set a hard overage spending limit (in USD). When reached, API calls will be rejected.
   *
   * @param hardLimitUsd - Maximum monthly overage spending in USD.
   *   Pass 0 to disable (the wallet balance then becomes the only cap).
   * @param projectId - Optional project ID to scope the limit
   * @returns Updated overage configuration
   *
   * @example
   * ```typescript
   * await client.setOverageLimit(100); // $100 hard cap
   * ```
   */
  async setOverageLimit(hardLimitUsd: number, projectId?: string): Promise<OverageResult> {
    const body: Record<string, unknown> = {
      hard_limit_usd: hardLimitUsd,
    };

    if (projectId !== undefined) body.project_id = projectId;

    return await this.request<OverageResult>({
      method: "PUT",
      path: "/v1/billing/overage-limit",
      body,
      requiresAuth: true,
    });
  }

  /**
   * Get available wallet top-up packages.
   *
   * A package credits `total_usd` — the amount paid plus any volume bonus. From
   * $500 up, the bonus ladder adds extra spendable dollars: 5% at $500 rising to
   * 20% at $15,000, so $1,000 paid credits $1,100 and $15,000 credits $18,000.
   * The bonus is real balance, not a credit unit and not scoped to any feature.
   *
   * @returns Array of purchasable top-up packages
   *
   * @example
   * ```typescript
   * const packages = await client.getTopupPackages();
   * for (const pkg of packages) {
   *   console.log(`${pkg.name} → $${pkg.total_usd} in the wallet (+$${pkg.bonus_usd} free)`);
   * }
   * ```
   */
  async getTopupPackages(): Promise<TopupPackage[]> {
    // Wrapped as `{ "packages": [...] }` — unwrapped here, like `/v1/models`.
    const response = await this.request<
      { packages?: TopupPackage[] } | TopupPackage[]
    >({
      method: "GET",
      path: "/v1/billing/topup/packages",
      requiresAuth: true,
    });

    if (Array.isArray(response)) return response;
    return response?.packages ?? [];
  }

  /**
   * Get the top-up packages together with the bonus ladder and the custom-amount
   * bounds, i.e. the whole `GET /v1/billing/topup/packages` payload.
   *
   * Use this over {@link getTopupPackages} when quoting a custom amount: the
   * ladder is what decides the bonus, and `min_usd`/`max_usd` are what the API
   * will accept. Recomputing a bonus from a hardcoded table drifts the moment a
   * rung changes.
   *
   * @example
   * ```typescript
   * const { bonus_tiers, min_usd, max_usd } = await client.getTopupPackageList();
   * const bonusFor = (usd: number) => {
   *   const tier = bonus_tiers.find((t) => usd >= t.min_usd);
   *   // Floored to the cent, matching the server.
   *   return tier ? Math.floor(usd * tier.pct * 100) / 100 : 0;
   * };
   * console.log(bonusFor(2500)); // 300
   * ```
   */
  async getTopupPackageList(): Promise<TopupPackageList> {
    return await this.request<TopupPackageList>({
      method: "GET",
      path: "/v1/billing/topup/packages",
      requiresAuth: true,
    });
  }

  /**
   * Buy a wallet top-up package. Returns a checkout URL for payment.
   *
   * Payment credits `total_usd` (the amount paid plus any volume bonus) to the
   * prepaid wallet, which is the only thing that pays for API calls.
   *
   * @param packageSlug - The slug of the package to purchase. Starter rungs:
   *   "topup-50" ($15), "topup-100" ($25), "topup-250" ($60), "topup-500" ($120)
   *   — historical names that do NOT match their amounts. Bonus-earning rungs:
   *   "scale-500", "scale-1000", "scale-2000", "scale-3000", "scale-5000",
   *   "scale-7500", "scale-10000", "scale-15000", where the number IS the amount
   *   in USD. Call {@link getTopupPackages} rather than hardcoding a slug.
   * @returns Checkout session with payment URL
   *
   * @example
   * ```typescript
   * const topup = await client.createTopup("scale-1000"); // pay $1,000, get $1,100
   * // Redirect user to topup.checkout_url for payment
   * ```
   */
  async createTopup(packageSlug: string): Promise<TopupResult> {
    return await this.request<TopupResult>({
      method: "POST",
      path: "/v1/billing/topup",
      body: { package: packageSlug },
      requiresAuth: true,
    });
  }

  /**
   * Get paginated wallet ledger history — charges, refunds, top-ups.
   *
   * The rows arrive under `data` and there is no total count, so page until a
   * page comes back shorter than `pageSize`. Amounts are signed: negative is a
   * charge. `amount_usd` is `null` on rows older than the 2026-08-05 USD
   * cutover, which carry `amount_pln` instead.
   *
   * @param options - Pagination and filter options
   * @returns One page of ledger rows
   *
   * @example
   * ```typescript
   * const page = await client.getTransactions({ page: 1, pageSize: 50 });
   * for (const tx of page.data) {
   *   const amount =
   *     tx.amount_usd !== null && tx.amount_usd !== undefined
   *       ? `$${tx.amount_usd.toFixed(6)}`
   *       : `${tx.amount_pln ?? 0} PLN (pre-USD)`;
   *   console.log(`${tx.type}: ${amount} — ${tx.description}`);
   * }
   * ```
   */
  async getTransactions(options: TransactionOptions = {}): Promise<TransactionPage> {
    const query: Record<string, string | number | undefined> = {};

    if (options.page !== undefined) query.page = options.page;
    if (options.pageSize !== undefined) query.page_size = options.pageSize;
    if (options.type !== undefined) query.type = options.type;

    return await this.request<TransactionPage>({
      method: "GET",
      path: "/v1/billing/transactions",
      query,
      requiresAuth: true,
    });
  }

  /**
   * Estimate the credit cost of one or more operations before executing them.
   *
   * @param operations - Array of operations to estimate
   * @returns Cost estimate with per-operation breakdown
   *
   * @example
   * ```typescript
   * const estimate = await client.estimateCost([
   *   { type: "generate_image", model: "seedream-5-0-260128", count: 4 },
   *   { type: "generate_video", model: "seedance-2-0-mini", duration: 10 },
   * ]);
   * // `sufficient` comes from the server: it compares the total against your
   * // wallet, so you never have to compare two numbers you may have parsed as 0.
   * console.log(`$${estimate.total_usd} vs $${estimate.balance_usd} — ok: ${estimate.sufficient}`);
   * // Check `priced`: a leg with no published rate is excluded from the total
   * // rather than silently counted as free.
   * if (!estimate.priced) console.warn("Estimate is partial", estimate.breakdown);
   * ```
   */
  async estimateCost(operations: CostOperation[]): Promise<CostEstimate> {
    return await this.request<CostEstimate>({
      method: "POST",
      path: "/v1/billing/estimate",
      body: { operations },
      requiresAuth: true,
    });
  }

  /**
   * Get the Stripe payment history for the account.
   *
   * This endpoint authenticates with a **browser session JWT**, not an `fh_` API
   * key, so an SDK client configured with an API key gets a 401 here. Read the
   * history in the console at `/console/billing` instead. The method is kept
   * because a caller holding a Supabase JWT can use it.
   *
   * These are payment records for wallet top-ups and subscriptions — not
   * per-generation charges, which are in the wallet ledger
   * ({@link getTransactions}).
   *
   * @returns The payment records. Empty when Stripe cannot be reached.
   *
   * @example
   * ```typescript
   * const invoices = await client.getInvoices();
   * for (const inv of invoices) {
   *   console.log(`${inv.number}: ${inv.amount} ${inv.currency} — ${inv.status}`);
   * }
   * ```
   */
  async getInvoices(): Promise<Invoice[]> {
    // Wrapped as `{ "invoices": [...] }` — unwrapped here, like `/v1/models`.
    const response = await this.request<{ invoices?: Invoice[] } | Invoice[]>({
      method: "GET",
      path: "/v1/billing/invoices",
      requiresAuth: true,
    });

    if (Array.isArray(response)) return response;
    return response?.invoices ?? [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBHOOKS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List all webhook subscriptions.
   *
   * @returns Array of webhook objects
   *
   * @example
   * ```typescript
   * const webhooks = await client.listWebhooks();
   * for (const wh of webhooks) {
   *   console.log(`${wh.name}: ${wh.url} — ${wh.events.join(", ")}`);
   * }
   * ```
   */
  async listWebhooks(): Promise<Webhook[]> {
    return await this.request<Webhook[]>({
      method: "GET",
      path: "/v1/console/webhooks",
      requiresAuth: true,
    });
  }

  /**
   * Create a new webhook subscription. The response includes a signing secret
   * for verifying webhook payloads.
   *
   * @param options - Webhook configuration (name, URL, events)
   * @returns Created webhook with signing secret
   *
   * @example
   * ```typescript
   * const webhook = await client.createWebhook({
   *   name: "Production Notifications",
   *   url: "https://myapp.com/webhooks/fotohub",
   *   events: ["generation.completed", "generation.failed"],
   * });
   * console.log(`Secret: ${webhook.secret}`); // Store securely
   * ```
   */
  async createWebhook(options: CreateWebhookOptions): Promise<Webhook> {
    const body: Record<string, unknown> = {
      name: options.name,
      url: options.url,
      events: options.events,
    };

    if (options.headers !== undefined) body.headers = options.headers;

    return await this.request<Webhook>({
      method: "POST",
      path: "/v1/console/webhooks",
      body,
      requiresAuth: true,
    });
  }

  /**
   * Update an existing webhook subscription.
   *
   * @param webhookId - The webhook ID to update
   * @param options - Fields to update (partial)
   * @returns Updated webhook object
   *
   * @example
   * ```typescript
   * const updated = await client.updateWebhook("wh_123", {
   *   events: ["generation.completed"],
   *   active: true,
   * });
   * ```
   */
  async updateWebhook(webhookId: string, options: UpdateWebhookOptions): Promise<Webhook> {
    const body: Record<string, unknown> = {};

    if (options.name !== undefined) body.name = options.name;
    if (options.url !== undefined) body.url = options.url;
    if (options.events !== undefined) body.events = options.events;
    if (options.active !== undefined) body.active = options.active;
    if (options.headers !== undefined) body.headers = options.headers;

    return await this.request<Webhook>({
      method: "PATCH",
      path: `/v1/console/webhooks/${encodeURIComponent(webhookId)}`,
      body,
      requiresAuth: true,
    });
  }

  /**
   * Delete a webhook subscription.
   *
   * @param webhookId - The webhook ID to delete
   *
   * @example
   * ```typescript
   * await client.deleteWebhook("wh_123");
   * ```
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.request<void>({
      method: "DELETE",
      path: `/v1/console/webhooks/${encodeURIComponent(webhookId)}`,
      requiresAuth: true,
    });
  }

  /**
   * Send a test event to a webhook to verify it is receiving payloads correctly.
   *
   * @param webhookId - The webhook ID to test
   * @returns Test result with HTTP status and response time
   *
   * @example
   * ```typescript
   * const test = await client.testWebhook("wh_123");
   * if (test.success) {
   *   console.log(`Delivered in ${test.response_time_ms}ms`);
   * }
   * ```
   */
  async testWebhook(webhookId: string): Promise<WebhookTestResult> {
    return await this.request<WebhookTestResult>({
      method: "POST",
      path: `/v1/console/webhooks/${encodeURIComponent(webhookId)}/test`,
      requiresAuth: true,
    });
  }

  /**
   * Get delivery logs for a webhook (recent attempts with status codes).
   *
   * @param webhookId - The webhook ID
   * @returns Array of delivery log entries
   *
   * @example
   * ```typescript
   * const logs = await client.getWebhookLogs("wh_123");
   * for (const log of logs) {
   *   console.log(`${log.event}: ${log.status_code} — ${log.success ? "OK" : "FAILED"}`);
   * }
   * ```
   */
  async getWebhookLogs(webhookId: string): Promise<WebhookLog[]> {
    return await this.request<WebhookLog[]>({
      method: "GET",
      path: `/v1/console/webhooks/${encodeURIComponent(webhookId)}/logs`,
      requiresAuth: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVENIENCE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Remove the background from an image (convenience wrapper).
   *
   * @param imageUrl - URL of the image to process
   * @returns Processed image with transparent background
   *
   * @example
   * ```typescript
   * const result = await client.removeBackground("https://example.com/photo.jpg");
   * console.log(result.images[0]);
   * ```
   */
  async removeBackground(imageUrl: string): Promise<EditResult> {
    return await this.editImage({
      image_url: imageUrl,
      prompt: "Remove background",
      mode: "remove_bg",
    });
  }

  /**
   * Upscale an image to a higher resolution (convenience wrapper).
   *
   * @param imageUrl - URL of the image to upscale
   * @param scale - Scale factor (default: 2)
   * @returns Upscaled image
   *
   * @example
   * ```typescript
   * const result = await client.upscaleImage("https://example.com/photo.jpg", 4);
   * console.log(result.images[0]);
   * ```
   */
  async upscaleImage(imageUrl: string, scale: number = 2): Promise<EditResult> {
    return await this.editImage({
      image_url: imageUrl,
      prompt: `Upscale ${scale}x`,
      mode: "upscale",
    });
  }

  /**
   * Return a finished video result.
   *
   * @deprecated Video generation is synchronous — `generateVideo()` already
   * returns the finished `video_url`, so there is no job to poll. This method
   * now simply returns the result from `generateVideo()` unchanged, and will be
   * removed in a future release.
   *
   * @param result - The result returned by `generateVideo()`
   * @param options - Ignored (kept for backwards compatibility)
   * @returns The finished video result
   *
   * @example
   * ```typescript
   * const video = await client.generateVideo({ prompt: "Ocean waves" });
   * console.log(video.video_url);
   * ```
   */
  async waitForVideo(result: VideoResult, _options: PollOptions = {}): Promise<VideoResult> {
    if (result && typeof result === "object") {
      return result;
    }
    throw new ValidationError(
      "waitForVideo() no longer accepts a job_id: video generation is synchronous. " +
        "Pass the result returned by generateVideo() (or just read its video_url)."
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3D GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate a 3D model from an image or text prompt.
   *
   * **Synchronous** — this resolves with the finished model. There is no job
   * queue and nothing to poll. `fh-pro-3d` can take ~60s, so the timeout below
   * is deliberately generous.
   *
   * Charged in USD from the prepaid wallet before the GPU runs; a `402` means
   * insufficient funds and nothing was taken. A failure on our side is refunded.
   *
   * @param options - 3D generation parameters
   * @returns 3D result with a signed download URL (2h) and the USD charge
   *
   * @example
   * ```typescript
   * const result = await client.generate3D({
   *   mode: "image-to-3d",
   *   model: "fh-lite-3d",
   *   image: base64EncodedImage,
   *   format: "glb",
   * });
   * console.log(result.url);       // GLB file URL, already complete
   * console.log(result.cost_usd);  // what left the wallet
   * ```
   */
  async generate3D(options: Generate3DOptions): Promise<ThreeDResult> {
    const body: Record<string, unknown> = {
      mode: options.mode,
      model: options.model,
    };

    if (options.image !== undefined) body.image_base64 = options.image;
    if (options.prompt !== undefined) body.prompt = options.prompt;
    if (options.quality !== undefined) body.quality = options.quality;
    if (options.format !== undefined) body.format = options.format;
    if (options.options !== undefined) body.options = options.options;

    return await this.request<ThreeDResult>({
      method: "POST",
      path: "/v1/ai/generate/3d",
      body,
      requiresAuth: true,
      timeout: 120_000,
    });
  }

  /**
   * Fetch a stored 3D asset, with a freshly signed download URL.
   *
   * Not a status check: `generate3D()` is synchronous, so the model is already
   * finished when it resolves. What this is for is the expiry — the `url` from
   * the generate call dies after 2 hours, and this mints a new one. Free.
   *
   * Throws `NotFoundError` if no asset with that id belongs to your account.
   *
   * @param jobId - The `file_id` returned from `generate3D()`
   * @returns The stored asset with a fresh `url`
   *
   * @example
   * ```typescript
   * const asset = await client.get3DStatus(result.file_id!);
   * console.log(asset.url); // valid for another 2 hours
   * ```
   */
  async get3DStatus(jobId: string): Promise<ThreeDResult> {
    return await this.request<ThreeDResult>({
      method: "GET",
      path: `/v1/ai/generate/3d/${encodeURIComponent(jobId)}`,
      requiresAuth: true,
    });
  }

  /**
   * @deprecated There is nothing to wait for. `generate3D()` is synchronous and
   * resolves with the finished model, so this returns on its first poll — the
   * stored asset always reports `"completed"`. Kept so existing code keeps
   * working; new code should use the `generate3D()` result directly, or
   * `get3DStatus(file_id)` when it needs a fresh signed URL.
   *
   * The previous example passed `gen.id`, which the API never returns. That call
   * requested `/v1/ai/generate/3d/undefined` and always failed.
   *
   * @param jobId - The `file_id` returned from `generate3D()`
   * @param options - Polling configuration (effectively unused now)
   * @returns The stored 3D result with a fresh download URL
   *
   * @example
   * ```typescript
   * const gen = await client.generate3D({ mode: "text-to-3d", model: "fh-text-3d", prompt: "a castle" });
   * console.log(gen.url); // already done -- no wait needed
   * ```
   */
  async waitFor3D(jobId: string, options: ThreeDPollOptions = {}): Promise<ThreeDResult> {
    const pollInterval = options.pollInterval ?? 3_000;
    const maxWait = options.maxWait ?? 120_000;
    const startTime = Date.now();

    while (true) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= maxWait) {
        throw new JobTimeoutError(
          jobId,
          `3D generation job ${jobId} timed out after ${Math.round(maxWait / 1000)}s`
        );
      }

      const result = await this.get3DStatus(jobId);

      if (options.onProgress) {
        options.onProgress(result);
      }

      if (result.status === "completed") {
        return result;
      }

      if (result.status === "failed") {
        throw new JobFailedError(jobId, `3D generation job ${jobId} failed`);
      }

      await this.sleep(pollInterval);
    }
  }

  /**
   * List available 3D generation models with their capabilities and pricing.
   *
   * `price_usd` comes from the same rate table the charge does, so it cannot
   * drift from what you are billed.
   *
   * @returns Array of 3D models with USD prices and capabilities
   *
   * @example
   * ```typescript
   * const models = await client.list3DModels();
   * for (const m of models) {
   *   console.log(`${m.name}: $${m.price_usd} per request (${m.speed})`);
   * }
   * ```
   */
  async list3DModels(): Promise<ThreeDModelInfo[]> {
    // Wrapped as `{ "models": [...] }`, like `/v1/models` and
    // `/v1/billing/plans` — unwrapped here so the documented iteration works.
    const response = await this.request<
      { models?: ThreeDModelInfo[] } | ThreeDModelInfo[]
    >({
      method: "GET",
      path: "/v1/ai/generate/3d/models",
      requiresAuth: true,
    });

    if (Array.isArray(response)) return response;
    return response?.models ?? [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIDEO TIMELINE (headless editing of editor projects)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a timeline project, optionally from media and/or a template. The
   * result carries `editorUrl`, which opens the same project in the editor.
   * Free of charge. A retry with the same idempotency key (sent automatically,
   * or pass `idempotencyKey`) returns the first result instead of a second project.
   *
   * @example
   * ```typescript
   * const p = await client.createVideoProject({
   *   title: "Launch teaser",
   *   aspect: "9:16",
   *   media: [{ url: "https://example.com/clip.mp4" }],
   * });
   * console.log(p.projectId, p.editorUrl, p.unplacedMedia);
   * ```
   */
  async createVideoProject(options: CreateVideoProjectOptions = {}): Promise<VideoProject> {
    const body: Record<string, unknown> = {};
    if (options.title !== undefined) body.title = options.title;
    if (options.aspect !== undefined) body.aspect = options.aspect;
    if (options.fps !== undefined) body.fps = options.fps;
    if (options.media !== undefined) body.media = options.media;
    if (options.template !== undefined) {
      body.template =
        typeof options.template === "string" ? { id: options.template } : options.template;
    }
    if (options.placeMedia !== undefined) body.placeMedia = options.placeMedia;

    return this.request<VideoProject>({
      method: "POST",
      path: "/v1/video/projects",
      body,
      requiresAuth: true,
      headers: idempotencyHeaders(options.idempotencyKey),
    });
  }

  /** List your API-created timeline projects, newest first. */
  async listVideoProjects(options: { limit?: number } = {}): Promise<ListVideoProjectsResult> {
    return this.request<ListVideoProjectsResult>({
      method: "GET",
      path: "/v1/video/projects",
      query: { limit: options.limit },
      requiresAuth: true,
    });
  }

  /** Current state of a project: digest, media, `saveRev`, version history and `editorUrl`. */
  async getVideoProject(
    projectId: string,
    options: { includeDoc?: boolean } = {}
  ): Promise<VideoProject> {
    return this.request<VideoProject>({
      method: "GET",
      path: `/v1/video/projects/${encodeURIComponent(projectId)}`,
      query: { include: options.includeDoc ? "doc" : undefined },
      requiresAuth: true,
    });
  }

  /** Delete an API-created project. */
  async deleteVideoProject(projectId: string): Promise<{ deleted: boolean }> {
    return this.request<{ deleted: boolean }>({
      method: "DELETE",
      path: `/v1/video/projects/${encodeURIComponent(projectId)}`,
      requiresAuth: true,
    });
  }

  /**
   * Apply up to 40 operations to a project, atomically. A batch with any
   * violation is rolled back (`rolledBack: true`, HTTP 200, nothing saved).
   * Pass `expectedSaveRev` to detect concurrent edits: a stale value throws
   * {@link SaveConflictError} (code `save-conflict`, carrying `currentSaveRev`).
   * Free of charge.
   *
   * Retry safety: a 5xx, timeout or network failure leaves it unknown whether
   * the batch was saved, and replaying it would apply the operations twice. So
   * without `expectedSaveRev` this call is never retried automatically on such
   * a failure (the error is thrown; re-read the project with
   * {@link digestVideoProject} before deciding). With `expectedSaveRev` a
   * replay is safe, because a batch that did save answers `save-conflict`
   * instead of applying again, so the client retries as usual.
   *
   * @example
   * ```typescript
   * const r = await client.applyVideoOps(id, { ops, expectedSaveRev: p.saveRev });
   * if (r.rolledBack) console.log(r.violations);
   * ```
   */
  async applyVideoOps(projectId: string, options: ApplyVideoOpsOptions): Promise<ApplyOpsResult> {
    const body: Record<string, unknown> = { ops: options.ops };
    if (options.dryRun !== undefined) body.dryRun = options.dryRun;
    if (options.expectedSaveRev !== undefined) body.expectedSaveRev = options.expectedSaveRev;
    if (options.label !== undefined) body.label = options.label;

    return this.request<ApplyOpsResult>({
      method: "POST",
      path: `/v1/video/projects/${encodeURIComponent(projectId)}/ops`,
      body,
      requiresAuth: true,
      retryAmbiguous: options.expectedSaveRev !== undefined,
    });
  }

  /** The whole digest, or details of specific clips (`clipIds`, at most 10). */
  async digestVideoProject(
    projectId: string,
    options: VideoDigestOptions = {}
  ): Promise<VideoDigestResult> {
    const body: Record<string, unknown> = {};
    if (options.clipIds !== undefined) body.clipIds = options.clipIds;
    if (options.view !== undefined) body.view = options.view;

    return this.request<VideoDigestResult>({
      method: "POST",
      path: `/v1/video/projects/${encodeURIComponent(projectId)}/digest`,
      body,
      requiresAuth: true,
    });
  }

  /** Lint a project for problems (gaps, overlaps, missing media, ...). Free of charge. */
  async lintVideoProject(projectId: string, options: VideoLintOptions = {}): Promise<LintResult> {
    const body: Record<string, unknown> = {};
    if (options.rules !== undefined) body.rules = options.rules;
    if (options.severity !== undefined) body.severity = options.severity;

    return this.request<LintResult>({
      method: "POST",
      path: `/v1/video/projects/${encodeURIComponent(projectId)}/lint`,
      body,
      requiresAuth: true,
    });
  }

  /**
   * Capture frames of the timeline as contact sheets, so an agent can look at
   * its edit. Asynchronous and billed a flat fee: returns a queued job whose
   * finished form carries `frames`, `sheets` and `missing`. Pass `wait: true`
   * to poll until it is done. Give exactly one of `times`, `count`, `cuts`.
   */
  async captureVideoProject(projectId: string, options: CaptureVideoOptions): Promise<VideoJob> {
    const body: Record<string, unknown> = {};
    if (options.times !== undefined) body.times = options.times;
    if (options.count !== undefined) body.count = options.count;
    if (options.cuts !== undefined) body.cuts = options.cuts;
    if (options.width !== undefined) body.width = options.width;
    if (options.sheet !== undefined) body.sheet = options.sheet;

    const job = await this.request<VideoJob>({
      method: "POST",
      path: `/v1/video/projects/${encodeURIComponent(projectId)}/capture`,
      body,
      requiresAuth: true,
      headers: idempotencyHeaders(options.idempotencyKey),
    });
    if (!options.wait) return job;
    return this.waitForVideoJob(job.jobId, {
      intervalMs: options.intervalMs,
      maxWaitMs: options.maxWaitMs,
    });
  }

  /**
   * Render a project to a video file. Billed per output minute; a failed
   * render is refunded automatically (`refunded` on the failed job). Returns
   * the queued job, or with `wait: true` the finished one (`outputUrl`); a
   * failed render then throws {@link JobFailedError} with the job's `reason`
   * as its `code`.
   */
  async renderVideoProject(projectId: string, options: RenderVideoOptions = {}): Promise<VideoJob> {
    const body: Record<string, unknown> = {};
    for (const key of [
      "format",
      "codec",
      "quality",
      "resolution",
      "fps",
      "bitrate",
      "range",
      "contentCredentials",
      "contentAiDeclared",
    ] as const) {
      if (options[key] !== undefined) body[key] = options[key];
    }

    const job = await this.request<VideoJob>({
      method: "POST",
      path: `/v1/video/projects/${encodeURIComponent(projectId)}/render`,
      body,
      requiresAuth: true,
      headers: idempotencyHeaders(options.idempotencyKey),
    });
    if (!options.wait) return job;
    return this.waitForVideoJob(job.jobId, {
      intervalMs: options.intervalMs,
      maxWaitMs: options.maxWaitMs,
    });
  }

  /**
   * @experimental Auto-Edit is not generally available yet; the request and
   * job shapes may still change.
   *
   * Start a server-side Auto-Edit on a project. Returns the queued job; with
   * `wait: true` the finished one, whose `report` says what was done and
   * skipped. With `autoApply: false` the result stays a draft until
   * {@link applyVideoAutoEdit}.
   */
  async autoEditVideoProject(projectId: string, options: AutoEditOptions = {}): Promise<VideoJob> {
    const body: Record<string, unknown> = {};
    for (const key of [
      "style",
      "toggles",
      "language",
      "aspect",
      "aiBudgetUsd",
      "autoApply",
      "mode",
    ] as const) {
      if (options[key] !== undefined) body[key] = options[key];
    }

    const job = await this.request<VideoJob>({
      method: "POST",
      path: `/v1/video/projects/${encodeURIComponent(projectId)}/auto-edit`,
      body,
      requiresAuth: true,
      headers: idempotencyHeaders(options.idempotencyKey),
    });
    if (!options.wait) return job;
    return this.waitForVideoJob(job.jobId, {
      intervalMs: options.intervalMs,
      maxWaitMs: options.maxWaitMs,
    });
  }

  /**
   * @experimental See {@link autoEditVideoProject}.
   *
   * Commit the draft of an Auto-Edit job that ran with `autoApply: false`.
   */
  async applyVideoAutoEdit(projectId: string, jobId: string): Promise<VideoJob> {
    return this.request<VideoJob>({
      method: "POST",
      path: `/v1/video/projects/${encodeURIComponent(projectId)}/auto-edit/${encodeURIComponent(jobId)}/apply`,
      body: {},
      requiresAuth: true,
    });
  }

  /** Current state of a render, capture or auto-edit job. */
  async getVideoJob(jobId: string): Promise<VideoJob> {
    return this.request<VideoJob>({
      method: "GET",
      path: `/v1/video/jobs/${encodeURIComponent(jobId)}`,
      requiresAuth: true,
    });
  }

  /**
   * Poll a render / capture / auto-edit job until it completes.
   *
   * @throws {@link JobFailedError} when the job fails or is cancelled (its
   *   `code` is the job's `reason` when it has one, else `job_failed`;
   *   `details.refunded` says whether the charge was returned)
   * @throws {@link JobTimeoutError} after `maxWaitMs` (the job keeps running)
   */
  async waitForVideoJob(jobId: string, options: WaitForVideoJobOptions = {}): Promise<VideoJob> {
    const intervalMs = options.intervalMs ?? 3_000;
    const maxWait = options.maxWaitMs ?? 1_800_000;
    const startTime = Date.now();

    while (true) {
      const job = await this.getVideoJob(jobId);

      options.onProgress?.(job);

      if (job.status === "completed") return job;

      if (job.status === "failed" || job.status === "cancelled") {
        throw new JobFailedError(
          jobId,
          job.error ?? `Video job ${jobId} ${job.status}`,
          job.reason ?? "job_failed",
          { status: job.status, refunded: job.refunded }
        );
      }

      if (Date.now() - startTime + intervalMs >= maxWait) {
        throw new JobTimeoutError(
          jobId,
          `Video job ${jobId} timed out after ${Math.round(maxWait / 1000)}s`
        );
      }

      await this.sleep(intervalMs);
    }
  }

  /** JSON Schema of the operations accepted by {@link applyVideoOps}, with notes and limits. */
  async getVideoOpsCatalog(): Promise<VideoOpsCatalog> {
    return this.request<VideoOpsCatalog>({
      method: "GET",
      path: "/v1/video/ops/catalog",
      requiresAuth: true,
    });
  }

  /** Detect scene cuts in a video (`url`, or `projectId` + `mediaId`). Paid per request. */
  async detectVideoScenes(options: DetectScenesOptions): Promise<VideoAnalysisResult> {
    return this.request<VideoAnalysisResult>({
      method: "POST",
      path: "/v1/video/detect-scenes",
      body: options,
      requiresAuth: true,
    });
  }

  /** Detect silent ranges in audio or video. Paid per request. */
  async detectVideoSilence(options: DetectSilenceOptions): Promise<VideoAnalysisResult> {
    return this.request<VideoAnalysisResult>({
      method: "POST",
      path: "/v1/video/detect-silence",
      body: options,
      requiresAuth: true,
    });
  }

  /** Detect beats and tempo in audio or video. Paid per request. */
  async detectVideoBeats(options: DetectBeatsOptions): Promise<VideoAnalysisResult> {
    return this.request<VideoAnalysisResult>({
      method: "POST",
      path: "/v1/video/detect-beats",
      body: options,
      requiresAuth: true,
    });
  }

  /** Start a transcription job; poll it with {@link getVideoTranscription}. Paid per request. */
  async transcribeVideo(options: TranscribeVideoOptions): Promise<VideoTranscribeJob> {
    return this.request<VideoTranscribeJob>({
      method: "POST",
      path: "/v1/video/transcribe",
      body: options,
      requiresAuth: true,
    });
  }

  /** State (and, once `completed`, the result) of a transcription job. */
  async getVideoTranscription(jobId: string): Promise<VideoTranscribeJob> {
    return this.request<VideoTranscribeJob>({
      method: "GET",
      path: `/v1/video/transcribe/${encodeURIComponent(jobId)}`,
      requiresAuth: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIRTUAL TRY-ON
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Dress a person photo in a garment.
   *
   * Returns immediately with a job id — a render takes ~11 s, so collect the
   * result with `waitForTryOn()`.
   *
   * @example Single garment
   * ```ts
   * const job = await client.tryOn({
   *   personImageUrl: "https://example.com/person.jpg",
   *   garmentImageUrl: "https://example.com/shirt.png",
   *   category: "tops",
   * });
   * const done = await client.waitForTryOn(job.job_id);
   * console.log(done.images?.[0]);
   * ```
   *
   * @example Outfit — a top and a bottom in one job, one delivered image
   * ```ts
   * const job = await client.tryOn({
   *   personImageUrl: "https://example.com/person.jpg",
   *   garments: [
   *     { garmentImageUrl: "https://example.com/tee.png", category: "tops" },
   *     { garmentId: "0f1e…", category: "bottoms" },
   *   ],
   * });
   * ```
   */
  async tryOn(options: TryOnOptions): Promise<TryOnSubmitResult> {
    const body: Record<string, unknown> = {
      person_image_url: options.personImageUrl,
      num_images: options.numImages ?? 1,
    };

    // An outfit and a single garment are mutually exclusive request shapes;
    // sending both would leave the server to guess which was meant.
    if (options.garments && options.garments.length > 0) {
      body.garments = options.garments.map((g) => ({
        garment_image_url: g.garmentImageUrl,
        garment_id: g.garmentId,
        category: g.category,
        garment_photo_type: g.garmentPhotoType,
      }));
    } else {
      body.garment_image_url = options.garmentImageUrl;
      body.garment_id = options.garmentId;
      body.category = options.category ?? "tops";
      body.garment_photo_type = options.garmentPhotoType;
    }
    if (options.seed !== undefined) body.seed = options.seed;

    return await this.request<TryOnSubmitResult>({
      method: "POST",
      path: "/v1/ai/tryon",
      body,
      requiresAuth: true,
    });
  }

  /**
   * Check the status of a try-on job.
   */
  async getTryOnStatus(jobId: string): Promise<TryOnResult> {
    return await this.request<TryOnResult>({
      method: "GET",
      path: `/v1/ai/tryon/${jobId}`,
      requiresAuth: true,
    });
  }

  /**
   * Wait for a try-on job to complete, polling at intervals.
   *
   * A partially failed outfit resolves rather than throwing: the top-only
   * render comes back and one credit is refunded. Inspect
   * `result.metadata?.partial_failure` to detect it.
   */
  async waitForTryOn(jobId: string, options: TryOnPollOptions = {}): Promise<TryOnResult> {
    const pollInterval = options.pollInterval ?? 3_000;
    const maxWait = options.maxWait ?? 120_000;
    const startTime = Date.now();

    while (true) {
      if (Date.now() - startTime >= maxWait) {
        throw new JobTimeoutError(
          jobId,
          `Try-on job ${jobId} timed out after ${Math.round(maxWait / 1000)}s`
        );
      }

      const result = await this.getTryOnStatus(jobId);

      if (options.onProgress) {
        options.onProgress(result);
      }

      if (result.status === "completed") {
        return result;
      }

      if (result.status === "failed" || result.status === "cancelled") {
        throw new JobFailedError(
          jobId,
          result.error_message || `Try-on job ${jobId} ${result.status}`
        );
      }

      await this.sleep(pollInterval);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TIER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get the full tier catalog with all available tiers and their features.
   *
   * @returns Tier catalog with all PAYG and subscription tiers
   *
   * A tier sets how fast you may spend — requests per minute, burst, concurrency,
   * model access. It never funds anything: the prepaid USD wallet pays for every
   * call.
   *
   * Pay-as-you-go and subscription tiers come back in two separate arrays —
   * there is no flat `tiers` list on this response. Limits are nested under
   * `limits`, model and feature grants under `access`.
   *
   * Nothing here has a price. `price_monthly` is `0` on pay-as-you-go entries and
   * `null` on every `sub-*` one, all of which carry `purchasable: false` — the
   * `subscriptions` array survives because those rows are the live rate-limit
   * definitions for accounts that already hold a `sub-*` tier, not an offer.
   *
   * @example
   * ```typescript
   * const catalog = await client.getTierCatalog();
   * for (const tier of [...catalog.payg, ...catalog.subscriptions]) {
   *   // `-1` means uncapped, so print it as such rather than as "-1 GB".
   *   const storage = tier.limits.storage_gb < 0 ? "unlimited" : `${tier.limits.storage_gb} GB`;
   *   console.log(
   *     `${tier.name}: ${tier.limits.rpm} rpm, ` +
   *     `${tier.limits.concurrent_jobs} concurrent, ${storage} storage`
   *   );
   * }
   * ```
   */
  async getTierCatalog(): Promise<TierCatalog> {
    return await this.request<TierCatalog>({
      method: "GET",
      path: "/v1/tiers/catalog",
      requiresAuth: false,
    });
  }

  /**
   * Get the current user's tier, limits, and usage.
   *
   * @returns Current tier info with rate limits and usage stats
   *
   * The tier caps how fast you may spend — requests per minute, 4-hour burst,
   * concurrency, model access. What pays for the calls is `wallet.balance_usd`;
   * at `0` every billed endpoint returns HTTP 402 whatever the tier.
   *
   * @example
   * ```typescript
   * const tier = await client.getCurrentTier();
   * console.log(`Tier: ${tier.name} (${tier.limits.rpm} rpm)`);
   * console.log(`Today: ${tier.usage.requests_today} / ${tier.limits.daily_quota}`);
   * console.log(`Balance: $${tier.wallet.balance_usd}`);
   * ```
   */
  async getCurrentTier(): Promise<TierInfo> {
    return await this.request<TierInfo>({
      method: "GET",
      path: "/v1/tiers/current",
      requiresAuth: true,
    });
  }

  /**
   * Compare all tiers side-by-side in one flat list.
   *
   * It does not mark which tier is yours — that comes from
   * {@link getCurrentTier}. No row carries a price: the response states
   * `currency: "USD"`, `billing_model: "prepaid_wallet_usd"` and
   * `subscriptions_retired: true`, and marks every row `purchasable: false` with
   * an `upgrade_path` of `"wallet_topup"` or, for `sub-enterprise`,
   * `"contact_sales"`. Compare on `rpm` / `concurrent_jobs`.
   *
   * @returns Every tier as a comparison row, plus the billing model
   *
   * @example
   * ```typescript
   * const [{ tier: mine }, comparison] = await Promise.all([
   *   client.getCurrentTier(),
   *   client.compareTiers(),
   * ]);
   * for (const row of comparison.tiers) {
   *   const marker = row.slug === mine ? " ← current" : "";
   *   console.log(`${row.name}: ${row.rpm} rpm${marker}`);
   * }
   * ```
   */
  async compareTiers(): Promise<TierComparison> {
    return await this.request<TierComparison>({
      method: "GET",
      path: "/v1/tiers/compare",
      requiresAuth: true,
    });
  }

  /**
   * @deprecated Retired on 2026-08-13 — `POST /v1/tiers/subscribe` now answers
   * **HTTP 410** for every tier and this method always throws.
   *
   * There are no paid API plans any more. Rate limits follow the prepaid wallet
   * instead: top up more and the tier rises on its own, with no monthly
   * commitment to cancel. Replace a call to this method with
   * {@link topupWallet} or {@link createTopup} — and note the switch is in your
   * favour, since from $500 up a top-up earns a volume bonus of 5–20% in extra
   * spendable dollars.
   *
   * `sub-enterprise` is the one exception and was never bought this way: it is a
   * contract, via `POST /v1/tiers/enterprise/apply`.
   *
   * Kept as a throwing stub rather than deleted so that upgrading the SDK gives
   * you a compile-time deprecation and a clear runtime message, instead of a
   * missing-method `TypeError` with nothing pointing at the replacement.
   *
   * @param tierSlug - Ignored.
   * @throws Always — {@link FotoHubError} with code `api_subscriptions_retired`.
   */
  async subscribeTier(tierSlug: string): Promise<{ checkout_url: string }> {
    void tierSlug;
    throw new FotoHubError(
      "API subscription plans were retired on 2026-08-13. Rate limits now follow " +
        "your prepaid wallet balance, so top up instead: client.topupWallet(amountUsd) " +
        "or client.createTopup(packageSlug). Top-ups from $500 up earn a 5-20% volume " +
        "bonus in extra spendable dollars. For sub-enterprise, apply via " +
        "POST /v1/tiers/enterprise/apply.",
      "api_subscriptions_retired",
      410
    );
  }

  /**
   * Get the wallet: balance, month-to-date spend, and the recent ledger.
   *
   * The wallet is the only thing that pays for API calls, and it is prepaid —
   * `balance.available_usd` at `0` means every billed endpoint returns HTTP 402
   * until you top up. All amounts are USD.
   *
   * @returns Balance breakdown, this month's totals, and up to 20 ledger rows
   *
   * @example
   * ```typescript
   * const wallet = await client.getWallet();
   * console.log(`Available: $${wallet.balance.available_usd}`);
   * console.log(`Pending: $${wallet.balance.pending_usd}`);
   * console.log(
   *   `Spent this month: $${wallet.this_month.spent_usd}` +
   *   (wallet.this_month.truncated ? " (at least)" : "")
   * );
   * ```
   */
  async getWallet(): Promise<WalletInfo> {
    return await this.request<WalletInfo>({
      method: "GET",
      path: "/v1/tiers/wallet",
      requiresAuth: true,
    });
  }

  /**
   * Top up the wallet balance (returns a Stripe checkout URL).
   *
   * From $500 up the amount earns a volume bonus in extra spendable dollars —
   * 5% at $500, 10% at $1,000, rising to 20% at $15,000 — credited in the same
   * transaction as the payment. `total_credited_usd` is what the balance
   * actually gains, and it is the figure to show a customer.
   *
   * The bonus is a function of the amount, not of the package: passing 1000 here
   * earns the same +$100 as buying the "scale-1000" package.
   *
   * @param amountUsd - Amount in USD to add (minimum 10, maximum 15000, whole
   *   cents only — $10.005 is rejected rather than rounded)
   * @param payCurrency - Optional Stripe charge currency. Defaults to "usd";
   *   pass "pln" to let a Polish customer pay by BLIK/card/bank transfer while
   *   the wallet is still credited `amountUsd`.
   * @returns Checkout URL, the USD amount paid, the bonus, and the total credited
   *
   * @example
   * ```typescript
   * const topup = await client.topupWallet(1000);
   * console.log(`Pay $${topup.amount_usd}, get $${topup.total_credited_usd}`);
   * // → Pay $1000, get $1100
   * // Redirect user to topup.checkout_url for payment
   * ```
   */
  async topupWallet(
    amountUsd: number,
    payCurrency?: "usd" | "pln"
  ): Promise<{
    checkout_url: string;
    /** The amount charged, in USD. */
    amount_usd: number;
    /** Volume bonus in extra spendable dollars; `0` below $500. */
    bonus_usd: number;
    /** `amount_usd + bonus_usd` — the balance increase on payment. */
    total_credited_usd: number;
    pay_currency: string;
    /**
     * @deprecated Always `null`, and never granted. The volume reward is
     * `bonus_usd`, in dollars — this product has no credits.
     */
    bonus_credits?: number | null;
  }> {
    const body: Record<string, unknown> = { amount_usd: amountUsd };
    if (payCurrency !== undefined) body.pay_currency = payCurrency;

    return await this.request<{
      checkout_url: string;
      amount_usd: number;
      bonus_usd: number;
      total_credited_usd: number;
      pay_currency: string;
      bonus_credits?: number | null;
    }>({
      method: "POST",
      path: "/v1/tiers/wallet/topup",
      body,
      requiresAuth: true,
    });
  }

  /**
   * Submit an enterprise tier application.
   *
   * @param application - Enterprise application details
   * @returns Application ID for tracking
   *
   * @example
   * ```typescript
   * const { id } = await client.applyEnterprise({
   *   company_name: "Acme Corp",
   *   contact_email: "api@acme.com",
   *   expected_usage: "50,000+ generations/month",
   *   use_case: "E-commerce product photography at scale",
   * });
   * console.log(`Application submitted: ${id}`);
   * ```
   */
  async applyEnterprise(application: EnterpriseApplication): Promise<{ id: string; status: string }> {
    return await this.request<{ id: string; status: string }>({
      method: "POST",
      path: "/v1/tiers/enterprise/apply",
      body: application,
      requiresAuth: true,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GABRIEL AI ORCHESTRATOR
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Classify user intent and route to the optimal platform feature using Gabriel AI.
   *
   * @param options - Classification parameters (prompt, language, context)
   * @returns Routing decision with model selection, tips, and credit estimate
   *
   * @example
   * ```typescript
   * const result = await client.gabrielClassify({
   *   prompt: "Generate a cinematic photo of a sunset",
   *   language: "en",
   *   enhance_prompt: true,
   * });
   * console.log(result.target); // "/generate/image"
   * console.log(result.model_selected); // "seedream-5-0-260128"
   * ```
   */
  async gabrielClassify(options: GabrielClassifyOptions): Promise<GabrielResult> {
    const body: Record<string, unknown> = {
      prompt: options.prompt,
    };

    if (options.language !== undefined) body.language = options.language;
    if (options.context !== undefined) body.context = options.context;
    if (options.enhance_prompt !== undefined) body.enhance_prompt = options.enhance_prompt;

    return await this.request<GabrielResult>({
      method: "POST",
      path: "/v1/ai/gabriel",
      body,
      requiresAuth: true,
    });
  }

  /**
   * Get lightweight autocomplete suggestions as the user types.
   * No authentication required. Responds in <50ms.
   *
   * @param options - Partial input with tab/page context
   * @returns Array of ranked suggestions
   *
   * @example
   * ```typescript
   * const suggestions = await client.gabrielSuggest({
   *   partial: "portrait photo",
   *   tab: "image",
   *   page: "/generate/new",
   * });
   * ```
   */
  async gabrielSuggest(options: GabrielSuggestOptions): Promise<GabrielSuggestion[]> {
    const body: Record<string, unknown> = {
      partial: options.partial,
    };

    if (options.tab !== undefined) body.tab = options.tab;
    if (options.page !== undefined) body.page = options.page;

    const result = await this.request<{ suggestions: GabrielSuggestion[] }>({
      method: "POST",
      path: "/v1/ai/gabriel/suggest",
      body,
      requiresAuth: false,
    });

    return result.suggestions;
  }

  /**
   * Get proactive context-aware recommendations based on user state.
   * No authentication required. Template-based (<100ms response).
   *
   * `credits_remaining` is a hint about *your end user's* fotohub.app
   * subscription credits, not your API balance — pass it only if you are
   * building on top of the web app, and read {@link getBalance} for the prepaid
   * USD wallet that actually pays for API calls.
   *
   * @param options - Context (page, the end user's web credits, brand status)
   * @returns Array of contextual recommendations
   *
   * @example
   * ```typescript
   * const recs = await client.gabrielRecommend({
   *   page: "/generate/new",
   *   has_brand: false,
   * });
   * ```
   */
  async gabrielRecommend(options: GabrielRecommendOptions = {}): Promise<GabrielRecommendation[]> {
    const body: Record<string, unknown> = {};

    if (options.page !== undefined) body.page = options.page;
    if (options.credits_remaining !== undefined) body.credits_remaining = options.credits_remaining;
    if (options.has_brand !== undefined) body.has_brand = options.has_brand;
    if (options.recent_actions !== undefined) body.recent_actions = options.recent_actions;

    const result = await this.request<{ recommendations: GabrielRecommendation[] }>({
      method: "POST",
      path: "/v1/ai/gabriel/recommend",
      body,
      requiresAuth: false,
    });

    return result.recommendations;
  }

  /**
   * Translate text between languages.
   *
   * @param options - Translation parameters
   * @returns Translated text with metadata
   *
   * @example
   * ```typescript
   * const result = await client.translate({
   *   text: "Hello world",
   *   target_language: "pl",
   * });
   * console.log(result.translated_text); // "Witaj świecie"
   * ```
   */
  async translate(options: TranslateOptions): Promise<TranslateResult> {
    const body: Record<string, unknown> = {
      text: options.text,
      target_language: options.target_language,
    };

    if (options.source_language !== undefined) body.source_language = options.source_language;

    return await this.request<TranslateResult>({
      method: "POST",
      path: "/v1/ai/translate",
      body,
      requiresAuth: false,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODELS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List available AI models, optionally filtered by category.
   *
   * Multiply by the duration when `price_unit` is `"second"` — every video model
   * quotes per second, even though `pricing_type` says `"request"`.
   *
   * @param category - Optional filter: "image", "video", "text", "audio"
   * @returns Array of available models with pricing
   *
   * @example
   * ```typescript
   * const models = await client.listModels("video");
   * for (const m of models) {
   *   console.log(`${m.name} (${m.id}): $${m.request_price} per ${m.request_price_per}`);
   * }
   * ```
   */
  async listModels(category?: string): Promise<Model[]> {
    const query: Record<string, string | undefined> = {};
    if (category) query.category = category;

    // The endpoint answers `{ "models": [...] }`, which is neither the SDK's
    // `{ success, data }` envelope nor a bare array — so requesting `Model[]`
    // here handed callers the wrapper object typed as an array, and the
    // documented `for (const m of models)` threw "models is not iterable".
    const response = await this.request<{ models?: Model[] } | Model[]>({
      method: "GET",
      path: "/v1/models",
      query: query as Record<string, string>,
      requiresAuth: true,
    });

    if (Array.isArray(response)) return response;
    return response?.models ?? [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL REQUEST HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  private buildChatBody(
    options: ChatOptions,
    stream: boolean
  ): Record<string, unknown> {
    const messages = options.system
      ? [{ role: "system" as const, content: options.system }, ...options.messages]
      : options.messages;

    const body: Record<string, unknown> = {
      messages,
      stream,
    };

    if (options.model !== undefined) body.model = options.model;
    if (options.max_tokens !== undefined) body.max_tokens = options.max_tokens;
    if (options.temperature !== undefined) body.temperature = options.temperature;
    if (options.top_p !== undefined) body.top_p = options.top_p;
    if (options.stop !== undefined) body.stop = options.stop;
    if (options.frequency_penalty !== undefined) body.frequency_penalty = options.frequency_penalty;
    if (options.presence_penalty !== undefined) body.presence_penalty = options.presence_penalty;

    return body;
  }

  /**
   * Execute a request with automatic retry, error handling, and response parsing.
   */
  private async request<T>(options: RequestOptions): Promise<T> {
    const response = await this.rawRequest(options);

    // Handle void responses (204 No Content, DELETE)
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const data = await response.json();

    // Handle envelope format: { success, data, error }
    if (
      typeof data === "object" &&
      data !== null &&
      "success" in data &&
      "data" in data
    ) {
      const envelope = data as { success: boolean; data: T; error?: { code: string; message: string; details?: Record<string, unknown> } };
      if (!envelope.success && envelope.error) {
        throw FotoHubError.fromApiError(envelope.error, response.status);
      }
      return envelope.data;
    }

    // Direct response (no envelope)
    return data as T;
  }

  /**
   * Execute a raw HTTP request with retries and error handling.
   * Returns the raw Response object (useful for streaming).
   */
  private async rawRequest(options: RequestOptions): Promise<Response> {
    const url = this.buildUrl(options.path, options.query);
    const headers = this.buildHeaders(options);
    const timeout = options.timeout ?? this.timeout;

    // One key for this logical call, reused by every retry below, so a timeout
    // or 5xx that arrives after the work already started is replayed instead of
    // charged again. See idempotencyKeyFor().
    const mintedKey = idempotencyKeyFor(options);
    if (mintedKey) {
      headers[IDEMPOTENCY_HEADER] = mintedKey;
    }
    // Minted or caller-supplied: either way a 409 in-progress is our own
    // earlier attempt and is waited out.
    const idempotencyKey = mintedKey ?? callerIdempotencyKey(options);
    // A write that must not be replayed blindly (see applyVideoOps) opts out of
    // retrying anything whose outcome is unknown.
    const retryAmbiguous = options.retryAmbiguous !== false;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        // Exponential backoff: 1s, 2s, 4s, 8s (capped)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        await this.sleep(delay);
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await this.fetchFn(url, {
          method: options.method,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Don't retry on client errors (4xx) except 429 and 408
        if (response.status >= 400) {
          const error = await this.handleErrorResponse(response, options.path);

          // Retry on rate limit and timeout
          if (response.status === 429 || response.status === 408) {
            lastError = error;
            continue;
          }

          // 409 on a guarded endpoint carrying our key means a request with
          // this same key is still in flight — which is our own earlier
          // attempt. Wait and collect its result; surfacing the 409 would
          // report a failure for work that is running and will be charged
          // exactly once. Without a key a 409 is a genuine conflict and falls
          // through to the throw below.
          // Only `idempotency-in-progress` is an in-flight duplicate. Any other
          // 409 (`save-conflict`, `project-limit`, `draft-limit`, ...) is a
          // real answer that a retry can never change.
          if (
            response.status === 409 &&
            idempotencyKey &&
            error.code === "idempotency-in-progress" &&
            attempt < this.maxRetries
          ) {
            lastError = error;
            continue;
          }

          // Retry on server errors (5xx)
          if (response.status >= 500 && retryAmbiguous && attempt < this.maxRetries) {
            lastError = error;
            continue;
          }

          throw error;
        }

        return response;
      } catch (error) {
        if (error instanceof FotoHubError) {
          // Already handled — only retry for specific errors
          if (
            error instanceof RateLimitError ||
            (retryAmbiguous && (error instanceof ServerError || error instanceof TimeoutError))
          ) {
            lastError = error;
            continue;
          }
          throw error;
        }

        // Handle abort (timeout)
        if (error instanceof DOMException && error.name === "AbortError") {
          lastError = new TimeoutError(
            `Request to ${options.path} timed out after ${timeout}ms`
          );
          if (!retryAmbiguous) throw lastError;
          continue;
        }

        // Network errors
        if (error instanceof TypeError) {
          lastError = new NetworkError(
            `Network error: ${error.message}`,
            error
          );
          if (!retryAmbiguous) throw lastError;
          continue;
        }

        // Unknown error
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.maxRetries) continue;
        throw lastError;
      }
    }

    // All retries exhausted
    throw lastError ?? new FotoHubError("Request failed after all retries");
  }

  private buildUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>
  ): string {
    const url = new URL(path, this.baseUrl);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  private buildHeaders(options: RequestOptions): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      "X-SDK-Version": SDK_VERSION,
    };

    if (options.requiresAuth !== false) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    if (options.stream) {
      headers["Accept"] = "text/event-stream";
    }

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    return headers;
  }

  private async handleErrorResponse(
    response: Response,
    path: string = ""
  ): Promise<FotoHubError> {
    let body: unknown;

    try {
      body = await response.json();
    } catch {
      return this.errorFromStatus(response.status, response.statusText);
    }

    const error = this.extractError(body);
    const message = error?.message ?? response.statusText;
    const code = error?.code ?? `http_${response.status}`;
    // Server-defined code on timeline routes (see TIMELINE_ERROR_PATH).
    const tcode =
      TIMELINE_ERROR_PATH.test(path) && error?.code && error.code !== "unknown"
        ? error.code
        : undefined;

    switch (response.status) {
      case 401:
        return new AuthenticationError(message);
      case 402: {
        // `extractError` hoists a dict `detail` into `details`, so this is the
        // server's flat funds payload: required_usd, balance_usd, shortfall_usd,
        // topup_url, charged, operation.
        //
        // What was wrong was the field NAMES. This read `credits_required` /
        // `credits_available`, which the prepaid API never sends, so every 402
        // surfaced with both figures `undefined` — a developer got "insufficient"
        // with no price, no balance, and no top-up link, and the numbers were
        // sitting right there in the response.
        const d = (error?.details ?? {}) as Record<string, unknown>;
        const num = (...keys: string[]): number | undefined => {
          for (const k of keys) {
            const v = d[k];
            // Typed checks rather than truthiness: a $0 balance is the commonest
            // case of this error and is the single figure worth printing.
            if (typeof v === "number") return v;
            if (typeof v === "string" && v !== "" && !Number.isNaN(Number(v))) {
              return Number(v);
            }
          }
          return undefined;
        };
        const str = (...keys: string[]): string | undefined => {
          for (const k of keys) {
            const v = d[k];
            if (typeof v === "string" && v !== "") return v;
          }
          return undefined;
        };

        return new InsufficientFundsError(message, {
          requiredUsd: num("required_usd", "requiredUsd"),
          balanceUsd: num("balance_usd", "balanceUsd"),
          shortfallUsd: num("shortfall_usd", "shortfallUsd"),
          topupUrl: str("topup_url", "topupUrl"),
          operation: str("operation"),
          // Only from a pre-cutover server. A current one never sends these.
          creditsRequired: num("credits_required", "creditsRequired"),
          creditsAvailable: num("credits_available", "creditsAvailable"),
        }, tcode);
      }
      case 403:
        return new PermissionError(message, tcode);
      case 404:
        return new NotFoundError(message, tcode, tcode ? error?.details : undefined);
      case 409:
        if (tcode === "save-conflict") {
          return new SaveConflictError(message, error?.details);
        }
        return new FotoHubError(message, code, 409, error?.details);
      case 422:
        // Timeline envelopes carry `details` ({ errors: [...] } or { path }),
        // which is not a field-name -> messages map: keep it under `details`.
        if (tcode) {
          return new ValidationError(message, undefined, tcode, error?.details);
        }
        return new ValidationError(
          message,
          error?.details as Record<string, string[]> | undefined,
          tcode
        );
      case 429: {
        const retryAfter = response.headers.get("retry-after");
        return new RateLimitError(
          message,
          retryAfter ? parseInt(retryAfter, 10) : undefined,
          tcode,
          tcode ? error?.details : undefined
        );
      }
      default:
        if (response.status >= 500) {
          return new ServerError(
            message,
            response.status,
            tcode,
            tcode ? error?.details : undefined
          );
        }
        return new FotoHubError(message, code, response.status, error?.details);
    }
  }

  private extractError(
    body: unknown
  ): { message: string; code: string; details?: Record<string, unknown> } | undefined {
    if (typeof body !== "object" || body === null) return undefined;

    // { detail: ... } — the API is FastAPI, so this is the shape of *every*
    // error it raises. This branch has to come first: without it every message
    // fell through to response.statusText ("Payment Required" rather than
    // "Insufficient wallet balance. Need $0.42."), and creditsRequired and the
    // validation details were always undefined.
    if ("detail" in body) {
      const detail = (body as Record<string, unknown>).detail;

      if (typeof detail === "string") {
        return { message: detail, code: "unknown" };
      }

      // FastAPI request validation: [{ loc, msg, type }, ...]
      if (Array.isArray(detail)) {
        const msgs = detail
          .map((d) =>
            typeof d === "object" && d !== null
              ? String((d as Record<string, unknown>).msg ?? "")
              : ""
          )
          .filter(Boolean);
        return {
          message: msgs.length > 0 ? msgs.join("; ") : "Validation failed",
          code: "validation_error",
          details: { errors: detail },
        };
      }

      // A few endpoints (tier_enforcer) raise a dict detail.
      if (typeof detail === "object" && detail !== null) {
        const d = detail as Record<string, unknown>;
        return {
          message: String(d.message ?? d.error ?? d.detail ?? "Unknown error"),
          code: String(d.code ?? d.error ?? "unknown"),
          details: d,
        };
      }
    }

    // { error: { message, code } }
    if ("error" in body) {
      const err = (body as Record<string, unknown>).error;
      if (typeof err === "object" && err !== null) {
        const e = err as Record<string, unknown>;
        return {
          message: String(e.message ?? "Unknown error"),
          code: String(e.code ?? "unknown"),
          details: e.details as Record<string, unknown> | undefined,
        };
      }
      if (typeof err === "string") {
        return { message: err, code: "unknown" };
      }
    }

    // { message, code }
    if ("message" in body) {
      const b = body as Record<string, unknown>;
      return {
        message: String(b.message),
        code: String(b.code ?? "unknown"),
        details: b.details as Record<string, unknown> | undefined,
      };
    }

    return undefined;
  }

  private errorFromStatus(status: number, statusText: string): FotoHubError {
    switch (status) {
      case 401:
        return new AuthenticationError();
      case 403:
        return new PermissionError();
      case 404:
        return new NotFoundError();
      case 429:
        return new RateLimitError();
      default:
        if (status >= 500) return new ServerError(statusText, status);
        return new FotoHubError(statusText, `http_${status}`, status);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
