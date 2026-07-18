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
  /** Number of images to generate (1-4) */
  num_images?: number;
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
  /** Model ID. Supported: veo-2, veo-3, wan, kling, hailuo, seedance, sora-2 */
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
}

export interface PollOptions {
  /** Polling interval in milliseconds. Defaults to 5000 (5s) */
  pollInterval?: number;
  /** Maximum time to wait in milliseconds. Defaults to 600000 (10 min) */
  maxWait?: number;
  /** Callback for status updates */
  onProgress?: (result: VideoResult) => void;
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

export interface ChatBedrockOptions {
  /** Array of messages in the conversation */
  messages: ChatMessage[];
  /** Model ID (e.g. claude-sonnet-4.6, claude-haiku-4.5, nova-pro, nova-lite, nova-micro) */
  model?: string;
  /** Temperature (0.0-1.0) */
  temperature?: number;
  /** Maximum tokens to generate */
  max_tokens?: number;
  /** System message */
  system?: string;
}

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
  /** Plan identifier */
  id: string;
  /** Plan display name */
  name: string;
  /** Monthly price */
  price_monthly: number;
  /** Included credits per month */
  credits_included: number;
  /** Plan features */
  features: string[];
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
  /** Hard limit in PLN */
  hard_limit_pln: number;
  /** Project ID (if project-scoped) */
  project_id?: string;
}

export interface TopupPackage {
  /** Package slug identifier */
  slug: string;
  /** Display name */
  name: string;
  /** Price in PLN */
  price_pln: number;
  /** Credits included */
  credits: number;
  /** Bonus credits (if any) */
  bonus?: number;
}

export interface TopupResult {
  /** Payment session ID or URL */
  session_id: string;
  /** Checkout URL to redirect user */
  checkout_url: string;
  /** Package purchased */
  package_slug: string;
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
  /** Total cost in PLN */
  total_pln: number;
  /** Currency */
  currency: string;
  /** Per-operation breakdown */
  breakdown: CostBreakdownItem[];
}

export interface CostBreakdownItem {
  /** Operation type */
  type: string;
  /** Model used */
  model?: string;
  /** Credits for this item */
  credits: number;
  /** PLN cost for this item */
  pln: number;
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

// ─── Models ──────────────────────────────────────────────────────────────────

export interface Model {
  /** Model ID */
  id: string;
  /** Display name */
  name: string;
  /** Model category (image, video, music, chat, speech, stability) */
  category: string;
  /** Provider name */
  provider: string;
  /** Whether the model is currently available */
  available: boolean;
  /** Credit cost per generation */
  credit_cost: number;
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
