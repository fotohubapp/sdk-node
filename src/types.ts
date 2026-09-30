import type { OpIntent } from "./ops.generated.js";
// ─── Client Configuration ────────────────────────────────────────────────────

export interface FotoHubConfig {
  /** API key for authentication (Bearer token) */
  apiKey: string;
  /** Base URL for the API. Defaults to https://apis.fotohub.app */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to 60000 (60s) */
  timeout?: number;
  /** Maximum retry attempts for failed requests. Defaults to 3 */
  maxRetries?: number;
  /** Custom fetch implementation (for testing or polyfills) */
  fetch?: typeof globalThis.fetch;
}

// ─── Image Generation ────────────────────────────────────────────────────────

export interface GenerateImageOptions {
  /** Text prompt describing the image to generate */
  prompt: string;
  /** Model ID. Defaults to "seedream-5-0-260128" */
  model?: string;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
  /** Aspect ratio (e.g. "16:9", "1:1", "4:3"). Alternative to width/height */
  aspect_ratio?: string;
  /**
   * Whole number of images, 1-8. Charged per image the provider actually
   * delivers: each caps the count at its own maximum and the difference is
   * refunded automatically, so `cost_usd` always matches `images.length`.
   */
  num_images?: number;
  /**
   * Resolution tier: "1K" | "1.5K" | "2K" | "3K" | "4K". This is priced — 4K
   * costs more than 1K on any model offering it. Omit to bill the model's 1K
   * base rate; `width`/`height` are mapped onto a tier when it is absent.
   */
  image_size?: "1K" | "1.5K" | "2K" | "3K" | "4K";
  /** Negative prompt — what to avoid in the image */
  negative_prompt?: string;
  /** Style preset */
  style?: string;
  /** Random seed for reproducibility */
  seed?: number;
  /** Guidance scale / CFG scale */
  guidance_scale?: number;
  /** Number of inference steps */
  steps?: number;
  /** Output format: "png" | "jpeg" | "webp" */
  output_format?: "png" | "jpeg" | "webp";
  /** Reference image URL for img2img / style reference */
  reference_image_url?: string;
  /** Strength of the reference image (0.0-1.0) */
  reference_strength?: number;
}

export interface ImageResult {
  /** Model used for generation */
  model: string;
  /** USD charged for this generation. Same figure as `billing.cost_usd`. */
  cost_usd?: number;
  /** @deprecated Not sent by the prepaid API. Use {@link cost_usd}. */
  credits_used?: number;
  /** Billing information */
  billing: BillingInfo;
  /** Generated image URLs */
  images: string[];
  /** Generation metadata */
  metadata?: ImageMetadata;
}

export interface ImageMetadata {
  /** Generation time in milliseconds */
  generation_time_ms: number;
  /** Model version */
  model_version?: string;
  /** Provider used */
  provider?: string;
  /** Seeds used per image */
  seeds?: number[];
}

// ─── IDA Q 1.0 (proprietary, async) ──────────────────────────────────────────

export interface GenerateIdaQOptions {
  /** Text prompt describing the image to generate. Any language. */
  prompt: string;
  /** Aspect ratio. One of "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9" */
  aspect_ratio?: string;
  /** Resolution tier: "1K" (~30s), "1.5K" (~90s), or "2K" (~3.5min) */
  image_size?: "1K" | "1.5K" | "2K";
  /** Number of images to generate (1-2) */
  num_images?: number;
  /** Random seed for reproducibility */
  seed?: number;
  /** Seconds to wait between status checks while polling. Defaults to 3. */
  poll_interval_seconds?: number;
  /** Maximum seconds to wait for completion before throwing. Defaults to 300. */
  timeout_seconds?: number;
}

export interface IdaQJobSubmitResult {
  model: "ida-q-image";
  job_id: string;
  status: "queued";
  /** USD charged at submit. Refunded in full if the job fails. */
  cost_usd?: number;
  /** @deprecated Not sent by the prepaid API. Use {@link cost_usd}. */
  credits_used?: number;
  billing: BillingInfo;
  estimated_seconds: number;
  poll_url: string;
}

export interface IdaQJobStatus {
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  estimated_seconds?: number;
  images?: string[];
  metadata?: Record<string, unknown>;
  error?: string;
}

// ─── Image Editing ────────────────────────────────────────────────────────────

export interface EditImageOptions {
  /** URL of the image to edit */
  image_url: string;
  /** Edit instruction prompt */
  prompt: string;
  /** Editing mode */
  mode: "inpaint" | "outpaint" | "bgswap" | "upscale" | "remove_bg";
  /** Mask image URL (for inpaint/outpaint modes) */
  mask_url?: string;
  /** Model to use for editing */
  model?: string;
}

export interface EditResult {
  /** Editing mode used */
  mode: string;
  /** USD charged for this edit. Same figure as `billing.cost_usd`. */
  cost_usd?: number;
  /** @deprecated Not sent by the prepaid API. Use {@link cost_usd}. */
  credits_used?: number;
  /** Billing information */
  billing?: BillingInfo;
  /** Processed image URLs */
  images: string[];
}

// ─── Video Generation ────────────────────────────────────────────────────────

export interface GenerateVideoOptions {
  /** Text prompt describing the video to generate */
  prompt: string;
  /**
   * Model ID. See GET /v1/models?category=video for the full list. Examples:
   * veo-3.1-generate-001, wan2.2-t2v-plus, kling-v3, hailuo-o2, sora-2,
   * grok-imagine-video-1.5, gemini-omni-flash.
   *
   * Seedance models are asynchronous and are not reachable through this method —
   * use `generateSeedance()`, which submits and polls for you.
   */
  model?: string;
  /** Duration in seconds */
  duration?: number;
  /** Aspect ratio (e.g. "16:9", "9:16", "1:1") */
  aspect_ratio?: string;
  /** Reference/input image URL (for image-to-video) */
  image_url?: string;
  /** Resolution */
  resolution?: "720p" | "1080p" | "4k";
  /** Negative prompt */
  negative_prompt?: string;
  /** Random seed */
  seed?: number;
  /** Guidance scale */
  guidance_scale?: number;
  /** Frames per second */
  fps?: number;
  /**
   * Milliseconds between polls, for the models that queue instead of rendering
   * inline (Wan, Grok). Defaults to 5000.
   */
  pollInterval?: number;
  /**
   * Milliseconds to keep polling before throwing `JobTimeoutError`. Defaults to
   * 900000 (15 min). The job itself is unaffected and may still finish.
   */
  maxWait?: number;
  /** Called with each intermediate poll result while the job is processing. */
  onProgress?: (result: VideoResult) => void;
}

export interface VideoResult {
  /** Model used */
  model: string;
  /** USD charged at submit. Refunded in full when the job fails. */
  cost_usd?: number;
  /** @deprecated Not sent by the prepaid API. Use {@link cost_usd}. */
  credits_used?: number;
  /** Billing information, on the responses that carry a charge. */
  billing?: BillingInfo;
  /** Video output URL (available when completed) */
  video_url?: string;
  /** Job ID for async polling */
  job_id?: string;
  /** Current status */
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  /** Video duration in seconds */
  duration: number;
  /** Thumbnail URL */
  thumbnail_url?: string;
  /** Why the generation failed. Only present when `status` is "failed". */
  error?: string;
  /**
   * Whether the wallet charge for a failed generation was given back. `true` on
   * the poll that performed the reversal, `false` on every later poll of the
   * same job — meaning "already refunded", not "not refunded".
   */
  refunded?: boolean;
  /** Progress percentage, 0-100, while the job runs. */
  progress?: number;
}

export interface PollOptions {
  /** Polling interval in milliseconds. Defaults to 5000 (5s) */
  pollInterval?: number;
  /** Maximum time to wait in milliseconds. Defaults to 600000 (10 min) */
  maxWait?: number;
  /** Callback for status updates */
  onProgress?: (result: VideoResult) => void;
}

/** A reference item: a URL, or an inline blob. */
export type SeedanceReference = string | { mimeType: string; base64: string };

export interface GenerateSeedanceOptions {
  /** Text prompt describing the video to generate */
  prompt: string;
  /**
   * Seedance model id. Defaults to `seedance-2-5` — the only model that reaches
   * 30s in a single request, and the only one that accepts a source video.
   * Others: seedance-2-0-pro / -fast / -mini, seedance-1-5-pro-251215,
   * seedance-1-0-pro-250528, seedance-1-0-pro-fast-251015.
   */
  model?: string;
  /**
   * Duration in seconds. 2.5 takes any integer 4-30, 2.0 takes 4-15, 1.x takes
   * 5-10. Pass -1 to match a source clip's length (billed at the model ceiling,
   * since the real length is unknown until the clip is decoded).
   */
  duration?: number;
  /**
   * Output resolution. `seedance-2-5` accepts only 480p and 720p — 1080p and 4K
   * return a 400 rather than downgrading silently, because price scales with
   * resolution. `seedance-2-0-pro` accepts all four.
   */
  resolution?: "480p" | "720p" | "1080p" | "4K";
  /** 16:9 | 9:16 | 1:1 | 4:3 | 3:4 | 21:9 | adaptive */
  aspect_ratio?: string;
  /** Native soundtrack. Free on 2.5 — the per-second rate is the same either way. */
  generate_audio?: boolean;
  /** First frame (image-to-video) */
  image_url?: string;
  /** Final frame */
  last_frame_url?: string;
  /** Up to 30 on 2.5 (9 on 2.0) */
  reference_images?: SeedanceReference[];
  /**
   * Up to 10 on 2.5 (3 on 2.0). Attaching one switches the request to
   * reference / editing / extension mode, which can also rewrite the duration
   * and aspect ratio you asked for — read `duration` and `resolution` back off
   * the response, since those are what the per-second charge is applied to.
   */
  reference_videos?: SeedanceReference[];
  /** Up to 10 on 2.5 (3 on 2.0). Requires at least one image or video reference. */
  reference_audios?: SeedanceReference[];
  /** Pre-registered `asset://` portrait ids from `registerVideoAsset()` */
  asset_ids?: string[];
  /** Output container. 2.5 only. */
  output_format?: "mp4" | "mov";
  /** Recorded on the job */
  negative_prompt?: string;
  /** Recorded on the job */
  seed?: number;
  /** HTTPS URL POSTed once the job reaches a terminal state */
  callback_url?: string;
  /** Let the model pick the aspect ratio */
  smart_ratio?: boolean;
  /** Let the model pick the duration */
  smart_duration?: boolean;
  /** Milliseconds between status checks. Defaults to 10000 (10s). */
  pollInterval?: number;
  /**
   * Maximum milliseconds to wait before throwing. Defaults to 1800000 (30 min);
   * a 30s 720p render takes ~4 minutes, plus queue time.
   */
  maxWait?: number;
  /** Called on every poll with the in-flight job */
  onProgress?: (result: SeedanceResult) => void;
}

export interface SeedanceResult extends VideoResult {
  /** 0-100 while rendering */
  progress?: number;
  /** Resolution actually rendered */
  resolution?: string;
  /** Aspect ratio actually rendered ("adaptive" for editing/extension) */
  aspect_ratio?: string;
  /** Whether a native soundtrack was generated */
  generate_audio?: boolean;
  /** Which task type the model inferred: t2v | reference | editing | extension | frames */
  task_type?: string;
  /** Poll URL returned on submit */
  poll_url?: string;
  /** Rough wall-clock estimate in seconds, returned on submit */
  estimated_seconds?: number;
  /**
   * Charge detail, returned on submit. `breakdown` shows how the USD figure was
   * reached — the per-second rate, the seconds actually billed, and the total.
   * It used to be documented as carrying `credits_per_second`; nothing on this
   * response is denominated in credits.
   */
  billing?: SeedanceBilling;
  created_at?: string;
  completed_at?: string;
  error_message?: string;
}

/**
 * `billing` on a Seedance submit: the standard charge block plus a `breakdown`
 * showing the arithmetic behind it.
 */
export interface SeedanceBilling extends BillingInfo {
  breakdown?: {
    currency: 'USD';
    /** Provider rate per second of output. */
    rate_usd_per_second?: number;
    /** Seconds actually billed, which may differ from what you requested. */
    duration_seconds?: number;
    /** Per-image rate, on the flat-priced models. */
    rate_usd_per_image?: number;
    quantity?: number;
    /** Total charged — the same figure as `cost_usd`. */
    amount_usd: number;
    /** `per_second` or `per_operation`. */
    pricing_type?: string;
    resolution?: string;
  };
}

export interface RegisterVideoAssetResult {
  asset_id: string;
  /** The `asset://…` URI to pass in `asset_ids` */
  uri: string;
  status: string;
}

// ─── Music Generation ────────────────────────────────────────────────────────

export interface GenerateMusicOptions {
  /** Text prompt describing the music to generate */
  prompt: string;
  /** Model ID. Supported: minimax, elevenlabs */
  model?: string;
  /** Duration in seconds */
  duration?: number;
  /** Genre hint */
  genre?: string;
  /** Mood descriptor */
  mood?: string;
  /** Tempo in BPM */
  tempo?: number;
  /** Whether to generate instrumental only (no vocals) */
  instrumental?: boolean;
  /** Musical key (e.g. "C major", "A minor") */
  key?: string;
  /** Output format */
  output_format?: "mp3" | "wav" | "flac";
}

export interface MusicResult {
  /** Model used */
  model: string;
  /** USD charged. Audio is billed per minute, so this scales with `duration`. */
  cost_usd?: number;
  /** @deprecated Not sent by the prepaid API. Use {@link cost_usd}. */
  credits_used?: number;
  /** Billing information */
  billing?: BillingInfo;
  /** Audio file URL */
  audio_url: string;
  /** Duration in seconds */
  duration: number;
}

// ─── SFX Generation ──────────────────────────────────────────────────────────

export interface GenerateSfxOptions {
  /** Text prompt describing the sound effect */
  prompt: string;
  /** Duration in seconds */
  duration?: number;
}

export interface SfxResult {
  /** USD charged for this sound effect. */
  cost_usd?: number;
  /** @deprecated Not sent by the prepaid API. Use {@link cost_usd}. */
  credits_used?: number;
  /** Billing information */
  billing?: BillingInfo;
  /** Audio file URL */
  audio_url: string;
}

// ─── Speech Generation ───────────────────────────────────────────────────────

export interface GenerateSpeechOptions {
  /** Text to convert to speech */
  text: string;
  /** Voice ID or preset name */
  voice_id?: string;
  /** TTS provider model */
  model?: "google" | "elevenlabs";
  /** Language code (e.g. "en", "pl", "de") */
  language?: string;
  /** Speech speed multiplier (0.5-2.0) */
  speed?: number;
  /** Pitch adjustment (-20 to 20) */
  pitch?: number;
}

export interface SpeechResult {
  /** USD charged. TTS is billed per 1K characters of input text. */
  cost_usd?: number;
  /** @deprecated Not sent by the prepaid API. Use {@link cost_usd}. */
  credits_used?: number;
  /** Billing information */
  billing?: BillingInfo;
  /** Audio file URL */
  audio_url: string;
}

// ─── Transcription ───────────────────────────────────────────────────────────

export interface TranscribeOptions {
  /** URL of the audio file to transcribe */
  audio_url: string;
  /** Language hint (ISO 639-1 code) */
  language?: string;
}

export interface TranscriptionResult {
  /** USD charged. Transcription is billed per minute of audio. */
  cost_usd?: number;
  /** @deprecated Not sent by the prepaid API. Use {@link cost_usd}. */
  credits_used?: number;
  /** Billing information */
  billing?: BillingInfo;
  /** Transcribed text */
  text: string;
  /** Detected or confirmed language */
  language?: string;
}

// ─── Chat / LLM ─────────────────────────────────────────────────────────────

export interface ChatOptions {
  /** Array of messages in the conversation */
  messages: ChatMessage[];
  /** Model ID (e.g. gemini-flash, gemini-pro, gpt-4o) */
  model?: string;
  /** Temperature (0.0-2.0) */
  temperature?: number;
  /** Maximum tokens to generate */
  max_tokens?: number;
  /** Whether to stream the response */
  stream?: boolean;
  /** System message (convenience, prepended to messages) */
  system?: string;
  /** Top-p sampling */
  top_p?: number;
  /** Stop sequences */
  stop?: string | string[];
  /** Frequency penalty (-2.0 to 2.0) */
  frequency_penalty?: number;
  /** Presence penalty (-2.0 to 2.0) */
  presence_penalty?: number;
}

export interface ChatClaudeOptions {
  /** Array of messages in the conversation */
  messages: ChatMessage[];
  /** Model ID (e.g. claude-sonnet-4.6, claude-haiku-4.5) */
  model?: string;
  /** Temperature (0.0-1.0) */
  temperature?: number;
  /** Maximum tokens to generate */
  max_tokens?: number;
  /** System message */
  system?: string;
}

/**
 * @deprecated Use {@link ChatClaudeOptions} instead. Retained as an alias for
 * backwards compatibility and will be removed in a future release.
 */
export type ChatBedrockOptions = ChatClaudeOptions;

export interface ChatMessage {
  /** Role of the message sender */
  role: "system" | "user" | "assistant";
  /** Message content */
  content: string;
}

export interface ChatResult {
  /** Unique completion ID */
  id: string;
  /** Model used */
  model: string;
  /**
   * USD charged. Input and output tokens are priced separately — every provider
   * charges output at 4-5x input — so this tracks `usage`, not the request count.
   */
  cost_usd?: number;
  /** @deprecated Not sent by the prepaid API. Use {@link cost_usd}. */
  credits_used?: number;
  /** Completion choices */
  choices: ChatChoice[];
  /** Token usage */
  usage: TokenUsage;
  /** Billing information */
  billing?: BillingInfo;
}

export interface ChatChoice {
  /** Choice index */
  index: number;
  /** Generated message */
  message: ChatMessage;
  /** Finish reason */
  finish_reason: "stop" | "length" | "content_filter" | null;
}

export interface TokenUsage {
  /** Number of prompt tokens */
  prompt_tokens: number;
  /** Number of completion tokens */
  completion_tokens: number;
  /** Total tokens */
  total_tokens: number;
}

export interface ChatStreamChunk {
  /** Chunk ID */
  id: string;
  /** Object type */
  object: "chat.completion.chunk";
  /** Creation timestamp */
  created: number;
  /** Model used */
  model: string;
  /** Delta choices */
  choices: ChatStreamChunkChoice[];
}

export interface ChatStreamChunkChoice {
  /** Choice index */
  index: number;
  /** Delta content */
  delta: ChatDelta;
  /** Finish reason (null until final chunk) */
  finish_reason: "stop" | "length" | "content_filter" | null;
}

export interface ChatDelta {
  /** Role (only in first chunk) */
  role?: "assistant";
  /** Content fragment */
  content?: string;
}

// ─── Image Analysis ──────────────────────────────────────────────────────────

export type AnalyzeImageFeature =
  | "labels"
  | "objects"
  | "faces"
  | "nsfw"
  | "colors"
  | "ocr"
  | "landmarks"
  | "logos"
  /** Alias for `ocr` */
  | "text"
  /** Alias for `nsfw` */
  | "safe_search";

export interface AnalyzeImageOptions {
  /** URL of the image to analyze. Must be publicly reachable, max 20MB. */
  image_url: string;
  /**
   * Analysis features to extract. Defaults to `["labels", "objects"]`.
   * An unrecognised name is rejected with 400 rather than ignored.
   */
  features?: AnalyzeImageFeature[];
  /** Language hint for OCR. Label names are always English. `"auto"` omits the hint. */
  language?: string;
  /** Cap on returned labels, 1-50 (default 50) */
  max_labels?: number;
  /** Minimum confidence 0-1 for labels/objects/faces (default 0) */
  min_confidence?: number;
}

/**
 * Bounding box. Read `units`: faces and OCR come back in `pixels`, objects in
 * `normalized` 0-1 fractions of the image width/height.
 */
export interface AnalysisBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  units: "pixels" | "normalized";
}

/** Vision likelihood bucket -- these features return no numeric score. */
export type AnalysisLikelihood =
  | "UNKNOWN"
  | "VERY_UNLIKELY"
  | "UNLIKELY"
  | "POSSIBLE"
  | "LIKELY"
  | "VERY_LIKELY";

export interface AnalysisResult {
  /** USD charged — one flat price regardless of how many features were requested. */
  cost_usd?: number;
  /** @deprecated Not sent by the prepaid API. Use {@link cost_usd}. */
  credits_used?: number;
  billing?: BillingInfo;
  image_url?: string;
  /** Which features actually ran */
  features_analyzed?: string[];
  /** Flat deduplicated union of labels, objects, landmarks and logos, lower-cased */
  auto_tags?: string[];
  labels?: Array<{ name: string; confidence: number | null }>;
  objects?: Array<{
    name: string;
    confidence: number | null;
    bounding_box: AnalysisBoundingBox | null;
  }>;
  /** No age or gender: the provider returns expression likelihoods only. */
  faces?: Array<{
    bounding_box: AnalysisBoundingBox | null;
    confidence: number | null;
    likelihood: Record<string, AnalysisLikelihood>;
  }>;
  nsfw?: {
    /** False when adult, violence or racy is LIKELY or worse */
    is_safe: boolean;
    likelihood: Record<string, AnalysisLikelihood | null>;
  };
  ocr?: {
    text: string;
    /** One entry per detected word. No per-block confidence. */
    blocks: Array<{ text: string; bounding_box: AnalysisBoundingBox | null }>;
  };
  colors?: {
    dominant: Array<{ hex: string; score: number | null; percentage: number | null }>;
  };
  landmarks?: Array<{ name: string; confidence: number | null }>;
  logos?: Array<{ name: string; confidence: number | null }>;
}

// ─── Stability AI Tools ──────────────────────────────────────────────────────

export interface StabilityTool {
  /** Tool identifier */
  id: string;
  /** Associated model ID */
  model_id: string;
  /**
   * What one image costs, in USD, read from the same rate table the charge uses.
   * Ranges from $0.03 (fast upscale) to $0.60 (creative upscale), so the tool you
   * pick matters more here than on most endpoints.
   */
  price_usd: number;
  /** Always `"USD"`. */
  currency: string;
  /** Always `"per image"`. */
  unit: string;
  /**
   * @deprecated Read {@link price_usd}. A legacy relative weight (1–3), **not** a
   * price and not a currency amount — and not proportional to the real prices
   * either, so no conversion factor recovers one. The tools are billed in USD from
   * the prepaid wallet like every other endpoint.
   */
  credits: number;
  /** Whether the tool requires a mask input */
  requires_mask: boolean;
  /** Whether the tool requires a text prompt */
  requires_prompt: boolean;
  /** Whether the tool requires a reference image */
  requires_reference: boolean;
}

export interface StabilityOptions {
  /** Input image as base64 string */
  image: string;
  /** Mask image as base64 (for inpaint/erase) */
  mask?: string;
  /** Text prompt */
  prompt?: string;
  /** Reference image as base64 (for style transfer) */
  reference?: string;
  /** Search prompt (for search-replace, recolor) */
  search_prompt?: string;
  /** Output format */
  output_format?: string;
  /** Random seed */
  seed?: number;
  /** Negative prompt */
  negative_prompt?: string;
  /** Outpaint padding left */
  left?: number;
  /** Outpaint padding right */
  right?: number;
  /** Outpaint padding up */
  up?: number;
  /** Outpaint padding down */
  down?: number;
}

export interface OutpaintPadding {
  /** Left padding in pixels */
  left?: number;
  /** Right padding in pixels */
  right?: number;
  /** Up/top padding in pixels */
  up?: number;
  /** Down/bottom padding in pixels */
  down?: number;
}

export interface StabilityResult {
  /** Processed image as base64 */
  image: string;
  /** Tool that was used */
  tool: string;
  /** Seed used for generation */
  seed?: number;
  /** USD charged for this tool run. */
  cost_usd?: number;
  /** @deprecated Not sent by the prepaid API. Use {@link cost_usd}. */
  credits_used?: number;
  /** Billing information */
  billing?: BillingInfo;
}

// ─── Billing ─────────────────────────────────────────────────────────────────

/**
 * What a billed call charged, and what the wallet has left.
 *
 * The API is prepaid in USD and no longer settles anything in credits, so
 * `cost_usd` is the charge. It is the same figure as the top-level `cost_usd`
 * on the response — read either.
 */
export interface BillingInfo {
  /** USD charged for this operation, to six decimal places. */
  cost_usd: number;
  /**
   * Wallet balance AFTER this charge. Watch it to decide when to top up before
   * the next request is refused with a 402.
   */
  balance_usd?: number | null;
  /** Always `"USD"`. There is no other settlement currency on the API. */
  currency?: 'USD';
  /** Always `"wallet"` — the prepaid balance is the only thing that can pay. */
  method?: 'wallet';
  /** Always `"prepaid"`. */
  model?: 'prepaid';
  /** Per-leg cost breakdown, on the endpoints that return one (chat tokens). */
  legs?: Array<Record<string, unknown>>;
  /**
   * Set only when a token charge exceeded what the wallet could cover. The work
   * was already done and cannot be undone, so the shortfall is reported instead
   * of hidden; the next request is refused at the funds gate.
   */
  uncollected_usd?: number;
  /** Human-readable companion to `uncollected_usd`. */
  warning?: string;
  /**
   * @deprecated The API is prepaid in USD and stopped sending a credit figure,
   * so this is absent on every current response. Reading it as `0` would report
   * a real charge as a free generation — use {@link cost_usd}. Removed in the
   * next major version.
   */
  credits_used?: number;
  /**
   * @deprecated Never sent by the prepaid API. Use {@link balance_usd}.
   */
  credits_remaining?: number;
  /**
   * @deprecated Internal alias for {@link cost_usd} on some endpoints. Prefer
   * `cost_usd`, which every billed response carries.
   */
  usd_charged?: number;
  /**
   * How the charge was derived. `tokens` on `chat()` — the real input/output
   * counts the model reported. `flat_fallback` in the rare case a provider
   * branch returns no usage figures and the old per-request rate applies.
   */
  basis?: 'tokens' | 'flat_fallback';
}

/**
 * `GET /v1/billing/balance` — the prepaid wallet and this month's spend.
 *
 * The `credits` and `tier` fields declared here before were not in the response:
 * `credits` had been dropped (it reported the fotohub.app subscription counter,
 * telling API developers they had hundreds of credits available while their
 * spendable balance was $0) and `tier` was never sent — call
 * {@link FotoHub.getCurrentTier} for that.
 */
export interface BillingBalance {
  wallet: {
    /** Spendable now, in USD. At `0` every billed call returns HTTP 402. */
    balance_usd: number;
    /** Reserved by in-flight jobs. */
    pending_usd: number;
    /** Total ever credited by top-ups. */
    total_topped_up_usd: number;
    currency: 'USD';
  };
  spend: {
    /** Charged this calendar month, in USD. Scoped to the key's project if it has one. */
    this_month_usd: number;
    /** Self-imposed monthly ceiling, or `null` when none is set. */
    monthly_limit_usd: number | null;
    /** `monthly_limit_usd - this_month_usd`, or `null` when no limit is set. */
    remaining_usd?: number | null;
    currency: 'USD';
  };
  /** Always `"prepaid_wallet_usd"`. Stated so you need not infer it from absent keys. */
  billing_model: 'prepaid_wallet_usd';
  /** The active API plan row, or `null`. A plan sets rate limits; it does not fund calls. */
  api_subscription?: Record<string, unknown> | null;
  /**
   * @deprecated Same numbers as {@link spend}, under the old name, kept one
   * release. "Overage" is the wrong word for a prepaid account: there is nothing
   * to exceed — a call beyond the balance is declined, not billed.
   */
  overage?: {
    spent_this_month: number;
    hard_limit_usd: number | null;
    remaining: number | null;
    deprecated: string;
  };
}

export interface PricingCatalog {
  /** Currency code */
  currency: string;
  /**
   * What the prices in `pricing` mean. States that they are the provider's own
   * rate with no platform fee added, billed from the prepaid wallet.
   */
  margin_info?: string;
  /**
   * Pricing per model/operation. Converted from the legacy catalog at the live
   * NBP rate, so a figure here can drift against the amount actually charged.
   * `GET /v1/pricing` publishes the rate the biller uses, per leg with its unit —
   * prefer it for anything you display or budget against.
   */
  pricing: Record<string, unknown>;
  /** Available API plans */
  api_plans: Record<string, unknown>;
  /** Wallet top-up packages */
  topup_packages?: Record<string, unknown>;
  /** Storage packages */
  storage_packages?: Record<string, unknown>;
  /**
   * @deprecated Removed from the response. It published a per-operation credit
   * price for a product that cannot be paid for in credits — an API call is
   * charged from the prepaid USD wallet, so a key holding web-app credits and
   * $0 gets a 402.
   */
  credit_costs?: Record<string, unknown>;
}

/**
 * One entry from `GET /v1/billing/plans`.
 *
 * There are none. The endpoint answers `{"plans": []}` — a 200 with nothing to
 * iterate — because paid API plans were retired on 2026-08-13 and
 * `POST /v1/tiers/subscribe` now answers 410. Rate limits follow the prepaid USD
 * wallet: fund it and the tier resolves on its own.
 *
 * The type is kept so existing `for (const plan of await client.getPlans())`
 * code still compiles against an empty array rather than breaking on a missing
 * export. Every field below is retained for that reason alone; none will arrive.
 */
export interface ApiPlan {
  /** Plan identifier (e.g. "api-developer") */
  slug: string;
  /** Plan display name */
  name: string;
  /**
   * @deprecated No plan is returned, so no price is either. There is no PLN
   * anywhere in API billing — the wallet is USD only.
   */
  price_pln?: number | null;
  /**
   * @deprecated A grant spendable in the fotohub.app web app, never on the API.
   */
  credits_monthly?: number | null;
  /** Requests-per-minute rate limit */
  rate_limit_rpm: number;
  /** Plan features, as display strings */
  features: string[];
  /** Model grant: an explicit id list, or `"all_standard"` / `"all"` / `"all_beta"` / `"all_custom"`. */
  models_allowed?: string | string[];
  /** Included storage in GB, or `null` for uncapped. */
  storage_gb?: number | null;
  /** Largest accepted upload, in MB. */
  max_upload_mb?: number;
  /** @deprecated Not returned by the API. Use `slug`. */
  id?: string;
  /** @deprecated Not returned by the API. There is no monthly price. */
  price_monthly?: number;
  /** @deprecated Not returned by the API. The API has no credit unit. */
  credits_included?: number;
}

/**
 * What `GET /v1/billing/credits` returns now that the API is prepaid.
 *
 * The endpoint is deprecated and answers with the wallet: the API has no credits
 * at all, and credits in the fotohub.app web app cannot pay for API usage. It
 * kept returning 200 rather than 404 so an existing integration polling it learns
 * where its money actually is. `total` / `used` / `remaining` were declared here
 * and are not in the response — reading them gives `undefined`.
 */
export interface CreditsInfo {
  /** Always `true`. Use {@link FotoHub.getBalance} instead. */
  deprecated: boolean;
  /** Explains that the API is prepaid in USD and where to look instead. */
  message: string;
  /** Always `"prepaid_wallet_usd"`. */
  billing_model: string;
  /** The prepaid wallet — the only thing that can pay for an API call. */
  wallet: Record<string, unknown>;
  /** Spend totals for the current period. */
  spend?: Record<string, unknown>;
  /** @deprecated Not in the response. The API has no credit balance. */
  total?: number;
  /** @deprecated Not in the response. The API has no credit balance. */
  used?: number;
  /** @deprecated Not in the response. Read `wallet.balance_usd`. */
  remaining?: number;
  /** @deprecated Not in the response. A prepaid wallet does not reset. */
  resets_at?: string;
}

export interface OverageResult {
  /** Whether overage is enabled */
  enabled: boolean;
  /** Hard monthly overage limit in USD */
  hard_limit_usd: number;
  /**
   * @deprecated Never returned by the API. The endpoint still ACCEPTS
   * `hard_limit_pln` as a request key (read directly as USD, not converted),
   * but the response only carries `hard_limit_usd`.
   */
  hard_limit_pln?: number;
  /** Project ID (if project-scoped) */
  project_id?: string;
}

export interface TopupPackage {
  /** Package slug identifier (e.g. "topup-100", "scale-1000") */
  slug: string;
  /**
   * Display name, which is the amount PAID (e.g. "$1,000") — not the amount
   * credited. With a volume bonus those differ; `total_usd` is what lands in
   * the wallet.
   */
  name: string;
  /** Charge amount in USD — what Stripe bills. */
  amount_usd: number;
  /**
   * Extra dollars credited on top of `amount_usd`, from the volume bonus
   * ladder. Real money in the wallet, spendable on any operation, credited in
   * the same transaction as the payment. `0` below the first rung ($500).
   *
   * Not to be confused with the removed `bonus_credits`: this is USD, and it is
   * granted rather than merely advertised.
   */
  bonus_usd: number;
  /** `amount_usd + bonus_usd` — the balance increase. */
  total_usd: number;
  /** `bonus_usd` as a percentage of `amount_usd`, e.g. `10` for the $1,000 rung. */
  bonus_pct: number;
  /** Set on the rung marketed as the common choice. */
  popular?: boolean;
  /** Set on the rung with the highest bonus percentage. */
  best_value?: boolean;
  /**
   * @deprecated Removed from the API on 2026-08-05. Top-up packages are
   * USD-only; use `amount_usd`.
   */
  amount_pln?: number;
  /**
   * @deprecated Never granted, and gone from the package list. This described a
   * credit transfer no code performed, and the API has no credits at all — its
   * balance is prepaid USD. The volume reward is `bonus_usd` above, which the
   * top-up webhook really does credit.
   */
  bonus_credits?: number | null;
}

/**
 * The ladder `bonus_usd` is computed from, as published by
 * `GET /v1/billing/topup/packages`. Highest threshold first; the first entry at
 * or below the amount paid wins, and the bonus is floored to the cent.
 */
export interface TopupBonusTier {
  /** Minimum amount paid, in USD, to earn `pct`. */
  min_usd: number;
  /** Bonus as a fraction of the amount paid, e.g. `0.2` for 20%. */
  pct: number;
}

/** Full response of `GET /v1/billing/topup/packages`. */
export interface TopupPackageList {
  packages: TopupPackage[];
  /** Smallest accepted custom `amount_usd`. */
  min_usd: number;
  /** Largest accepted custom `amount_usd`; above this, contact sales. */
  max_usd: number;
  bonus_tiers: TopupBonusTier[];
  notes?: string;
}

export interface TopupResult {
  /** Stripe checkout URL to redirect the user to */
  checkout_url: string;
  /** The purchased package descriptor */
  package: TopupPackage;
}

export interface TransactionOptions {
  /** Page number (1-based) */
  page?: number;
  /** Items per page */
  pageSize?: number;
  /** Filter by transaction type */
  type?: string;
}

/**
 * `GET /v1/billing/transactions` — one page of the wallet ledger.
 *
 * The rows come back under `data`, not `transactions`, and the response carries
 * no total: page until you get fewer rows than `page_size`. Both fields declared
 * here before (`transactions`, `total`) read as `undefined`.
 */
export interface TransactionPage {
  /** Transaction records for this page, newest first. */
  data: Transaction[];
  /** Echo of the requested page (1-based). */
  page: number;
  /** Echo of the requested page size. A short page is the last page. */
  page_size: number;
  /** @deprecated Not in the response. Read {@link data}. */
  transactions?: Transaction[];
  /** @deprecated Not in the response — the API does not count matching rows. */
  total?: number;
}

export interface Transaction {
  /** Transaction ID */
  id: string;
  /** Type (charge, refund, topup, subscription, …) */
  type: string;
  /**
   * Signed USD amount: negative for a charge, positive for a top-up. `null` on
   * rows written before the 2026-08-05 USD cutover, which carry `amount_pln`.
   */
  amount_usd: number | null;
  /**
   * Signed PLN amount, on historical rows only. Present because the ledger
   * predates the USD wallet; do not add it to a USD figure.
   */
  amount_pln?: number | null;
  /** Description */
  description: string;
  /** Timestamp */
  created_at: string;
  /** Related model/operation */
  metadata?: Record<string, unknown>;
  /**
   * @deprecated Not a field the API sends — it was never currency-tagged, which
   * is exactly the ambiguity that made a PLN row readable as USD. Use
   * {@link amount_usd}.
   */
  amount?: number;
}

export interface CostOperation {
  /** Operation type (e.g. "image", "video", "chat") */
  type: string;
  /** Model to use */
  model?: string;
  /** Number of operations */
  count?: number;
  /** Duration in seconds (for video/music) */
  duration?: number;
}

export interface CostEstimate {
  /** Total cost in USD, covering the priced operations only — see {@link priced}. */
  total_usd: number;
  /** What the providers charge us for the same batch. Equal to `total_usd` at margin 1.0. */
  provider_cost_usd?: number;
  /** Margin multiplier applied to the provider cost. `1` while prices are 1:1. */
  margin?: number;
  /** Currency (always "USD") */
  currency: string;
  /** Always `"prepaid_wallet_usd"`. */
  billing_model?: string;
  /** Your wallet balance at the time of the estimate. */
  balance_usd?: number;
  /**
   * Whether the wallet covers this batch. Decided server-side, so you never have
   * to compare two numbers you may have parsed as 0. With an unpriced leg in the
   * batch this weakens to "the wallet holds money" — read {@link priced} to know
   * which answer you got.
   */
  sufficient?: boolean;
  /**
   * `false` when any operation had no published rate. That leg is excluded from
   * `total_usd` rather than counted as free, so the total is then incomplete.
   */
  priced?: boolean;
  /** Per-operation breakdown */
  breakdown: CostBreakdownItem[];
  /**
   * @deprecated Always `null`. There is no credit unit in the API — a `0` here
   * would read as "this batch is free". Read {@link total_usd}.
   */
  total_credits?: null;
}

export interface CostBreakdownItem {
  /** Operation type, e.g. `"generate_image"`. */
  type: string;
  /** Model used */
  model?: string;
  /** How many units of the operation were quoted. */
  count?: number;
  /** Whether a rate was found. `false` legs carry a {@link reason} instead of an amount. */
  priced: boolean;
  /** The meter this model is billed by, taken from the rate itself, e.g. `"per_second"`. */
  unit?: string | null;
  /** USD for this item, or `null` when `priced` is false. */
  amount_usd: number | null;
  /** Provider cost for this item, or `null` when `priced` is false. */
  provider_cost_usd: number | null;
  /** Whether the rate was checked against the provider's published price. */
  pricing_verified?: boolean;
  /** Per-leg lines (input/output tokens, image legs). */
  breakdown?: Array<Record<string, unknown>>;
  /** Why this leg could not be priced. Present only when `priced` is false. */
  reason?: string;
  /** Extra pricing context, when the quote carries one. */
  note?: string;
  /**
   * @deprecated Never returned. Read {@link amount_usd}.
   */
  credits?: number;
  /**
   * @deprecated Never returned under this name. Read {@link amount_usd}.
   */
  price_usd?: number;
}

/**
 * One Stripe payment record. The fields come straight from Stripe, so treat them
 * as advisory: which are present depends on the payment method and its state.
 */
export interface Invoice {
  /** Invoice ID */
  id: string;
  /** Invoice number */
  number: string;
  /** Amount, in `currency`. */
  amount: number;
  /** Charge currency, which may be PLN even though the wallet is USD. */
  currency: string;
  /** Status */
  status: string;
  /** Issue date */
  issued_at: string;
  /** PDF download URL */
  pdf_url?: string;
  [key: string]: unknown;
}

// ─── Webhooks ────────────────────────────────────────────────────────────────

export interface Webhook {
  /** Webhook ID */
  id: string;
  /** Display name */
  name: string;
  /** Destination URL */
  url: string;
  /** Events this webhook listens to */
  events: string[];
  /** Whether the webhook is active */
  active: boolean;
  /** Created timestamp */
  created_at: string;
  /** Signing secret (only on creation) */
  secret?: string;
  /** Custom headers */
  headers?: Record<string, string>;
}

export interface CreateWebhookOptions {
  /** Display name for the webhook */
  name: string;
  /** Destination URL */
  url: string;
  /** Events to subscribe to */
  events: string[];
  /** Custom headers to include in webhook requests */
  headers?: Record<string, string>;
}

export interface UpdateWebhookOptions {
  /** Updated display name */
  name?: string;
  /** Updated destination URL */
  url?: string;
  /** Updated events list */
  events?: string[];
  /** Whether the webhook is active */
  active?: boolean;
  /** Updated custom headers */
  headers?: Record<string, string>;
}

export interface WebhookTestResult {
  /** Whether the test delivery succeeded */
  success: boolean;
  /** HTTP status code from the target */
  status_code: number;
  /** Response time in milliseconds */
  response_time_ms: number;
  /** Error message if failed */
  error?: string;
}

export interface WebhookLog {
  /** Log entry ID */
  id: string;
  /** Event type that triggered the webhook */
  event: string;
  /** HTTP status code of the delivery */
  status_code: number;
  /** Whether delivery was successful */
  success: boolean;
  /** Timestamp */
  created_at: string;
  /** Response body (truncated) */
  response_body?: string;
}

// ─── API Response Envelope ───────────────────────────────────────────────────

export interface ApiResponse<T> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data */
  data: T;
  /** Error information (only if success is false) */
  error?: ApiError;
}

export interface ApiError {
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}

// ─── 3D Generation ──────────────────────────────────────────────────────────

export interface Generate3DOptions {
  /** Generation mode */
  mode: "image-to-3d" | "text-to-3d";
  /** 3D model to use */
  model: "fh-lite-3d" | "fh-text-3d" | "fh-pro-3d";
  /** Base64-encoded image (required for image-to-3d) */
  image?: string;
  /** Text prompt (required for text-to-3d) */
  prompt?: string;
  /** Output quality */
  quality?: "draft" | "standard" | "high";
  /** Output file format */
  format?: "glb" | "obj" | "stl" | "usdz";
  /** Additional generation options */
  options?: ThreeDGenerationOptions;
}

export interface ThreeDGenerationOptions {
  /** Whether to generate textures */
  texture?: boolean;
  /** Whether to generate PBR materials */
  pbr?: boolean;
  /** Whether to simplify the mesh */
  simplify?: boolean;
  /** Target polygon count (if simplify is true) */
  target_polys?: number;
}

export interface ThreeDResult {
  /**
   * Identifier of the generated asset — pass this to `get3DStatus()` to re-sign
   * the download link. This is the field the API actually returns; `id` never was.
   */
  file_id?: string;
  /**
   * Download URL for the 3D model file. **Signed, and expires after 2 hours** —
   * persist the bytes, or call `get3DStatus(file_id)` for a fresh link.
   */
  url: string;
  /** Output format */
  format?: string;
  /** Model used */
  model: string;
  /** Stored file name */
  name?: string;
  /** Path inside the private storage bucket */
  storage_path?: string;
  /** Size and wall-clock duration of the generation */
  stats?: {
    file_size_bytes?: number;
    duration_ms?: number;
  };
  /** What left the prepaid wallet for this generation, in USD */
  cost_usd?: number;
  /** Always `"USD"` — the API prices only in dollars */
  currency?: string;
  /** Billing information */
  billing: BillingInfo;

  // ─── Legacy ────────────────────────────────────────────────────────────────
  // These were documented but never returned by `POST /v1/ai/generate/3d`. They
  // stay declared (optional) so existing code keeps compiling, and stay
  // `undefined` at runtime, which is what they always were.

  /** @deprecated Not returned. Use `file_id`. */
  id?: string;
  /**
   * @deprecated Not returned by the generate call — the generation is
   * synchronous, so there is no intermediate state to observe. `get3DStatus()`
   * reports `"completed"` for a stored asset.
   */
  status?: "queued" | "processing" | "completed" | "failed";
  /** @deprecated Never returned; no thumbnail is produced. */
  thumbnail_url?: string;
  /** @deprecated Never returned; the polygon count is not measured. */
  poly_count?: number;
  /** @deprecated Use `stats.file_size_bytes`. */
  file_size?: number;
}

export interface ThreeDModelInfo {
  /** Model ID */
  id: string;
  /** Display name */
  name: string;
  /**
   * Not sent. `AVAILABLE_MODELS` in `generate_3d.py` carries no description, so
   * this was typed as a guaranteed string that rendered as `undefined`; kept
   * optional in case the catalog gains one. Use {@link speed} and
   * {@link quality} to describe a model.
   */
  description?: string;
  /** Price per generation in USD, from the same rate table the charge uses */
  price_usd?: number;
  /** Always `"USD"` */
  currency?: string;
  /** What the price is per — `"per request"` for every 3D model */
  unit?: string;
  /**
   * @deprecated Not returned. The API is prepaid USD and has no credits; read
   * `price_usd` instead.
   */
  credits?: number;
  /** Approximate generation time */
  speed: string;
  /** Supported modes */
  mode: "image-to-3d" | "text-to-3d" | "both";
  /** Whether currently available */
  available: boolean;
  /** Quality rating (1-5) */
  quality: number;
}

export interface ThreeDPollOptions {
  /** Polling interval in milliseconds. Defaults to 3000 (3s) */
  pollInterval?: number;
  /** Maximum time to wait in milliseconds. Defaults to 120000 (2 min) */
  maxWait?: number;
  /** Callback for status updates */
  onProgress?: (result: ThreeDResult) => void;
}

// ─── Virtual Try-On ─────────────────────────────────────────────────────────

export type GarmentCategory = "tops" | "bottoms" | "one-pieces";
export type GarmentPhotoType = "flat-lay" | "model" | "auto";

/** One garment in an outfit. Supply a URL or a catalogue id, not both. */
export interface TryOnGarment {
  garmentImageUrl?: string;
  garmentId?: string;
  category: GarmentCategory;
  garmentPhotoType?: GarmentPhotoType;
}

export interface TryOnOptions {
  /** Publicly reachable URL of the person photo */
  personImageUrl: string;
  /** URL of the garment photo. Required unless garmentId or garments is given */
  garmentImageUrl?: string;
  /** Catalogue garment — supplies the image and overrides category/photo type */
  garmentId?: string;
  /** Defaults to "tops" */
  category?: GarmentCategory;
  /** How the garment was shot. Defaults to "flat-lay" server-side */
  garmentPhotoType?: GarmentPhotoType;
  /**
   * Two garments applied in one job — exactly one top and one bottom, no
   * one-pieces. It runs as two chained passes and delivers one image, so it is
   * priced as its own operation at roughly twice a single try-on, and forces
   * `numImages` to 1. Order is irrelevant: the top is always applied first.
   */
  garments?: TryOnGarment[];
  /** Renders to produce, 1-4. Ignored for an outfit */
  numImages?: number;
  /** Fixed seed for reproducible output */
  seed?: number;
}

export interface TryOnSubmitResult {
  model: string;
  job_id: string;
  status: string;
  category: string;
  /** USD charged at submit. Refunded in full if the job fails. */
  cost_usd?: number;
  /** @deprecated Not sent by the prepaid API. Use {@link cost_usd}. */
  credits_used?: number;
  /**
   * The standard billing block. This was declared inline as
   * `{ method, usd_charged, pln_charged }` — `pln_charged` never appears on a
   * prepaid response, and the block is the same shape every other endpoint
   * returns.
   */
  billing: BillingInfo;
  estimated_seconds: number;
  poll_url: string;
}

export interface TryOnResult {
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  progress?: number | null;
  images?: string[];
  error_message?: string | null;
  estimated_seconds?: number;
  /**
   * Present when an outfit's second pass failed: the top-only render is
   * returned and one credit refunded, so the job still completes.
   */
  metadata?: {
    partial_failure?: { slot: string; reason: string };
    [key: string]: unknown;
  };
}

export interface TryOnPollOptions {
  /** Polling interval in milliseconds. Defaults to 3000 (3s) */
  pollInterval?: number;
  /** Maximum time to wait in milliseconds. Defaults to 120000 (2 min) */
  maxWait?: number;
  /** Callback for status updates */
  onProgress?: (result: TryOnResult) => void;
}

// ─── Tier Management ────────────────────────────────────────────────────────

/**
 * One tier as `GET /v1/tiers/catalog` publishes it.
 *
 * The limits are nested under `limits` and the model/feature grants under
 * `access` — they are not flat fields on the entry. The previous declaration had
 * them flat (`rpm`, `daily_quota`, `credits_monthly`, `features`) plus a `type`
 * discriminator the endpoint never sends, so every one of those reads was
 * `undefined` at runtime.
 */
export interface TierCatalogEntry {
  /** Tier slug identifier, e.g. `payg-basic`, `sub-developer` */
  slug: string;
  /** Display name */
  name: string;
  /** One-line description of who the tier is for */
  description: string;
  /**
   * `0` on pay-as-you-go entries and `null` on every subscription entry. Nothing
   * in this catalog has a price: a tier is a rate-limit definition, not a
   * product. Do not render it as a fee.
   */
  price_monthly: number | null;
  /**
   * `"USD"` on pay-as-you-go entries and `null` on subscription entries — there
   * is no PLN anywhere on this endpoint any more.
   */
  price_currency: "USD" | null;
  /** Rate and capacity limits. */
  limits: TierLimits;
  /** Which model families and features the tier unlocks. */
  access: TierAccess;
  /**
   * `false` on every entry: no tier can be bought. Present on subscription
   * entries; absent on pay-as-you-go ones, which were never purchasable either.
   */
  purchasable?: false;
  /**
   * `true` on the three retired `sub-*` tiers. They stay in the catalog because
   * they are live rate-limit definitions for accounts that already hold one.
   * Absent on `sub-enterprise`, which is a current contract, and on PAYG.
   */
  legacy?: boolean;
  /**
   * How to reach these limits: `"wallet_topup"` on everything self-serve,
   * `"contact_sales"` on `sub-enterprise`.
   */
  upgrade_path?: "wallet_topup" | "contact_sales";
  /**
   * Wallet thresholds that auto-resolve a pay-as-you-go tier, in USD. Absent on
   * subscription entries. This is an object, not the prose string the type
   * previously declared.
   */
  requirements?: { min_wallet_balance: number; min_lifetime_spend: number };
}

export interface TierAccess {
  /** Model family grant: `"basic"`, `"all_standard"`, `"all"`. */
  models: string;
  /** Feature slugs the tier may call, e.g. `"image_generation"`. */
  features: string[];
  /** Queue priority: `"normal"`, `"high"`, `"highest"`. */
  priority: string;
  /** Maximum live API keys, where the tier caps them. */
  api_keys_max?: number;
  /** Support channel, e.g. `"community"`, `"email"`. */
  support?: string;
  /** Uptime commitment, on tiers that carry one. */
  sla?: string;
  [key: string]: unknown;
}

/**
 * `GET /v1/tiers/catalog` — pay-as-you-go and subscription tiers in two
 * separate arrays.
 *
 * There is no flat `tiers` array on this response; the field this type used to
 * declare did not exist, so iterating it threw on `undefined`. For a single flat
 * list use {@link FotoHub.compareTiers}.
 */
export interface TierCatalog {
  /** Tiers resolved automatically from your wallet balance and lifetime spend. */
  payg: TierCatalogEntry[];
  /** Paid monthly tiers. */
  subscriptions: TierCatalogEntry[];
  /** Wallet currency — always `"USD"`. Per-tier prices use `price_currency`. */
  currency: "USD";
  /** Currency of the pay-as-you-go wallet — always `"USD"`. */
  payg_currency: "USD";
  /** Billing cycle of the subscription tiers. */
  billing_cycle: string;
  /**
   * How spending past your balance is handled: it is not. The API is prepaid,
   * so a call that would exceed the balance is declined with HTTP 402 rather
   * than billed as overage.
   */
  overage_policy: string;
}

export interface TierInfo {
  /** Current tier slug */
  tier: string;
  /** Tier display name */
  name: string;
  /**
   * Tier family. The response field is `category`, not `type` — `type` was never
   * sent, so reading it always gave `undefined`.
   */
  category: "payg" | "subscription";
  /** Current rate limits */
  limits: TierLimits;
  /** Request counters for the current window */
  usage: TierUsage;
  /**
   * The prepaid balance that pays for every API call. A tier governs how fast
   * you may spend; it never funds anything.
   */
  wallet: TierWallet;
  /** Which model families and features the tier unlocks. */
  access?: Record<string, unknown>;
  /** The active subscription row, or `null` on a pay-as-you-go tier. */
  subscription?: Record<string, unknown> | null;
  /** Tiers you could move up to from here. */
  upgrade_options?: Array<Record<string, unknown>>;
}

export interface TierLimits {
  /** Requests per minute */
  rpm: number;
  /** Daily request quota */
  daily_quota: number;
  /** 4-hour burst allowance */
  burst_4h: number;
  /** Jobs that may run at the same time */
  concurrent_jobs?: number;
  /** Largest accepted upload, in MB */
  max_upload_mb?: number;
  /** Included storage, in GB */
  storage_gb?: number;
  /** Tokens per minute */
  tpm?: number;
  /**
   * @deprecated A tier grant, not API spending power: the API is prepaid in USD
   * and credits cannot pay for a call. `0` on every pay-as-you-go tier. Read
   * `wallet.balance_usd` to know what you can actually spend.
   */
  monthly_credits?: number;
}

export interface TierUsage {
  /** Requests in the current 4-hour burst window */
  used_4h: number;
  /** Requests in the current billing period */
  used_period: number;
  /** Requests made today, against `limits.daily_quota` */
  requests_today: number;
}

export interface TierWallet {
  /** Spendable prepaid balance in USD. At `0` every billed call returns 402. */
  balance_usd: number;
  /** Held by in-flight jobs, not yet settled. */
  pending_usd: number;
  /** Total ever topped up. */
  lifetime_spend: number;
}

/** One row of the side-by-side table `GET /v1/tiers/compare` returns. */
export interface TierComparisonRow {
  slug: string;
  name: string;
  description: string;
  /** `"payg"` or `"subscription"`. */
  category: string;
  /**
   * `false` on every row — no tier is for sale. Rate limits follow the prepaid
   * wallet, so there is nothing to buy here.
   */
  purchasable: boolean;
  /**
   * How to reach the row's limits: `"wallet_topup"`, or `"contact_sales"` on
   * `sub-enterprise`.
   */
  upgrade_path: "wallet_topup" | "contact_sales";
  /** Requests per minute. */
  rpm: number;
  /** Jobs that may run at the same time. */
  concurrent_jobs: number;
  /**
   * Included storage in GB, or **`-1` for uncapped** (`sub-enterprise`). Render
   * a negative as "unlimited": interpolated raw it reads as a negative
   * allowance, which is how a live page came to display "Storage -1 GB".
   */
  storage_gb: number;
  /** Model family grant. */
  models: string;
  /** Queue priority. */
  priority: string;
  /** Uptime commitment, or `null`. */
  sla?: string | null;
  /** Support channel; defaults to `"community"`. */
  support: string;
  /**
   * @deprecated Removed from the response. It quoted a monthly fee for plans
   * nobody can buy. Rate limits follow the prepaid wallet: read `rpm` /
   * `concurrent_jobs` and fund the wallet to raise them.
   */
  price_monthly?: number | null;
  /**
   * @deprecated Removed from the response. It described a grant spendable only
   * on fotohub.app, never on the API. Compare tiers on `rpm` /
   * `concurrent_jobs`; fund calls from the wallet.
   */
  monthly_credits?: number;
}

/**
 * `GET /v1/tiers/compare` — every tier flattened for a comparison table.
 *
 * It does not tell you which tier is yours: the previously declared `current`
 * field is not in the response (read `tier` from {@link FotoHub.getCurrentTier}),
 * and the rows are this flat shape rather than {@link TierCatalogEntry}.
 */
export interface TierComparison {
  tiers: TierComparisonRow[];
  /** `"USD"`. The wallet is the only thing money is denominated in. */
  currency: string;
  /** `"prepaid_wallet_usd"`. */
  billing_model: string;
  /**
   * `true`. `POST /v1/tiers/subscribe` answers 410 for every tier; the `sub-*`
   * rows are rate-limit definitions for accounts that already hold one.
   */
  subscriptions_retired: boolean;
}

/**
 * `GET /v1/tiers/wallet` — the full wallet: balance, month to date, and the
 * recent ledger.
 *
 * Every field this type used to declare (`balance`, `currency`,
 * `lifetime_spend`, `auto_topup`) was absent from the response — the amounts
 * live under `balance`, which is an object.
 */
export interface WalletInfo {
  balance: {
    /** Spendable now, in USD. At `0` every billed call returns HTTP 402. */
    available_usd: number;
    /** Reserved by in-flight jobs, not yet settled. */
    pending_usd: number;
    /** Total ever credited by top-ups. */
    total_earned_usd: number;
    /** Total ever withdrawn. */
    total_withdrawn_usd: number;
  };
  this_month: {
    /** Charged so far this calendar month, in USD (positive). */
    spent_usd: number;
    /** Topped up so far this calendar month, in USD. */
    topup_usd: number;
    /** `topup_usd - spent_usd`. */
    net: number;
    /**
     * `true` when the month has more ledger rows than the server sums, so the
     * three figures above are a lower bound rather than the total. Storage
     * settles hourly, so a busy account can reach it.
     */
    truncated: boolean;
  };
  /**
   * Up to 20 newest ledger rows. `amount_usd` is `null` on rows written before
   * the 2026-08-05 USD cutover, which carry `amount_pln` instead.
   */
  recent_transactions: Array<{
    id: string;
    created_at: string;
    type: string;
    amount_usd: number | null;
    amount_pln?: number | null;
    balance_after?: number | null;
    description?: string | null;
  }>;
  /** Where to send the user to add funds. */
  topup_url: string;
}

export interface EnterpriseApplication {
  /** Company name */
  company_name: string;
  /** Contact email */
  contact_email: string;
  /** Expected monthly usage */
  expected_usage: string;
  /** Use case description */
  use_case: string;
  /** Additional notes */
  notes?: string;
}

// ─── Models ──────────────────────────────────────────────────────────────────

export interface Model {
  /** Model ID */
  id: string;
  /** Display name */
  name: string;
  /** Model category: "image" | "video" | "text" | "audio" */
  category: string;
  /** Provider name */
  provider: string;
  /** Human-readable summary, usually including the credit rate */
  description?: string;
  /** Whether the model is currently offered */
  is_active: boolean;
  /**
   * `"token"` for per-token models (read the two per-1k fields), anything else
   * for the rest. This does NOT tell you what a unit is — read `price_unit`.
   */
  pricing_type?: string;
  /**
   * Price of ONE unit of this model, in USD. The unit is `price_unit`, so on a
   * video model this is per SECOND: a 5s clip costs 5x this number. `null` on
   * token-priced models.
   */
  request_price: number | null;
  /**
   * What one unit of `request_price` buys:
   * - `"request"` — one call (images, editing, analysis)
   * - `"second"` — one second of output video (every video model)
   * - `"minute"` — one minute of audio; output for music, INPUT for
   *   transcription / audio-translation / audio-mastering / audio-stems
   * - `"1k_characters"` — 1000 input characters (text-to-speech)
   * - `"1k_tokens"` — read `input_price_per_1k_tokens` /
   *   `output_price_per_1k_tokens` instead
   */
  price_unit: "request" | "second" | "minute" | "1k_characters" | "1k_tokens";
  /** The same thing as `price_unit`, spelled out for humans */
  request_price_per: string;
  /** Always "USD" on this endpoint */
  currency: string;
  /** USD per 1000 input tokens, on token-priced models */
  input_price_per_1k_tokens?: number | null;
  /** USD per 1000 output tokens, on token-priced models */
  output_price_per_1k_tokens?: number | null;
  /** Per-minute request cap, when one is set */
  request_limit_per_minute?: number | null;
  /** Per-minute token cap, when one is set */
  token_limit_per_minute?: number | null;
  /** Context window in tokens, on chat models */
  context_window?: number | null;
  /** Output cap in tokens, on chat models */
  max_output_tokens?: number | null;
  /** Whether batch submission is supported */
  supports_batch?: boolean;
  /** Capability tags, shape varies by category */
  features?: unknown;
  /** Provider-specific annotations */
  metadata?: Record<string, unknown> | null;
}

// ─── Gabriel AI Orchestrator ────────────────────────────────────────────────

export interface GabrielClassifyOptions {
  /** Natural language request (max 1000 chars) */
  prompt: string;
  /** Language code (default: "en") */
  language?: string;
  /** Additional context for better classification */
  context?: GabrielContext;
  /** Enrich prompt with model-specific knowledge */
  enhance_prompt?: boolean;
}

export interface GabrielContext {
  /** User's subscription tier */
  user_tier?: string;
  /**
   * The end user's remaining **fotohub.app subscription credits**, if you are
   * building on top of the web app. A hint you send, not a balance the API has:
   * it only makes the suggestions warn about running low (`gabriel.py:327`). API
   * usage is paid from the prepaid USD wallet and has no credits at all.
   */
  credits_remaining?: number;
  /** Last 5 features the user used */
  recent_tools?: string[];
  /** Active brand kit ID */
  brand_id?: string;
}

export interface GabrielResult {
  /** Action type */
  action: "route" | "answer" | "workflow" | "error";
  /** Feature path to navigate to */
  target?: string;
  /** Pre-configured parameters */
  params?: Record<string, unknown>;
  /** Selected model */
  model_selected?: string;
  /** Alternative suggestions */
  suggested_actions?: Array<{ label: string; target: string }>;
  /** Classification confidence (0-1) */
  confidence?: number;
  /** Estimated credit cost */
  credits_estimated?: number;
  /** Contextual tips */
  tips?: string[];
  /** Direct answer text (when action is "answer") */
  answer?: string;
}

export interface GabrielStreamEvent {
  /** Event type */
  type: "thinking" | "routing" | "result" | "error";
  /** Status or content */
  content?: string;
  /** Tool being called (routing event) */
  tool?: string;
  /** Final routing result fields (result event) */
  target?: string;
  params?: Record<string, unknown>;
  model_selected?: string;
  tips?: string[];
}

export interface GabrielSuggestOptions {
  /** Partial user input (min 2 chars) */
  partial: string;
  /** Tab context */
  tab?: "all" | "image" | "video" | "audio" | "chat";
  /** Current page path */
  page?: string;
}

export interface GabrielSuggestion {
  /** Suggestion text */
  text: string;
  /** Category */
  category: "prompt" | "tip" | "model" | "feature";
  /** Navigation target */
  target?: string;
  /** Icon identifier */
  icon?: string | null;
}

export interface GabrielRecommendOptions {
  /** Current page path */
  page?: string;
  /** The end user's fotohub.app credit balance — see {@link GabrielContext.credits_remaining}. */
  credits_remaining?: number;
  /** Whether user has a brand kit */
  has_brand?: boolean;
  /** Last few actions taken */
  recent_actions?: string[];
}

export interface GabrielRecommendation {
  /** Recommendation text */
  text: string;
  /** Navigation target */
  target: string;
  /** Icon identifier */
  icon: string;
}

export interface TranslateOptions {
  /** Text to translate (max 10,000 chars) */
  text: string;
  /** Target language code */
  target_language: string;
  /** Source language (auto-detected if omitted) */
  source_language?: string;
}

export interface TranslateResult {
  /** Translated text */
  translated_text: string;
  /** Detected/specified source language */
  source_language: string;
  /** Target language */
  target_language: string;
  /** Character count */
  character_count: number;
}

// ─── Internal Types ──────────────────────────────────────────────────────────

export interface RequestOptions {
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** Request path (relative to baseUrl) */
  path: string;
  /** Request body */
  body?: unknown;
  /** Query parameters */
  query?: Record<string, string | number | boolean | undefined>;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Whether this endpoint requires authentication */
  requiresAuth?: boolean;
  /** Request timeout override */
  timeout?: number;
  /** Whether to parse response as stream */
  stream?: boolean;
  /**
   * Set to `false` for a write that is not safe to replay: a 5xx, timeout or
   * network failure is then thrown at once instead of retried (429 is still
   * retried: the request was refused before it ran). Default true.
   */
  retryAmbiguous?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// VIDEO TIMELINE API  (/v1/video/projects, /v1/video/jobs, /v1/video/ops)
// Wire format is camelCase in both directions.
// ═══════════════════════════════════════════════════════════════════════════

/** Aspect ratios a timeline project can be created with. */
export type VideoProjectAspect = "16:9" | "9:16" | "1:1" | "4:5" | "4:3";

/**
 * One media item to bring into a new project. Give exactly one of `url`
 * (public HTTPS, re-hosted into your storage) or `storagePath`
 * (`<bucket>/<userId>/...`, your own storage).
 */
export interface VideoMediaInput {
  url?: string;
  storagePath?: string;
  kind?: "video" | "audio" | "image";
  name?: string;
}

export interface CreateVideoProjectOptions {
  title?: string;
  aspect?: VideoProjectAspect;
  fps?: number;
  media?: VideoMediaInput[];
  /** Template id, or `{ id }`. Media then fill the template's slots. */
  template?: string | { id: string };
  /** `sequence` (default) lays media out one after another; `none` only registers them. */
  placeMedia?: "sequence" | "none";
  /** Overrides the auto-generated `X-Idempotency-Key` (stable across process restarts). */
  idempotencyKey?: string;
}

/** A media item registered in a project. */
export interface VideoProjectMedia {
  assetId: string;
  kind: "video" | "audio" | "image" | (string & {});
  name?: string;
  src?: string;
  storagePath?: string;
  /** Seconds. */
  duration?: number;
  durationTicks?: number;
  hasAudio?: boolean;
  width?: number;
  height?: number;
}

/** Compact description of the timeline (tracks, clips, markers). Shape follows the editor document. */
export type VideoProjectDigest = Record<string, unknown>;

export interface VideoProjectVersion {
  id: string;
  createdAt: string;
  label?: string;
}

export interface VideoProject {
  projectId: string;
  /** Bumps on every saved change; pass it back as `expectedSaveRev` for optimistic concurrency. */
  saveRev: number;
  ticksPerSecond: number;
  digest: VideoProjectDigest;
  media: VideoProjectMedia[];
  /** Open the project in the editor. */
  editorUrl: string;
  title?: string;
  updatedAt?: string;
  versions?: VideoProjectVersion[];
  /** Media that `placeMedia: "sequence"` could not place (create only). */
  unplacedMedia?: Array<{ assetId: string; reason: string }>;
  /** Full editor document (only when requested). */
  doc?: Record<string, unknown>;
}

export interface VideoProjectSummary {
  projectId: string;
  title?: string;
  updatedAt?: string;
  editorUrl: string;
}

export interface ListVideoProjectsResult {
  projects: VideoProjectSummary[];
}

export interface ApplyVideoOpsOptions {
  /**
   * 1 to 40 operations. An operation the engine rejects is skipped and reported
   * per op; the batch rolls back (`rolledBack: true`) only when the resulting
   * document would violate the timeline invariants.
   */
  ops: OpIntent[];
  /** Validate and preview without saving. */
  dryRun?: boolean;
  /** Reject with `save-conflict` (409) when the project changed since you read it. */
  expectedSaveRev?: number;
  /** Version label recorded in the project history (at most 60 characters). */
  label?: string;
  /** Free-form note on why the batch was applied (at most 2000 characters). */
  note?: string;
}

export interface VideoOpResult {
  ok: boolean;
  [key: string]: unknown;
}

export interface ApplyOpsResult {
  ok: boolean;
  /** True when a violation aborted the batch; the document and `saveRev` are unchanged. */
  rolledBack: boolean;
  violations: unknown[];
  saveRev: number;
  results: VideoOpResult[];
  summary?: unknown;
  accepted: number;
  rejected: number;
  refs?: unknown;
  dryRun?: boolean;
  digestDelta?: unknown;
  versionSaved?: unknown;
  warnings?: unknown[];
}

export interface VideoDigestOptions {
  /** Return details for these clips (1 to 10). */
  clipIds?: string[];
  view?: "digest" | "clips";
}

export interface VideoDigestResult {
  saveRev: number;
  digest?: VideoProjectDigest;
  clips?: Array<Record<string, unknown>>;
  missing?: string[];
}

export type VideoLintSeverity = "error" | "warn" | "warning" | "info";

export interface VideoLintOptions {
  /** Rule ids to run (at most 32). */
  rules?: string[];
  /** Severities to report (`warning` is a synonym of `warn`). A single value is accepted too. */
  severity?: VideoLintSeverity | VideoLintSeverity[];
}

export interface VideoLintFinding {
  rule: string;
  severity: "error" | "warn" | "info";
  clipId?: string;
  clipIds?: string[];
  at?: number;
  atSeconds?: number;
  end?: number;
  endSeconds?: number;
  message: string;
  params?: Record<string, string | number>;
  fix?: "relink" | "trim-to-content" | "none";
  suggestion?: string;
}

export interface LintResult {
  saveRev?: number;
  findings: VideoLintFinding[];
  counts: { error: number; warn: number; info: number };
  available: boolean;
  /** Non-fatal notes from the checker. */
  warnings?: string[];
}

/** Pick exactly one of `times`, `count` or `cuts: true`. */
export interface CaptureVideoOptions {
  /** Timeline seconds, at most 24. */
  times?: number[];
  count?: number;
  cuts?: boolean;
  width?: number;
  sheet?: { maxCells?: number; maxEdge?: number };
  idempotencyKey?: string;
  /** Poll {@link FotoHub.waitForVideoJob} and return the finished job. Default false. */
  wait?: boolean;
  maxWaitMs?: number;
  /** Polling interval when `wait` is true. Default 3 000. */
  intervalMs?: number;
}

export interface CaptureFrame {
  index: number;
  /** Requested time. */
  t: number;
  /** Time of the frame actually extracted. */
  actualT: number;
  label: string;
  /** Index into `sheets`. */
  sheet: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CaptureSheet {
  url: string;
  width: number;
  height: number;
}

/** A `VideoJob` of `kind: "capture"` once `status` is `completed`. */
export interface CaptureResult {
  frames: CaptureFrame[];
  sheets: CaptureSheet[];
  missing: Array<{ index: number; t: number }>;
}

/** Output containers; matched case-insensitively (`mp4`, `MP4`, ...). */
export type RenderFormat = "mp4" | "webm" | "mov" | "gif" | "mp3" | "wav" | (string & {});

export interface RenderVideoOptions {
  /** Case-insensitive. */
  format?: RenderFormat;
  codec?: "h264" | "h265" | "prores" | (string & {});
  /** `draft` is the lowest quality (same as `standard` in the final render). */
  quality?: "draft" | "standard" | "high" | "ultra" | (string & {});
  resolution?: "720p" | "1080p" | "2k" | "4k" | (string & {});
  fps?: number;
  bitrate?: string;
  range?: { in: number; out: number };
  contentCredentials?: boolean;
  contentAiDeclared?: boolean;
  idempotencyKey?: string;
  /** Poll {@link FotoHub.waitForVideoJob} until the render finishes. Default false. */
  wait?: boolean;
  /** Give-up time when `wait` is true. Default 1 800 000 (30 min). */
  maxWaitMs?: number;
  /** Polling interval when `wait` is true. Default 3 000. */
  intervalMs?: number;
}

export interface VideoJobBilling {
  cost_usd: number;
  balance_usd?: number | null;
  currency: string;
  /** `wallet`, `credits`, `credits+wallet`, or `plan` when the plan includes the operation. */
  method: string;
  model?: string;
  credits_used?: number;
  credits_remaining?: number;
}

export type VideoJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface VideoJob extends Partial<CaptureResult> {
  jobId: string;
  status: VideoJobStatus;
  kind?: "render" | "capture" | "auto_edit" | (string & {});
  projectId?: string;
  /** 0 to 100. */
  progress?: number;
  outputUrl?: string;
  outputSize?: number;
  /** A string for render / capture jobs; `{code, message}` for Auto-Edit jobs. */
  error?: string | { code: string; message?: string };
  reason?: string;
  /** Auto-Edit `save-conflict`: project revision now (apply with `expectedSaveRev` set to it). */
  currentSaveRev?: number;
  /** Auto-Edit: the kept draft, when there is one. */
  draftId?: string;
  warnings?: unknown[];
  queuePosition?: number;
  /** Set on failed / cancelled jobs: whether the charge was returned. */
  refunded?: boolean;
  billedMinutes?: number;
  /** Charge summary on the queued (202) answer of capture / render. */
  cost_usd?: number;
  currency?: string;
  billing?: VideoJobBilling;
  /** Credits drawn, when the charge used credits (OAuth sessions). */
  chargedCredits?: number;
  /** Cut points found (capture with `cuts`). */
  cuts?: unknown;
  saveRev?: number;
  times?: number[];
  width?: number;
  height?: number;
  /** Auto-edit progress and outcome. */
  stages?: unknown;
  report?: Record<string, unknown>;
  [key: string]: unknown;
}

/** One stage of an Auto-Edit run, in the order the run reaches them. */
export interface AutoEditStage {
  stage: "signals" | "cuts" | "brief" | "broll" | "graphics" | "audio" | "captions" | "apply" | (string & {});
  status: "running" | "done" | "skipped" | "error" | (string & {});
  /** 0 to 100 within the stage, when known. */
  pct?: number;
  detail?: string;
}

/** Token counters of an Auto-Edit run (no model names) and what they were billed. */
export interface AutoEditUsage {
  inputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  /** Stays `false` while the base fee covers the run's AI tokens (the default): tokens are metered, not billed. */
  billed: boolean;
  units?: number;
  chargedUsd?: number;
  chargedCredits?: number;
  /** Part of the usage that could not be collected. */
  uncollectedUsd?: number;
}

/**
 * State of an Auto-Edit job: the 202 answer of {@link FotoHub.autoEditVideoProject}
 * (`jobId`, `status`, `projectId`, `billing`) and the job view returned by
 * {@link FotoHub.getVideoJob}.
 */
export interface AutoEditJob {
  jobId: string;
  status: VideoJobStatus;
  kind?: "auto_edit";
  projectId?: string;
  /** 0 to 100. */
  progress?: number;
  stages?: AutoEditStage[];
  /** What was done and skipped; carries `committed`. */
  report?: Record<string, unknown>;
  usage?: AutoEditUsage;
  /** True once the result is in the project; false while it is a draft (`autoApply: false`). */
  committed?: boolean;
  /** Project revision after the commit. */
  saveRev?: number;
  /** Revision the run started from; the default `expectedSaveRev` of the apply. */
  baseSaveRev?: number;
  /** Project revision now, on a `save-conflict`. */
  currentSaveRev?: number;
  /** Seconds left before an unapplied draft expires. */
  expiresInSeconds?: number;
  unchanged?: boolean;
  draftId?: string;
  error?: { code: string; message?: string };
  reason?: string;
  /** On failed / cancelled jobs: whether the charge was returned. */
  refunded?: boolean;
  billing?: VideoJobBilling;
  chargedCredits?: number;
  [key: string]: unknown;
}

/** Answer of {@link FotoHub.applyVideoAutoEdit}. */
export interface ApplyAutoEditResult {
  jobId: string;
  projectId: string;
  committed: true;
  saveRev?: number;
  unchanged?: boolean;
  digest?: VideoProjectDigest;
  versionSaved?: boolean;
  warnings?: unknown[];
}

export interface ApplyAutoEditOptions {
  /** Reject with `save-conflict` (409) when the project moved past this revision. Defaults to the revision the run started from. */
  expectedSaveRev?: number;
}

export interface WaitForVideoJobOptions {
  /** Polling interval in milliseconds. Default 3 000. */
  intervalMs?: number;
  /** Maximum time to wait in milliseconds. Default 1 800 000 (30 min). */
  maxWaitMs?: number;
  /** Called after every poll. */
  onProgress?: (job: VideoJob) => void;
}

export interface AutoEditToggles {
  cutSilences?: boolean;
  removeFillers?: boolean;
  broll?: boolean;
  zooms?: boolean;
  graphics?: boolean;
  sfx?: boolean;
  music?: boolean;
  captions?: boolean;
  maps?: boolean;
}

export interface AutoEditOptions {
  /** `auto_edit` (default) edits the whole project and needs `style`; `cut` proposes a cut from `brief`. */
  mode?: "auto_edit" | "cut";
  /** Required for `mode: "auto_edit"`. */
  style?: "viral" | "podcast" | "explainer" | "storytelling" | "captions-only";
  /** Every toggle defaults to on; `false` switches one off. */
  toggles?: AutoEditToggles;
  /** Default `auto`. */
  language?: "pl" | "en" | "de" | "auto";
  /** Defaults to the project's current aspect, else 16:9. */
  aspect?: "16:9" | "9:16" | "1:1" | "4:5";
  /** Ceiling (USD, 0 to 50) for AI generations; 0 (default) uses stock and existing media only. */
  aiBudgetUsd?: number;
  /** Commit the result to the project (default true); false keeps a draft (about 30 min) to commit with {@link FotoHub.applyVideoAutoEdit}. */
  autoApply?: boolean;
  /** Required for `mode: "cut"`: the cut brief (profile, targetTicks, pacing, order, ...). */
  brief?: Record<string, unknown>;
  idempotencyKey?: string;
  /** Poll until the run finishes and return the finished job. Default false. */
  wait?: boolean;
  maxWaitMs?: number;
  /** Polling interval when `wait` is true. Default 3 000. */
  intervalMs?: number;
}

export interface VideoOpsCatalog {
  /** JSON Schema of the `ops` body. */
  schema: Record<string, unknown>;
  notes: string;
  ticksPerSecond: number;
  maxOps: number;
}

export interface VideoSourceRef {
  /** Public HTTPS URL. Give this, or `projectId` + `mediaId`. */
  url?: string;
  projectId?: string;
  mediaId?: string;
}

export interface DetectScenesOptions extends VideoSourceRef {
  threshold?: number;
  minSceneDuration?: number;
}

export interface DetectSilenceOptions extends VideoSourceRef {
  noiseFloorDb?: number;
  minSilenceDuration?: number;
}

export type DetectBeatsOptions = VideoSourceRef;

export interface TranscribeVideoOptions extends VideoSourceRef {
  language?: string;
  hotwords?: string[];
}

/** Billing fields the paid analysis routes add to their answers. */
export type VideoAnalysisResult = Record<string, unknown>;

export interface VideoTranscribeJob {
  jobId?: string;
  status: "queued" | "processing" | "completed" | "failed" | (string & {});
  progress?: number;
  result?: unknown;
  /** `null` (not absent) on jobs that have not failed. */
  errorKind?: string | null;
  errorMessage?: string | null;
  refunded?: boolean;
  [key: string]: unknown;
}
