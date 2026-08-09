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
   * refunded automatically, so `credits_used` always matches `images.length`.
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
  /** Credits consumed */
  credits_used: number;
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
  credits_used: number;
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
  /** Credits consumed */
  credits_used: number;
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
  /** Credits consumed */
  credits_used: number;
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
   * Whether the credits for a failed generation were given back. `true` on the
   * poll that performed the reversal, `false` on every later poll of the same
   * job — meaning "already refunded", not "not refunded".
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
   * reference / editing / extension mode and raises the rate to 17.6 credits/s
   * at 720p, because the source frames bill as input.
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
  /** Charge detail — `breakdown` carries credits_per_second, duration, resolution */
  billing?: Record<string, unknown>;
  created_at?: string;
  completed_at?: string;
  error_message?: string;
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
  /** Credits consumed */
  credits_used: number;
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
  /** Credits consumed */
  credits_used: number;
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
  /** Credits consumed */
  credits_used: number;
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
  /** Credits consumed */
  credits_used: number;
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
  /** Credits consumed */
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

export interface AnalyzeImageOptions {
  /** URL of the image to analyze */
  image_url: string;
  /** Analysis features to extract */
  features?: ("labels" | "faces" | "nsfw" | "ocr" | "colors" | "objects")[];
}

export interface AnalysisResult {
  /** Credits consumed */
  credits_used: number;
  /** Analysis output (varies by feature) */
  analysis: Record<string, unknown>;
}

// ─── Stability AI Tools ──────────────────────────────────────────────────────

export interface StabilityTool {
  /** Tool identifier */
  id: string;
  /** Associated model ID */
  model_id: string;
  /** Credit cost per use */
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
  /** Credits consumed */
  credits_used: number;
}

// ─── Billing ─────────────────────────────────────────────────────────────────

export interface BillingInfo {
  /** Credits used for this operation */
  credits_used: number;
  /** Remaining credits after operation */
  credits_remaining?: number;
}

export interface BillingBalance {
  /** Current subscription tier */
  tier: string;
  /** Credit balance details */
  credits: Record<string, unknown>;
  /** Wallet/payment details */
  wallet: Record<string, unknown>;
  /** Overage configuration */
  overage: Record<string, unknown>;
}

export interface PricingCatalog {
  /** Currency code */
  currency: string;
  /** Pricing per model/operation */
  pricing: Record<string, unknown>;
  /** Credit cost conversions */
  credit_costs: Record<string, unknown>;
  /** Available API plans */
  api_plans: Record<string, unknown>;
}

export interface ApiPlan {
  /** Plan identifier (e.g. "api-developer") */
  slug: string;
  /** Plan display name */
  name: string;
  /**
   * Monthly subscription price in PLN. API tier subscriptions are still
   * billed in PLN; only the PAYG wallet and per-request overage moved to USD
   * on 2026-08-05.
   */
  price_pln: number;
  /** Included credits per month */
  credits_monthly: number;
  /** Requests-per-minute rate limit */
  rate_limit_rpm: number;
  /** Plan features */
  features: string[];
  /** @deprecated Not returned by the API. Use `slug`. */
  id?: string;
  /** @deprecated Not returned by the API. Use `price_pln`. */
  price_monthly?: number;
  /** @deprecated Not returned by the API. Use `credits_monthly`. */
  credits_included?: number;
}

export interface CreditsInfo {
  /** Total available credits */
  total: number;
  /** Credits used this period */
  used: number;
  /** Credits remaining */
  remaining: number;
  /** Period reset date */
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
  /** Package slug identifier (e.g. "topup-100") */
  slug: string;
  /** Display name (e.g. "$25") */
  name: string;
  /** Charge amount in USD */
  amount_usd: number;
  /**
   * @deprecated Removed from the API on 2026-08-05. Top-up packages are
   * USD-only; use `amount_usd`.
   */
  amount_pln?: number;
  /** Bonus credits granted on purchase */
  bonus_credits: number;
  /** Bonus percentage */
  bonus_pct: number;
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

export interface TransactionPage {
  /** Transaction records */
  transactions: Transaction[];
  /** Total count */
  total: number;
  /** Current page */
  page: number;
  /** Items per page */
  page_size: number;
}

export interface Transaction {
  /** Transaction ID */
  id: string;
  /** Type (credit, debit, topup, subscription) */
  type: string;
  /** Amount (positive or negative) */
  amount: number;
  /** Description */
  description: string;
  /** Timestamp */
  created_at: string;
  /** Related model/operation */
  metadata?: Record<string, unknown>;
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
  /** Total credits required */
  total_credits: number;
  /** Total cost in USD */
  total_usd: number;
  /** Currency (always "USD") */
  currency: string;
  /** Per-operation breakdown */
  breakdown: CostBreakdownItem[];
}

export interface CostBreakdownItem {
  /** Operation type */
  type: string;
  /** Model used */
  model?: string;
  /** Duration in seconds (video/music operations) */
  duration?: number;
  /** Credits for this item */
  credits: number;
  /** USD cost for this item */
  price_usd: number;
}

export interface Invoice {
  /** Invoice ID */
  id: string;
  /** Invoice number */
  number: string;
  /** Amount */
  amount: number;
  /** Currency */
  currency: string;
  /** Status */
  status: "paid" | "pending" | "overdue";
  /** Issue date */
  issued_at: string;
  /** PDF download URL */
  pdf_url?: string;
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
  /** Generation ID */
  id: string;
  /** Download URL for the 3D model file */
  url: string;
  /** Output format */
  format: string;
  /** Model used */
  model: string;
  /** Current status */
  status: "queued" | "processing" | "completed" | "failed";
  /** Thumbnail preview URL */
  thumbnail_url?: string;
  /** Polygon count */
  poly_count?: number;
  /** File size in bytes */
  file_size?: number;
  /** Billing information */
  billing: BillingInfo;
}

export interface ThreeDModelInfo {
  /** Model ID */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Credit cost per generation */
  credits: number;
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
   * one-pieces. Costs 3 credits instead of 4 and forces numImages to 1. Order
   * is irrelevant: the top is always applied first.
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
  credits_used: number;
  billing: { method: string; usd_charged: number; pln_charged: number };
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

export interface TierCatalogEntry {
  /** Tier slug identifier */
  slug: string;
  /** Display name */
  name: string;
  /** Tier type */
  type: "payg" | "subscription";
  /**
   * Monthly subscription price in PLN (0 for PAYG). API tier subscriptions
   * are still billed in PLN; only the PAYG wallet and per-request overage
   * moved to USD on 2026-08-05.
   */
  price_monthly: number;
  /** Monthly credit allowance (-1 for unlimited) */
  credits_monthly: number;
  /** Requests per minute limit */
  rpm: number;
  /** Daily request quota */
  daily_quota: number;
  /** Features included */
  features: string[];
  /** Qualification requirements (for PAYG auto-resolution) */
  requirements?: string;
}

export interface TierCatalog {
  /** Available tiers */
  tiers: TierCatalogEntry[];
}

export interface TierInfo {
  /** Current tier slug */
  tier: string;
  /** Tier display name */
  name: string;
  /** Tier type */
  type: "payg" | "subscription";
  /** Current rate limits */
  limits: TierLimits;
  /** Current period usage */
  usage: TierUsage;
}

export interface TierLimits {
  /** Requests per minute */
  rpm: number;
  /** Daily request quota */
  daily_quota: number;
  /** Monthly credits (-1 for unlimited) */
  credits_monthly: number;
  /** 4-hour burst allowance */
  burst_4h: number;
}

export interface TierUsage {
  /** Requests made in current minute */
  rpm_used: number;
  /** Requests made today */
  daily_used: number;
  /** Credits used this period */
  credits_used: number;
}

export interface TierComparison {
  /** Current tier slug */
  current: string;
  /** All tiers with comparison data */
  tiers: TierCatalogEntry[];
}

export interface WalletInfo {
  /** Current balance in USD */
  balance: number;
  /** Currency code */
  currency: string;
  /** Lifetime spend */
  lifetime_spend: number;
  /** Auto-topup enabled */
  auto_topup: boolean;
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
  /** Current credit balance */
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
  /** User's credit balance */
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
}
