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

export interface ImageGenerateParams {
  /** Text prompt describing the image to generate */
  prompt: string;
  /** Negative prompt — what to avoid in the image */
  negativePrompt?: string;
  /** Model ID. Defaults to "seedream-5-0-260128" (SeedDream 5.0 Lite) */
  model?: string;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
  /** Aspect ratio (e.g. "16:9", "1:1", "4:3"). Alternative to width/height */
  aspectRatio?: string;
  /** Number of images to generate (1-4) */
  numImages?: number;
  /** Guidance scale / CFG scale */
  guidanceScale?: number;
  /** Number of inference steps */
  steps?: number;
  /** Random seed for reproducibility */
  seed?: number;
  /** Style preset */
  style?: string;
  /** Output format: "png" | "jpeg" | "webp" */
  outputFormat?: "png" | "jpeg" | "webp";
  /** Reference image URL for img2img / style reference */
  referenceImageUrl?: string;
  /** Strength of the reference image (0.0-1.0) */
  referenceStrength?: number;
}

export interface ImageResult {
  /** Unique generation ID */
  id: string;
  /** Generated image URLs */
  images: ImageOutput[];
  /** Model used for generation */
  model: string;
  /** Credits consumed */
  creditsUsed: number;
  /** Generation metadata */
  metadata: ImageMetadata;
}

export interface ImageOutput {
  /** URL of the generated image */
  url: string;
  /** Image width */
  width: number;
  /** Image height */
  height: number;
  /** Content type (e.g. "image/png") */
  contentType: string;
  /** Seed used for this image */
  seed?: number;
}

export interface ImageMetadata {
  /** Generation time in milliseconds */
  generationTimeMs: number;
  /** Model version */
  modelVersion?: string;
  /** Provider used */
  provider?: string;
}

// ─── Video Generation ────────────────────────────────────────────────────────

export interface VideoGenerateParams {
  /** Text prompt describing the video to generate */
  prompt: string;
  /** Model ID for video generation */
  model?: string;
  /** Duration in seconds */
  duration?: number;
  /** Aspect ratio (e.g. "16:9", "9:16", "1:1") */
  aspectRatio?: string;
  /** Frames per second */
  fps?: number;
  /** Resolution (e.g. "720p", "1080p") */
  resolution?: string;
  /** Reference/input image URL (for image-to-video) */
  imageUrl?: string;
  /** Negative prompt */
  negativePrompt?: string;
  /** Random seed */
  seed?: number;
  /** Guidance scale */
  guidanceScale?: number;
}

export interface VideoJob {
  /** Job ID for polling status */
  jobId: string;
  /** Current status of the job */
  status: VideoJobStatus;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Created timestamp */
  createdAt: string;
}

export type VideoJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface VideoResult {
  /** Job ID */
  jobId: string;
  /** Status (will be "completed") */
  status: "completed";
  /** Video output URL */
  videoUrl: string;
  /** Video duration in seconds */
  duration: number;
  /** Credits consumed */
  creditsUsed: number;
  /** Thumbnail URL */
  thumbnailUrl?: string;
  /** Generation metadata */
  metadata: VideoMetadata;
}

export interface VideoMetadata {
  /** Total generation time in milliseconds */
  generationTimeMs: number;
  /** Model used */
  model: string;
  /** Resolution */
  resolution?: string;
  /** FPS */
  fps?: number;
}

export interface VideoWaitOptions {
  /** Polling interval in milliseconds. Defaults to 5000 (5s) */
  pollInterval?: number;
  /** Maximum time to wait in milliseconds. Defaults to 600000 (10 min) */
  maxWait?: number;
  /** Callback for status updates */
  onProgress?: (job: VideoJob) => void;
}

// ─── Music Generation ────────────────────────────────────────────────────────

export interface MusicGenerateParams {
  /** Text prompt describing the music to generate */
  prompt: string;
  /** Model ID for music generation */
  model?: string;
  /** Duration in seconds */
  duration?: number;
  /** Tempo in BPM */
  tempo?: number;
  /** Musical key (e.g. "C major", "A minor") */
  key?: string;
  /** Genre hint */
  genre?: string;
  /** Output format */
  outputFormat?: "mp3" | "wav" | "flac";
  /** Whether to generate instrumental only */
  instrumental?: boolean;
}

export interface MusicResult {
  /** Unique generation ID */
  id: string;
  /** Audio file URL */
  audioUrl: string;
  /** Duration in seconds */
  duration: number;
  /** Credits consumed */
  creditsUsed: number;
  /** Model used */
  model: string;
  /** Generation metadata */
  metadata: MusicMetadata;
}

export interface MusicMetadata {
  /** Generation time in milliseconds */
  generationTimeMs: number;
  /** Sample rate */
  sampleRate?: number;
  /** Audio format */
  format?: string;
}

// ─── Chat / LLM ─────────────────────────────────────────────────────────────

export interface ChatParams {
  /** Array of messages in the conversation */
  messages: ChatMessage[];
  /** Model ID (OpenAI-compatible model names) */
  model?: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature (0.0-2.0) */
  temperature?: number;
  /** Top-p sampling */
  topP?: number;
  /** Stop sequences */
  stop?: string | string[];
  /** Whether to stream the response */
  stream?: boolean;
  /** Frequency penalty (-2.0 to 2.0) */
  frequencyPenalty?: number;
  /** Presence penalty (-2.0 to 2.0) */
  presencePenalty?: number;
  /** System message (convenience, prepended to messages) */
  system?: string;
}

export interface ChatMessage {
  /** Role of the message sender */
  role: "system" | "user" | "assistant";
  /** Message content */
  content: string;
}

export interface ChatCompletion {
  /** Unique completion ID */
  id: string;
  /** Object type */
  object: "chat.completion";
  /** Creation timestamp */
  created: number;
  /** Model used */
  model: string;
  /** Completion choices */
  choices: ChatChoice[];
  /** Token usage */
  usage: ChatUsage;
}

export interface ChatChoice {
  /** Choice index */
  index: number;
  /** Generated message */
  message: ChatMessage;
  /** Finish reason */
  finishReason: "stop" | "length" | "content_filter" | null;
}

export interface ChatUsage {
  /** Number of prompt tokens */
  promptTokens: number;
  /** Number of completion tokens */
  completionTokens: number;
  /** Total tokens */
  totalTokens: number;
}

export interface ChatChunk {
  /** Chunk ID */
  id: string;
  /** Object type */
  object: "chat.completion.chunk";
  /** Creation timestamp */
  created: number;
  /** Model used */
  model: string;
  /** Delta choices */
  choices: ChatChunkChoice[];
}

export interface ChatChunkChoice {
  /** Choice index */
  index: number;
  /** Delta content */
  delta: ChatDelta;
  /** Finish reason (null until final chunk) */
  finishReason: "stop" | "length" | "content_filter" | null;
}

export interface ChatDelta {
  /** Role (only in first chunk) */
  role?: "assistant";
  /** Content fragment */
  content?: string;
}

// ─── Gabriel (Intent Orchestration) ─────────────────────────────────────────

export interface GabrielParams {
  /** User message / intent */
  message: string;
  /** Conversation context */
  context?: GabrielContext;
  /** Language code (e.g. "en", "pl") */
  language?: string;
}

export interface GabrielContext {
  /** Previous messages for context */
  history?: ChatMessage[];
  /** Current user state/preferences */
  userState?: Record<string, unknown>;
}

export interface GabrielResponse {
  /** Interpreted intent */
  intent: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Suggested action */
  action: GabrielAction;
  /** Natural language response */
  response: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface GabrielAction {
  /** Action type (e.g. "generate_image", "navigate", "explain") */
  type: string;
  /** Action parameters */
  params: Record<string, unknown>;
}

// ─── Translation ─────────────────────────────────────────────────────────────

export interface TranslateParams {
  /** Text to translate */
  text: string;
  /** Target language code (e.g. "en", "pl", "de", "fr") */
  targetLanguage: string;
  /** Source language code (auto-detected if omitted) */
  sourceLanguage?: string;
  /** Formality level */
  formality?: "formal" | "informal" | "auto";
  /** Context to improve translation quality */
  context?: string;
}

export interface TranslateResult {
  /** Translated text */
  translatedText: string;
  /** Detected source language */
  detectedSourceLanguage: string;
  /** Target language */
  targetLanguage: string;
  /** Confidence score (0-1) */
  confidence: number;
}

// ─── Usage Analytics ─────────────────────────────────────────────────────────

export interface UsageParams {
  /** Start date (ISO 8601) */
  startDate?: string;
  /** End date (ISO 8601) */
  endDate?: string;
  /** Group by period */
  groupBy?: "hour" | "day" | "week" | "month";
}

export interface UsageResult {
  /** Total credits used in period */
  totalCredits: number;
  /** Total number of requests */
  totalRequests: number;
  /** Breakdown by service */
  byService: UsageByService[];
  /** Time series data */
  timeSeries: UsageTimeSeries[];
  /** Period start */
  periodStart: string;
  /** Period end */
  periodEnd: string;
}

export interface UsageByService {
  /** Service name */
  service: string;
  /** Credits used */
  credits: number;
  /** Request count */
  requests: number;
}

export interface UsageTimeSeries {
  /** Timestamp */
  timestamp: string;
  /** Credits used */
  credits: number;
  /** Request count */
  requests: number;
}

// ─── Storage / Buckets ───────────────────────────────────────────────────────

export interface Bucket {
  /** Bucket ID */
  id: string;
  /** Bucket name */
  name: string;
  /** Whether the bucket is public */
  public: boolean;
  /** Allowed MIME types */
  allowedMimeTypes?: string[];
  /** Max file size in bytes */
  fileSizeLimit?: number;
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
}

export interface CreateBucketParams {
  /** Bucket name */
  name: string;
  /** Whether the bucket should be public */
  public?: boolean;
  /** Allowed MIME types */
  allowedMimeTypes?: string[];
  /** Max file size in bytes */
  fileSizeLimit?: number;
}

export interface S3BucketProvisionParams {
  /** Desired bucket name */
  name: string;
  /** AWS region */
  region?: string;
  /** Storage class */
  storageClass?: "STANDARD" | "INTELLIGENT_TIERING" | "GLACIER";
  /** Enable versioning */
  versioning?: boolean;
  /** CORS configuration */
  cors?: S3CorsRule[];
}

export interface S3CorsRule {
  /** Allowed origins */
  allowedOrigins: string[];
  /** Allowed methods */
  allowedMethods: ("GET" | "PUT" | "POST" | "DELETE" | "HEAD")[];
  /** Allowed headers */
  allowedHeaders?: string[];
  /** Max age in seconds */
  maxAgeSeconds?: number;
}

export interface S3BucketResult {
  /** Provisioned bucket ID */
  bucketId: string;
  /** Bucket name */
  name: string;
  /** Region */
  region: string;
  /** Endpoint URL */
  endpoint: string;
  /** Access credentials */
  credentials: S3Credentials;
}

export interface S3Credentials {
  /** Access key ID */
  accessKeyId: string;
  /** Secret access key */
  secretAccessKey: string;
  /** Session token (if temporary) */
  sessionToken?: string;
  /** Expiration timestamp */
  expiresAt?: string;
}

export interface PresignUploadParams {
  /** Object key (file path within the bucket) */
  key: string;
  /** Content type of the file */
  contentType: string;
  /** URL expiration in seconds. Defaults to 3600 (1 hour) */
  expiresIn?: number;
  /** File size in bytes (for validation) */
  contentLength?: number;
  /** Custom metadata */
  metadata?: Record<string, string>;
}

export interface PresignedUrl {
  /** Presigned URL for upload/download */
  url: string;
  /** HTTP method to use */
  method: "PUT" | "GET";
  /** Required headers to include in the request */
  headers?: Record<string, string>;
  /** Expiration timestamp */
  expiresAt: string;
}

export interface PresignDownloadParams {
  /** Object key (file path within the bucket) */
  key: string;
  /** URL expiration in seconds. Defaults to 3600 (1 hour) */
  expiresIn?: number;
  /** Response content disposition */
  responseContentDisposition?: string;
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
