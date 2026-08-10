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
} from "./types.js";

import {
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

const SDK_VERSION = "1.9.1";
const USER_AGENT = `fotohub-sdk-node/${SDK_VERSION}`;

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
   * @returns Generated image result with URLs, credits used, and metadata
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
          credits_used: submitResult.credits_used,
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
      // response carries `credits_used`. Returning the poll body alone left
      // `credits_used` undefined on exactly the models that queue, so carry it
      // across rather than making callers hold on to the submit result.
      if (result.status === "completed") {
        return { ...result, credits_used: result.credits_used ?? submitted.credits_used };
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
   * video for editing or extension. Native audio is included in its price —
   * 14.5 credits/s at 720p, 6.4 at 480p, the same with `generate_audio` on or
   * off. It does **not** do 1080p or 4K; those return a 400. For higher
   * resolution use `seedance-2-0-pro` (up to 4K, but capped at 15s).
   *
   * @param options - Seedance generation parameters
   * @returns The finished job, including `video_url` and `credits_used`
   *
   * @example
   * ```typescript
   * // A 30-second clip with audio — 435 credits at 720p
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
   * Free — no credits are charged. Pass the returned `uri` (or bare id) in
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
   * Billed on the tokens actually used, so the charge is fractional and scales
   * with the length of the answer: `credits_used` on a short reply is around
   * 0.02, not 1. Read `billing.basis` to confirm it came from real token counts.
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
   * console.log(response.billing?.credits_used);  // e.g. 0.0255
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
   * List all available Stability AI tools with their capabilities and costs.
   *
   * @returns Array of Stability tool descriptors
   *
   * @example
   * ```typescript
   * const tools = await client.listStabilityTools();
   * for (const tool of tools) {
   *   console.log(`${tool.id}: ${tool.credits} credits`);
   * }
   * ```
   */
  async listStabilityTools(): Promise<StabilityTool[]> {
    return await this.request<StabilityTool[]>({
      method: "GET",
      path: "/stability/tools",
      requiresAuth: true,
    });
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
   * Get available API subscription plans.
   *
   * @returns Array of available plans with features and pricing
   *
   * @example
   * ```typescript
   * const plans = await client.getPlans();
   * for (const plan of plans) {
   *   console.log(`${plan.name}: ${plan.price_pln} PLN/mo — ${plan.credits_monthly} credits`);
   * }
   * ```
   */
  async getPlans(): Promise<ApiPlan[]> {
    return await this.request<ApiPlan[]>({
      method: "GET",
      path: "/v1/billing/plans",
      requiresAuth: true,
    });
  }

  /**
   * Get current credit balance and usage for the billing period.
   *
   * @returns Credits info with total, used, and remaining
   *
   * @example
   * ```typescript
   * const credits = await client.getCredits();
   * console.log(`${credits.remaining} / ${credits.total} credits remaining`);
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
   * Get available credit top-up packages.
   *
   * @returns Array of purchasable top-up packages
   *
   * @example
   * ```typescript
   * const packages = await client.getTopupPackages();
   * for (const pkg of packages) {
   *   console.log(`${pkg.name}: $${pkg.amount_usd} (+${pkg.bonus_credits} bonus credits)`);
   * }
   * ```
   */
  async getTopupPackages(): Promise<TopupPackage[]> {
    return await this.request<TopupPackage[]>({
      method: "GET",
      path: "/v1/billing/topup/packages",
      requiresAuth: true,
    });
  }

  /**
   * Purchase a credit top-up package. Returns a checkout URL for payment.
   *
   * @param packageSlug - The slug of the package to purchase
   *   (e.g. "topup-50", "topup-100", "topup-250", "topup-500", "topup-1000", "topup-5000")
   * @returns Checkout session with payment URL
   *
   * @example
   * ```typescript
   * const topup = await client.createTopup("topup-500");
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
   * Get paginated transaction history (credits, debits, top-ups, subscriptions).
   *
   * @param options - Pagination and filter options
   * @returns Paginated transaction list
   *
   * @example
   * ```typescript
   * const page = await client.getTransactions({ page: 1, pageSize: 50 });
   * for (const tx of page.transactions) {
   *   console.log(`${tx.type}: ${tx.amount} — ${tx.description}`);
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
   *   { type: "image", model: "seedream-5-0-260128", count: 4 },
   *   { type: "video", model: "veo-2", duration: 10 },
   * ]);
   * console.log(`Total: ${estimate.total_credits} credits ($${estimate.total_usd})`);
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
   * Get all invoices for the account.
   *
   * @returns Array of invoices with PDF download links
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
    return await this.request<Invoice[]>({
      method: "GET",
      path: "/v1/billing/invoices",
      requiresAuth: true,
    });
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
   * @param options - 3D generation parameters
   * @returns 3D result with download URL and billing info
   *
   * @example
   * ```typescript
   * const result = await client.generate3D({
   *   mode: "image-to-3d",
   *   model: "fh-lite-3d",
   *   image: base64EncodedImage,
   *   format: "glb",
   * });
   * console.log(result.url); // GLB file URL
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
   * Check the status of a 3D generation job.
   *
   * @param jobId - The generation ID returned from `generate3D()`
   * @returns Current status and result if completed
   *
   * @example
   * ```typescript
   * const status = await client.get3DStatus("gen_abc123");
   * if (status.status === "completed") {
   *   console.log(status.url);
   * }
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
   * Wait for a 3D generation job to complete, polling at intervals.
   *
   * @param jobId - The generation ID returned from `generate3D()`
   * @param options - Polling configuration
   * @returns Completed 3D result with download URL
   *
   * @example
   * ```typescript
   * const gen = await client.generate3D({ mode: "text-to-3d", model: "fh-text-3d", prompt: "a castle" });
   * const completed = await client.waitFor3D(gen.id, {
   *   onProgress: (r) => console.log(`Status: ${r.status}`),
   * });
   * console.log(completed.url);
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
   * @returns Array of 3D models with costs and capabilities
   *
   * @example
   * ```typescript
   * const models = await client.list3DModels();
   * for (const m of models) {
   *   console.log(`${m.name}: ${m.credits} credits (${m.speed})`);
   * }
   * ```
   */
  async list3DModels(): Promise<ThreeDModelInfo[]> {
    return await this.request<ThreeDModelInfo[]>({
      method: "GET",
      path: "/v1/ai/generate/3d/models",
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
   * @example Outfit — a top and a bottom in one job, 3 credits
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
   * @example
   * ```typescript
   * const catalog = await client.getTierCatalog();
   * for (const tier of catalog.tiers) {
   *   console.log(`${tier.name}: ${tier.rpm} rpm, ${tier.credits_monthly} credits/mo`);
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
   * @example
   * ```typescript
   * const tier = await client.getCurrentTier();
   * console.log(`Tier: ${tier.name} (${tier.limits.rpm} rpm)`);
   * console.log(`Credits used: ${tier.usage.credits_used}`);
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
   * Compare all tiers side-by-side, highlighting the current tier.
   *
   * @returns Comparison data with current tier indicator
   *
   * @example
   * ```typescript
   * const comparison = await client.compareTiers();
   * console.log(`Current: ${comparison.current}`);
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
   * Subscribe to a tier (returns a checkout URL for payment).
   *
   * @param tierSlug - The tier slug to subscribe to (e.g. "sub-developer", "sub-startup")
   * @returns Checkout URL to complete the subscription
   *
   * @example
   * ```typescript
   * const { checkout_url } = await client.subscribeTier("sub-developer");
   * // Redirect user to checkout_url
   * ```
   */
  async subscribeTier(tierSlug: string): Promise<{ checkout_url: string }> {
    return await this.request<{ checkout_url: string }>({
      method: "POST",
      path: "/v1/tiers/subscribe",
      body: { tier: tierSlug },
      requiresAuth: true,
    });
  }

  /**
   * Get the current wallet balance and spending info.
   *
   * @returns Wallet balance, currency, and lifetime spend
   *
   * @example
   * ```typescript
   * const wallet = await client.getWallet();
   * console.log(`Balance: ${wallet.balance} ${wallet.currency}`);
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
   * @param amountUsd - Amount in USD to add (minimum 10, maximum 15000)
   * @param payCurrency - Optional Stripe charge currency. Defaults to "usd";
   *   pass "pln" to let a Polish customer pay by BLIK/card/bank transfer while
   *   the wallet is still credited `amountUsd`.
   * @returns Checkout URL plus the credited USD amount and bonus credits
   *
   * @example
   * ```typescript
   * const { checkout_url } = await client.topupWallet(100);
   * // Redirect user to checkout_url for payment
   * ```
   */
  async topupWallet(
    amountUsd: number,
    payCurrency?: "usd" | "pln"
  ): Promise<{
    checkout_url: string;
    amount_usd: number;
    pay_currency: string;
    bonus_credits: number;
  }> {
    const body: Record<string, unknown> = { amount_usd: amountUsd };
    if (payCurrency !== undefined) body.pay_currency = payCurrency;

    return await this.request<{
      checkout_url: string;
      amount_usd: number;
      pay_currency: string;
      bonus_credits: number;
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
   * @param options - Context (page, credits, brand status)
   * @returns Array of contextual recommendations
   *
   * @example
   * ```typescript
   * const recs = await client.gabrielRecommend({
   *   page: "/generate/new",
   *   credits_remaining: 5,
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
          const error = await this.handleErrorResponse(response);

          // Retry on rate limit and timeout
          if (response.status === 429 || response.status === 408) {
            lastError = error;
            continue;
          }

          // Retry on server errors (5xx)
          if (response.status >= 500 && attempt < this.maxRetries) {
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
            error instanceof ServerError ||
            error instanceof TimeoutError
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
          continue;
        }

        // Network errors
        if (error instanceof TypeError) {
          lastError = new NetworkError(
            `Network error: ${error.message}`,
            error
          );
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

  private async handleErrorResponse(response: Response): Promise<FotoHubError> {
    let body: unknown;

    try {
      body = await response.json();
    } catch {
      return this.errorFromStatus(response.status, response.statusText);
    }

    const error = this.extractError(body);
    const message = error?.message ?? response.statusText;
    const code = error?.code ?? `http_${response.status}`;

    switch (response.status) {
      case 401:
        return new AuthenticationError(message);
      case 402: {
        // The API is Python, so any structured fields arrive snake_case. The
        // camelCase reads are kept as a fallback for a gateway that rewrites.
        const d = error?.details as Record<string, number> | undefined;
        return new InsufficientCreditsError(
          message,
          d?.credits_required ?? d?.creditsRequired,
          d?.credits_available ?? d?.creditsAvailable
        );
      }
      case 403:
        return new PermissionError(message);
      case 404:
        return new NotFoundError(message);
      case 422:
        return new ValidationError(
          message,
          error?.details as Record<string, string[]> | undefined
        );
      case 429: {
        const retryAfter = response.headers.get("retry-after");
        return new RateLimitError(
          message,
          retryAfter ? parseInt(retryAfter, 10) : undefined
        );
      }
      default:
        if (response.status >= 500) {
          return new ServerError(message, response.status);
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
