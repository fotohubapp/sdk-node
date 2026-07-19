import type {
  FotoHubConfig,
  RequestOptions,
  GenerateImageOptions,
  ImageResult,
  EditImageOptions,
  EditResult,
  GenerateVideoOptions,
  VideoResult,
  PollOptions,
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

import { parseSSEStream, ChatStream } from "./streaming.js";

const DEFAULT_BASE_URL = "https://apis.fotohub.app";
const DEFAULT_TIMEOUT = 60_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_IMAGE_MODEL = "seedream-5-0-260128";

const SDK_VERSION = "1.3.0";
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
   * Generate a video from a text prompt. Videos are generated asynchronously.
   * Use `waitForVideo()` to poll until completion.
   *
   * @param options - Video generation parameters
   * @returns Video result with job_id for polling, or completed video_url
   *
   * @example
   * ```typescript
   * const result = await client.generateVideo({
   *   prompt: "A drone flying over a forest at sunset",
   *   model: "veo-2",
   *   duration: 5,
   *   aspect_ratio: "16:9",
   * });
   *
   * // Poll until complete
   * const video = await client.waitForVideo(result.job_id!);
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

    return await this.request<VideoResult>({
      method: "POST",
      path: "/v1/ai/generate/video",
      body,
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
   * ```
   */
  async chat(options: ChatOptions): Promise<ChatResult> {
    const body = this.buildChatBody(options, false);

    return await this.request<ChatResult>({
      method: "POST",
      path: "/v1/ai/chat",
      body,
      requiresAuth: true,
    });
  }

  /**
   * Create a streaming chat completion. Returns a ChatStream that yields
   * chunks as they arrive via Server-Sent Events.
   *
   * @param options - Chat parameters (messages, model, temperature, etc.)
   * @returns AsyncIterable stream of chat chunks
   *
   * @example
   * ```typescript
   * const stream = await client.chatStream({
   *   messages: [{ role: "user", content: "Write a haiku about code" }],
   *   model: "gemini-flash",
   * });
   *
   * // Iterate over chunks
   * for await (const chunk of stream) {
   *   const content = chunk.choices[0]?.delta.content;
   *   if (content) process.stdout.write(content);
   * }
   *
   * // Or collect all text at once
   * const fullText = await stream.toText();
   * ```
   */
  async chatStream(options: ChatOptions): Promise<ChatStream> {
    const body = this.buildChatBody(options, true);

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

  /**
   * Create a chat completion via AWS Bedrock models (Claude, Nova).
   *
   * @param options - Bedrock chat parameters
   * @returns Chat response from Bedrock model
   *
   * @example
   * ```typescript
   * const response = await client.chatBedrock({
   *   messages: [{ role: "user", content: "Summarize this document" }],
   *   model: "claude-sonnet-4.6",
   *   system: "You are a helpful summarizer.",
   *   max_tokens: 2000,
   * });
   * console.log(response.choices[0].message.content);
   * ```
   */
  async chatBedrock(options: ChatBedrockOptions): Promise<ChatResult> {
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
      path: "/v1/ai/chat/bedrock",
      body,
      requiresAuth: true,
    });
  }

  /**
   * Analyze an image to extract labels, faces, NSFW score, OCR text, colors, or objects.
   *
   * @param options - Analysis parameters with image URL and feature selection
   * @returns Analysis results (varies by selected features)
   *
   * @example
   * ```typescript
   * const result = await client.analyzeImage({
   *   image_url: "https://example.com/photo.jpg",
   *   features: ["labels", "colors", "ocr"],
   * });
   * console.log(result.analysis);
   * ```
   */
  async analyzeImage(options: AnalyzeImageOptions): Promise<AnalysisResult> {
    const body: Record<string, unknown> = {
      image_url: options.image_url,
    };

    if (options.features !== undefined) body.features = options.features;

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
      path: "/v1/ai/stability/tools",
      requiresAuth: true,
    });
  }

  /**
   * Run a specific Stability AI tool by ID with custom options.
   *
   * @param toolId - The tool identifier (e.g. "upscale-fast", "remove-background")
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
      tool_id: toolId,
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
      path: "/v1/ai/stability/run",
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
    return await this.runStabilityTool(`upscale-${type}`, { image: imageBase64 });
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
    return await this.runStabilityTool("erase", { image: imageBase64, mask: maskBase64 });
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
    return await this.runStabilityTool("search-and-replace", {
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
    return await this.runStabilityTool("recolor", {
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
   *   console.log(`${plan.name}: ${plan.price_monthly} PLN/mo — ${plan.credits_included} credits`);
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
   * Set a hard overage spending limit (in PLN). When reached, API calls will be rejected.
   *
   * @param hardLimitPln - Maximum overage spending in PLN
   * @param projectId - Optional project ID to scope the limit
   * @returns Updated overage configuration
   *
   * @example
   * ```typescript
   * await client.setOverageLimit(100); // 100 PLN hard cap
   * ```
   */
  async setOverageLimit(hardLimitPln: number, projectId?: string): Promise<OverageResult> {
    const body: Record<string, unknown> = {
      hard_limit_pln: hardLimitPln,
    };

    if (projectId !== undefined) body.project_id = projectId;

    return await this.request<OverageResult>({
      method: "POST",
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
   *   console.log(`${pkg.name}: ${pkg.credits} credits for ${pkg.price_pln} PLN`);
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
   * @returns Checkout session with payment URL
   *
   * @example
   * ```typescript
   * const topup = await client.createTopup("credits-500");
   * // Redirect user to topup.checkout_url for payment
   * ```
   */
  async createTopup(packageSlug: string): Promise<TopupResult> {
    return await this.request<TopupResult>({
      method: "POST",
      path: "/v1/billing/topup",
      body: { package_slug: packageSlug },
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
   * console.log(`Total: ${estimate.total_credits} credits (${estimate.total_pln} PLN)`);
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
      path: "/v1/webhooks",
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
      path: "/v1/webhooks",
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
      path: `/v1/webhooks/${encodeURIComponent(webhookId)}`,
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
      path: `/v1/webhooks/${encodeURIComponent(webhookId)}`,
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
      path: `/v1/webhooks/${encodeURIComponent(webhookId)}/test`,
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
      path: `/v1/webhooks/${encodeURIComponent(webhookId)}/logs`,
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
   * Poll a video generation job until it completes, fails, or times out.
   *
   * @param jobId - The job_id returned from `generateVideo()`
   * @param options - Polling options (interval, timeout, progress callback)
   * @returns Completed video result with video_url
   * @throws {JobFailedError} If the job fails or is cancelled
   * @throws {JobTimeoutError} If maxWait is exceeded
   *
   * @example
   * ```typescript
   * const video = await client.generateVideo({ prompt: "Ocean waves" });
   * const completed = await client.waitForVideo(video.job_id!, {
   *   pollInterval: 3000,
   *   maxWait: 300_000,
   *   onProgress: (v) => console.log(`Status: ${v.status}`),
   * });
   * console.log(completed.video_url);
   * ```
   */
  async waitForVideo(jobId: string, options: PollOptions = {}): Promise<VideoResult> {
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

      const result = await this.request<VideoResult>({
        method: "GET",
        path: `/v1/ai/generate/video/${encodeURIComponent(jobId)}`,
        requiresAuth: true,
      });

      if (options.onProgress) {
        options.onProgress(result);
      }

      if (result.status === "completed") {
        return result;
      }

      if (result.status === "failed" || result.status === "cancelled") {
        throw new JobFailedError(
          jobId,
          `Video job ${jobId} ${result.status}`
        );
      }

      await this.sleep(pollInterval);
    }
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
   *   model: "triposr",
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
   * const gen = await client.generate3D({ mode: "text-to-3d", model: "shap-e", prompt: "a castle" });
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
   * Top up the wallet balance (returns a payment session URL).
   *
   * @param amount - Amount in PLN to add
   * @returns Payment session URL
   *
   * @example
   * ```typescript
   * const { session_url } = await client.topupWallet(100);
   * // Redirect user to session_url for payment
   * ```
   */
  async topupWallet(amount: number): Promise<{ session_url: string }> {
    return await this.request<{ session_url: string }>({
      method: "POST",
      path: "/v1/tiers/wallet/topup",
      body: { amount },
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
   * @param category - Optional filter: "image", "video", "music", "chat", "speech", "stability", "3d"
   * @returns Array of available models with pricing
   *
   * @example
   * ```typescript
   * const models = await client.listModels("image");
   * for (const m of models) {
   *   console.log(`${m.name} (${m.id}): ${m.credit_cost} credits`);
   * }
   * ```
   */
  async listModels(category?: string): Promise<Model[]> {
    const query: Record<string, string | undefined> = {};
    if (category) query.category = category;

    return await this.request<Model[]>({
      method: "GET",
      path: "/v1/models",
      query: query as Record<string, string>,
      requiresAuth: true,
    });
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
