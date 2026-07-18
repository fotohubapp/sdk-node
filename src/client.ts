import type {
  FotoHubConfig,
  RequestOptions,
  ImageGenerateParams,
  ImageResult,
  VideoGenerateParams,
  VideoJob,
  VideoResult,
  VideoWaitOptions,
  MusicGenerateParams,
  MusicResult,
  ChatParams,
  ChatCompletion,
  GabrielParams,
  GabrielResponse,
  TranslateParams,
  TranslateResult,
  UsageParams,
  UsageResult,
  Bucket,
  CreateBucketParams,
  S3BucketProvisionParams,
  S3BucketResult,
  PresignUploadParams,
  PresignedUrl,
  PresignDownloadParams,
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

import { parseSSEStream, ChatStream } from "./streaming.js";

const DEFAULT_BASE_URL = "https://apis.fotohub.app";
const DEFAULT_TIMEOUT = 60_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_IMAGE_MODEL = "seedream-5-0-260128";

const SDK_VERSION = "1.0.0";
const USER_AGENT = `fotohub-sdk-node/${SDK_VERSION}`;

/**
 * FOTOhub AI Platform SDK client.
 *
 * Provides methods for image generation, video generation, music generation,
 * chat/LLM completions, translation, intent orchestration, usage analytics,
 * and storage management.
 *
 * @example
 * ```typescript
 * import { FotoHub } from "@fotohub/sdk";
 *
 * const client = new FotoHub({ apiKey: "your-api-key" });
 * const result = await client.generateImage({ prompt: "A sunset over mountains" });
 * console.log(result.images[0].url);
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

  // ─── Image Generation ────────────────────────────────────────────────────

  /**
   * Generate images from a text prompt.
   *
   * @param params - Image generation parameters
   * @returns Generated image result with URLs and metadata
   *
   * @example
   * ```typescript
   * const result = await client.generateImage({
   *   prompt: "A futuristic cityscape at night",
   *   model: "seedream-5-0-260128",
   *   aspectRatio: "16:9",
   *   numImages: 2,
   * });
   *
   * for (const image of result.images) {
   *   console.log(image.url);
   * }
   * ```
   */
  async generateImage(params: ImageGenerateParams): Promise<ImageResult> {
    const body: Record<string, unknown> = {
      prompt: params.prompt,
      model: params.model ?? DEFAULT_IMAGE_MODEL,
    };

    if (params.negativePrompt !== undefined)
      body.negative_prompt = params.negativePrompt;
    if (params.width !== undefined) body.width = params.width;
    if (params.height !== undefined) body.height = params.height;
    if (params.aspectRatio !== undefined) body.aspect_ratio = params.aspectRatio;
    if (params.numImages !== undefined) body.num_images = params.numImages;
    if (params.guidanceScale !== undefined)
      body.guidance_scale = params.guidanceScale;
    if (params.steps !== undefined) body.steps = params.steps;
    if (params.seed !== undefined) body.seed = params.seed;
    if (params.style !== undefined) body.style = params.style;
    if (params.outputFormat !== undefined)
      body.output_format = params.outputFormat;
    if (params.referenceImageUrl !== undefined)
      body.reference_image_url = params.referenceImageUrl;
    if (params.referenceStrength !== undefined)
      body.reference_strength = params.referenceStrength;

    const response = await this.request<ImageResult>({
      method: "POST",
      path: "/v1/ai/generate/image",
      body,
      requiresAuth: true,
    });

    return response;
  }

  // ─── Video Generation ────────────────────────────────────────────────────

  /**
   * Start a video generation job. Videos are generated asynchronously.
   * Use `waitForVideo()` to poll until completion.
   *
   * @param params - Video generation parameters
   * @returns Video job with ID for status polling
   *
   * @example
   * ```typescript
   * const job = await client.generateVideo({
   *   prompt: "A drone flying over a forest",
   *   duration: 5,
   *   aspectRatio: "16:9",
   * });
   *
   * const result = await client.waitForVideo(job.jobId);
   * console.log(result.videoUrl);
   * ```
   */
  async generateVideo(params: VideoGenerateParams): Promise<VideoJob> {
    const body: Record<string, unknown> = {
      prompt: params.prompt,
    };

    if (params.model !== undefined) body.model = params.model;
    if (params.duration !== undefined) body.duration = params.duration;
    if (params.aspectRatio !== undefined) body.aspect_ratio = params.aspectRatio;
    if (params.fps !== undefined) body.fps = params.fps;
    if (params.resolution !== undefined) body.resolution = params.resolution;
    if (params.imageUrl !== undefined) body.image_url = params.imageUrl;
    if (params.negativePrompt !== undefined)
      body.negative_prompt = params.negativePrompt;
    if (params.seed !== undefined) body.seed = params.seed;
    if (params.guidanceScale !== undefined)
      body.guidance_scale = params.guidanceScale;

    const response = await this.request<VideoJob>({
      method: "POST",
      path: "/v1/ai/generate/video",
      body,
      requiresAuth: true,
    });

    return response;
  }

  /**
   * Poll a video generation job until it completes or fails.
   *
   * @param jobId - The job ID returned from `generateVideo()`
   * @param options - Polling options (interval, timeout, progress callback)
   * @returns Completed video result with URL
   * @throws {JobFailedError} If the job fails
   * @throws {JobTimeoutError} If maxWait is exceeded
   */
  async waitForVideo(
    jobId: string,
    options: VideoWaitOptions = {}
  ): Promise<VideoResult> {
    const pollInterval = options.pollInterval ?? 5_000;
    const maxWait = options.maxWait ?? 600_000;
    const startTime = Date.now();

    while (true) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= maxWait) {
        throw new JobTimeoutError(
          jobId,
          `Video job ${jobId} timed out after ${Math.round(maxWait / 1000)}s`
        );
      }

      const job = await this.getVideoJob(jobId);

      if (options.onProgress) {
        options.onProgress(job);
      }

      if (job.status === "completed") {
        // Fetch the full result
        return await this.request<VideoResult>({
          method: "GET",
          path: `/v1/ai/generate/video/${jobId}/result`,
          requiresAuth: true,
        });
      }

      if (job.status === "failed" || job.status === "cancelled") {
        throw new JobFailedError(
          jobId,
          `Video job ${jobId} ${job.status}`
        );
      }

      // Wait before next poll
      await this.sleep(pollInterval);
    }
  }

  /**
   * Get the current status of a video generation job.
   *
   * @param jobId - The job ID to check
   * @returns Current job status
   */
  async getVideoJob(jobId: string): Promise<VideoJob> {
    return await this.request<VideoJob>({
      method: "GET",
      path: `/v1/ai/generate/video/${jobId}`,
      requiresAuth: true,
    });
  }

  // ─── Music Generation ────────────────────────────────────────────────────

  /**
   * Generate music from a text description.
   *
   * @param params - Music generation parameters
   * @returns Generated music result with audio URL
   *
   * @example
   * ```typescript
   * const result = await client.generateMusic({
   *   prompt: "Upbeat electronic track, 120 BPM, energetic",
   *   duration: 30,
   *   outputFormat: "mp3",
   * });
   *
   * console.log(result.audioUrl);
   * ```
   */
  async generateMusic(params: MusicGenerateParams): Promise<MusicResult> {
    const body: Record<string, unknown> = {
      prompt: params.prompt,
    };

    if (params.model !== undefined) body.model = params.model;
    if (params.duration !== undefined) body.duration = params.duration;
    if (params.tempo !== undefined) body.tempo = params.tempo;
    if (params.key !== undefined) body.key = params.key;
    if (params.genre !== undefined) body.genre = params.genre;
    if (params.outputFormat !== undefined)
      body.output_format = params.outputFormat;
    if (params.instrumental !== undefined)
      body.instrumental = params.instrumental;

    const response = await this.request<MusicResult>({
      method: "POST",
      path: "/v1/ai/generate/music",
      body,
      requiresAuth: true,
    });

    return response;
  }

  // ─── Chat / LLM ─────────────────────────────────────────────────────────

  /**
   * Create a chat completion (non-streaming).
   *
   * @param params - Chat parameters (messages, model, etc.)
   * @returns Complete chat response
   *
   * @example
   * ```typescript
   * const response = await client.chat({
   *   messages: [
   *     { role: "user", content: "Explain quantum computing in simple terms" }
   *   ],
   *   model: "claude-sonnet-4-20250514",
   *   maxTokens: 1000,
   * });
   *
   * console.log(response.choices[0].message.content);
   * ```
   */
  async chat(params: ChatParams): Promise<ChatCompletion> {
    const body = this.buildChatBody(params, false);

    const response = await this.request<ChatCompletion>({
      method: "POST",
      path: "/v1/ai/chat",
      body,
      requiresAuth: true,
    });

    return response;
  }

  /**
   * Create a streaming chat completion. Returns a ChatStream that yields
   * chunks as they arrive via Server-Sent Events.
   *
   * @param params - Chat parameters (messages, model, etc.)
   * @returns AsyncIterable stream of chat chunks
   *
   * @example
   * ```typescript
   * const stream = await client.streamChat({
   *   messages: [{ role: "user", content: "Write a haiku about code" }],
   * });
   *
   * // Iterate over chunks
   * for await (const chunk of stream) {
   *   const content = chunk.choices[0]?.delta.content;
   *   if (content) process.stdout.write(content);
   * }
   *
   * // Or use the convenience method
   * const stream2 = await client.streamChat({ messages: [...] });
   * const fullText = await stream2.toText();
   * ```
   */
  async streamChat(params: ChatParams): Promise<ChatStream> {
    const body = this.buildChatBody(params, true);

    const response = await this.rawRequest({
      method: "POST",
      path: "/v1/ai/chat",
      body,
      requiresAuth: true,
      stream: true,
    });

    const sseIterable = parseSSEStream(response);
    return new ChatStream(sseIterable);
  }

  private buildChatBody(
    params: ChatParams,
    stream: boolean
  ): Record<string, unknown> {
    const messages = params.system
      ? [{ role: "system", content: params.system }, ...params.messages]
      : params.messages;

    const body: Record<string, unknown> = {
      messages,
      stream,
    };

    if (params.model !== undefined) body.model = params.model;
    if (params.maxTokens !== undefined) body.max_tokens = params.maxTokens;
    if (params.temperature !== undefined) body.temperature = params.temperature;
    if (params.topP !== undefined) body.top_p = params.topP;
    if (params.stop !== undefined) body.stop = params.stop;
    if (params.frequencyPenalty !== undefined)
      body.frequency_penalty = params.frequencyPenalty;
    if (params.presencePenalty !== undefined)
      body.presence_penalty = params.presencePenalty;

    return body;
  }

  // ─── Gabriel (Intent Orchestration) ──────────────────────────────────────

  /**
   * Send a message to Gabriel, the AI intent orchestrator.
   * No authentication required.
   *
   * @param params - Gabriel request parameters
   * @returns Interpreted intent and suggested action
   *
   * @example
   * ```typescript
   * const response = await client.gabriel({
   *   message: "I want to create a logo for my coffee shop",
   *   language: "en",
   * });
   *
   * console.log(response.intent);  // "generate_image"
   * console.log(response.action);  // { type: "generate_image", params: {...} }
   * ```
   */
  async gabriel(params: GabrielParams): Promise<GabrielResponse> {
    const body: Record<string, unknown> = {
      message: params.message,
    };

    if (params.context !== undefined) body.context = params.context;
    if (params.language !== undefined) body.language = params.language;

    const response = await this.request<GabrielResponse>({
      method: "POST",
      path: "/v1/ai/gabriel",
      body,
      requiresAuth: false,
    });

    return response;
  }

  // ─── Translation ─────────────────────────────────────────────────────────

  /**
   * Translate text between languages. No authentication required.
   *
   * @param params - Translation parameters
   * @returns Translated text with detected source language
   *
   * @example
   * ```typescript
   * const result = await client.translate({
   *   text: "Hello, how are you?",
   *   targetLanguage: "pl",
   * });
   *
   * console.log(result.translatedText);  // "Cześć, jak się masz?"
   * console.log(result.detectedSourceLanguage);  // "en"
   * ```
   */
  async translate(params: TranslateParams): Promise<TranslateResult> {
    const body: Record<string, unknown> = {
      text: params.text,
      target_language: params.targetLanguage,
    };

    if (params.sourceLanguage !== undefined)
      body.source_language = params.sourceLanguage;
    if (params.formality !== undefined) body.formality = params.formality;
    if (params.context !== undefined) body.context = params.context;

    const response = await this.request<TranslateResult>({
      method: "POST",
      path: "/v1/ai/translate",
      body,
      requiresAuth: false,
    });

    return response;
  }

  // ─── Usage Analytics ─────────────────────────────────────────────────────

  /**
   * Get usage analytics for your account.
   *
   * @param params - Optional date range and grouping parameters
   * @returns Usage data with breakdowns by service and time
   *
   * @example
   * ```typescript
   * const usage = await client.getUsage({
   *   startDate: "2026-07-01",
   *   endDate: "2026-07-18",
   *   groupBy: "day",
   * });
   *
   * console.log(`Total credits: ${usage.totalCredits}`);
   * console.log(`Total requests: ${usage.totalRequests}`);
   * ```
   */
  async getUsage(params: UsageParams = {}): Promise<UsageResult> {
    const query: Record<string, string | undefined> = {};

    if (params.startDate) query.start_date = params.startDate;
    if (params.endDate) query.end_date = params.endDate;
    if (params.groupBy) query.group_by = params.groupBy;

    const response = await this.request<UsageResult>({
      method: "GET",
      path: "/v1/usage",
      query: query as Record<string, string>,
      requiresAuth: true,
    });

    return response;
  }

  // ─── Storage / Buckets ───────────────────────────────────────────────────

  /**
   * List all storage buckets.
   *
   * @returns Array of bucket objects
   */
  async listBuckets(): Promise<Bucket[]> {
    return await this.request<Bucket[]>({
      method: "GET",
      path: "/v1/buckets",
      requiresAuth: true,
    });
  }

  /**
   * Create a new storage bucket.
   *
   * @param params - Bucket creation parameters
   * @returns Created bucket
   */
  async createBucket(params: CreateBucketParams): Promise<Bucket> {
    const body: Record<string, unknown> = {
      name: params.name,
    };

    if (params.public !== undefined) body.public = params.public;
    if (params.allowedMimeTypes !== undefined)
      body.allowed_mime_types = params.allowedMimeTypes;
    if (params.fileSizeLimit !== undefined)
      body.file_size_limit = params.fileSizeLimit;

    return await this.request<Bucket>({
      method: "POST",
      path: "/v1/buckets",
      body,
      requiresAuth: true,
    });
  }

  /**
   * Provision an enterprise S3 bucket with dedicated credentials.
   *
   * @param params - S3 bucket provisioning parameters
   * @returns Provisioned bucket details with credentials
   */
  async provisionS3Bucket(
    params: S3BucketProvisionParams
  ): Promise<S3BucketResult> {
    const body: Record<string, unknown> = {
      name: params.name,
    };

    if (params.region !== undefined) body.region = params.region;
    if (params.storageClass !== undefined)
      body.storage_class = params.storageClass;
    if (params.versioning !== undefined) body.versioning = params.versioning;
    if (params.cors !== undefined) body.cors = params.cors;

    return await this.request<S3BucketResult>({
      method: "POST",
      path: "/v1/storage/s3/buy",
      body,
      requiresAuth: true,
    });
  }

  /**
   * Generate a presigned URL for uploading an object to an S3 bucket.
   *
   * @param bucketId - The bucket ID
   * @param params - Upload parameters (key, content type, etc.)
   * @returns Presigned upload URL with headers
   *
   * @example
   * ```typescript
   * const presigned = await client.presignUpload("bucket-123", {
   *   key: "images/photo.jpg",
   *   contentType: "image/jpeg",
   *   expiresIn: 3600,
   * });
   *
   * // Use the URL to upload directly
   * await fetch(presigned.url, {
   *   method: "PUT",
   *   headers: presigned.headers,
   *   body: fileBuffer,
   * });
   * ```
   */
  async presignUpload(
    bucketId: string,
    params: PresignUploadParams
  ): Promise<PresignedUrl> {
    const body: Record<string, unknown> = {
      key: params.key,
      content_type: params.contentType,
    };

    if (params.expiresIn !== undefined) body.expires_in = params.expiresIn;
    if (params.contentLength !== undefined)
      body.content_length = params.contentLength;
    if (params.metadata !== undefined) body.metadata = params.metadata;

    return await this.request<PresignedUrl>({
      method: "POST",
      path: `/v1/storage/s3/buckets/${encodeURIComponent(bucketId)}/objects/presign-upload`,
      body,
      requiresAuth: true,
    });
  }

  /**
   * Generate a presigned URL for downloading an object from an S3 bucket.
   *
   * @param bucketId - The bucket ID
   * @param params - Download parameters (key, expiration, etc.)
   * @returns Presigned download URL
   *
   * @example
   * ```typescript
   * const presigned = await client.presignDownload("bucket-123", {
   *   key: "images/photo.jpg",
   *   expiresIn: 3600,
   * });
   *
   * console.log(presigned.url); // Use this URL to download
   * ```
   */
  async presignDownload(
    bucketId: string,
    params: PresignDownloadParams
  ): Promise<PresignedUrl> {
    const body: Record<string, unknown> = {
      key: params.key,
    };

    if (params.expiresIn !== undefined) body.expires_in = params.expiresIn;
    if (params.responseContentDisposition !== undefined)
      body.response_content_disposition = params.responseContentDisposition;

    return await this.request<PresignedUrl>({
      method: "POST",
      path: `/v1/storage/s3/buckets/${encodeURIComponent(bucketId)}/objects/presign-download`,
      body,
      requiresAuth: true,
    });
  }

  // ─── Internal Request Handling ───────────────────────────────────────────

  /**
   * Execute a request with automatic retry, error handling, and response parsing.
   */
  private async request<T>(options: RequestOptions): Promise<T> {
    const response = await this.rawRequest(options);
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
        // Exponential backoff: 1s, 2s, 4s
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
      // If we can't parse the response body, use status text
      return this.errorFromStatus(response.status, response.statusText);
    }

    // Try to extract error from response body
    const error = this.extractError(body);
    const message = error?.message ?? response.statusText;
    const code = error?.code ?? `http_${response.status}`;

    switch (response.status) {
      case 401:
        return new AuthenticationError(message);
      case 402:
        return new InsufficientCreditsError(
          message,
          (error?.details as Record<string, number> | undefined)?.creditsRequired,
          (error?.details as Record<string, number> | undefined)?.creditsAvailable
        );
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
