<p align="center">
  <img src="https://static.fotohub.app/brand/fotohub-logo-dark.png" alt="FOTOhub" width="280" />
</p>

<h1 align="center">@fotohub/sdk</h1>

<p align="center">
  <strong>Official TypeScript SDK for the FOTOhub AI Platform</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@fotohub/sdk"><img src="https://img.shields.io/npm/v/@fotohub/sdk.svg?style=flat-square&color=0070f3" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@fotohub/sdk"><img src="https://img.shields.io/npm/dm/@fotohub/sdk.svg?style=flat-square&color=0070f3" alt="npm downloads" /></a>
  <a href="https://github.com/fotohubapp/sdk-node"><img src="https://img.shields.io/badge/TypeScript-5.4+-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://bundlephobia.com/package/@fotohub/sdk"><img src="https://img.shields.io/bundlephobia/minzip/@fotohub/sdk?style=flat-square&color=0070f3&label=bundle%20size" alt="Bundle Size" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/@fotohub/sdk?style=flat-square&color=0070f3" alt="License: MIT" /></a>
</p>

<p align="center">
  Generate images, videos, and music. Chat with LLMs. Translate text. Manage cloud storage.<br/>
  All from a single, zero-dependency TypeScript package.
</p>

<p align="center">
  <a href="https://docs.fotohub.app">Documentation</a> &nbsp;|&nbsp;
  <a href="https://fotohub.app/settings/api">Get API Key</a> &nbsp;|&nbsp;
  <a href="https://docs.fotohub.app/models">Model Catalog</a> &nbsp;|&nbsp;
  <a href="https://fotohub.app">Platform</a>
</p>

---

## Highlights

- **Zero dependencies** --- uses native `fetch` (Node.js 18+, Deno, Bun, browsers)
- **Full TypeScript** --- every request and response is strictly typed
- **ESM + CommonJS** --- dual-package exports, works everywhere
- **Streaming** --- Server-Sent Events for real-time chat completions
- **Automatic retries** --- exponential backoff on transient failures
- **Typed errors** --- 11 distinct error classes for precise handling
- **Tiny footprint** --- tree-shakeable, no bloat

---

## Installation

```bash
npm install @fotohub/sdk
```

```bash
pnpm add @fotohub/sdk
```

```bash
yarn add @fotohub/sdk
```

```bash
bun add @fotohub/sdk
```

Or install directly from GitHub:

```bash
npm install fotohubapp/sdk-node
```

> Requires Node.js 18+ (or any runtime with a global `fetch` implementation).

---

## Quick Start

```typescript
import { FotoHub } from "@fotohub/sdk";

const client = new FotoHub({
  apiKey: process.env.FOTOHUB_API_KEY!,
});

// Generate an image
const image = await client.generateImage({
  prompt: "A cyberpunk cityscape at sunset, neon lights reflecting on wet streets",
  aspectRatio: "16:9",
});

console.log(image.images[0].url);
```

---

## Authentication

All authenticated endpoints require an API key. Get yours at [fotohub.app/settings/api](https://fotohub.app/settings/api).

```typescript
const client = new FotoHub({
  apiKey: "fh_live_...", // Your FOTOhub API key
});
```

The API key is sent as a Bearer token in the `Authorization` header. Some endpoints (translation, Gabriel) work without authentication.

> **Security:** Never expose your API key in client-side code. Use environment variables or a server-side proxy.

---

## Usage Examples

### Image Generation

Generate images from text prompts with 25+ AI models.

```typescript
const result = await client.generateImage({
  prompt: "A serene Japanese garden in autumn, watercolor style",
  model: "seedream-5-0-260128",
  aspectRatio: "16:9",
  numImages: 2,
  guidanceScale: 7.5,
  steps: 30,
  outputFormat: "png",
});

for (const img of result.images) {
  console.log(img.url);       // Generated image URL
  console.log(img.width);     // Image dimensions
}

console.log(result.creditsUsed);              // Credits consumed
console.log(result.metadata.generationTimeMs); // Generation time (ms)
```

#### Image-to-Image (Style Reference)

```typescript
const result = await client.generateImage({
  prompt: "Same scene but in winter with snow",
  referenceImageUrl: "https://example.com/original.jpg",
  referenceStrength: 0.7,
});
```

---

### Video Generation

Video generation is asynchronous. Start a job, then poll for completion.

```typescript
// Start the generation job
const job = await client.generateVideo({
  prompt: "A drone flying over a misty forest at sunrise",
  duration: 5,
  aspectRatio: "16:9",
  resolution: "1080p",
});

console.log(job.jobId);  // "vid_abc123..."
console.log(job.status); // "queued"

// Wait for completion with progress updates
const video = await client.waitForVideo(job.jobId, {
  pollInterval: 5_000,   // Check every 5 seconds
  maxWait: 600_000,      // Timeout after 10 minutes
  onProgress: (status) => {
    console.log(`Status: ${status.status} | Progress: ${status.progress}%`);
  },
});

console.log(video.videoUrl);    // Final video URL
console.log(video.duration);    // Duration in seconds
console.log(video.creditsUsed); // Credits consumed
```

#### Manual Status Polling

```typescript
const status = await client.getVideoJob(job.jobId);

if (status.status === "completed") {
  // Fetch the final result
}
```

---

### Music Generation

Generate original music from text descriptions.

```typescript
const music = await client.generateMusic({
  prompt: "Upbeat electronic dance track, euphoric synths, festival energy",
  duration: 30,
  genre: "electronic",
  tempo: 128,
  key: "A minor",
  instrumental: true,
  outputFormat: "mp3",
});

console.log(music.audioUrl);   // Audio file URL
console.log(music.duration);   // Duration in seconds
console.log(music.creditsUsed);
```

---

### Chat / LLM Completions

OpenAI-compatible chat completions with support for all major models.

#### Non-Streaming

```typescript
const response = await client.chat({
  messages: [
    { role: "user", content: "Explain quantum entanglement in simple terms" },
  ],
  model: "claude-sonnet-4-20250514",
  maxTokens: 1000,
  temperature: 0.7,
});

console.log(response.choices[0].message.content);
console.log(response.usage.totalTokens);
```

#### Streaming

```typescript
const stream = await client.streamChat({
  messages: [{ role: "user", content: "Write a short story about a robot" }],
  system: "You are a creative fiction writer.",
});

// Option 1: Iterate over raw chunks (full control)
for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta.content;
  if (content) process.stdout.write(content);
}

// Option 2: Iterate over text fragments only
const stream2 = await client.streamChat({
  messages: [{ role: "user", content: "Tell me a joke" }],
});
for await (const text of stream2.textStream()) {
  process.stdout.write(text);
}

// Option 3: Collect all text at once
const stream3 = await client.streamChat({
  messages: [{ role: "user", content: "Summarize quantum physics" }],
});
const fullText = await stream3.toText();
console.log(fullText);
```

---

### Gabriel --- AI Intent Orchestration

Interpret natural language intent and get structured action suggestions. **No authentication required.**

```typescript
const response = await client.gabriel({
  message: "I want to create a professional headshot for LinkedIn",
  language: "en",
});

console.log(response.intent);     // "generate_image"
console.log(response.confidence); // 0.95
console.log(response.action);     // { type: "generate_image", params: { ... } }
console.log(response.response);   // Natural language explanation
```

---

### Translation

Translate text between languages with formality control. **No authentication required.**

```typescript
const result = await client.translate({
  text: "The future of AI is collaborative and open",
  targetLanguage: "pl",
  formality: "formal",
  context: "Technology blog post",
});

console.log(result.translatedText);         // Polish translation
console.log(result.detectedSourceLanguage); // "en"
console.log(result.confidence);             // 0.97
```

---

### Usage Analytics

Track credit consumption and API usage by service and time period.

```typescript
const usage = await client.getUsage({
  startDate: "2026-07-01",
  endDate: "2026-07-18",
  groupBy: "day",
});

console.log(usage.totalCredits);  // Total credits consumed
console.log(usage.totalRequests); // Total API calls
console.log(usage.byService);    // Breakdown by service
console.log(usage.timeSeries);   // Daily time series
```

---

### Storage

Manage buckets, provision enterprise S3 storage, and generate presigned URLs for direct uploads/downloads.

#### Bucket Management

```typescript
// List existing buckets
const buckets = await client.listBuckets();

// Create a new bucket
const bucket = await client.createBucket({
  name: "project-assets",
  public: false,
  allowedMimeTypes: ["image/*", "video/*"],
  fileSizeLimit: 100 * 1024 * 1024, // 100 MB
});
```

#### Presigned Uploads

```typescript
const presigned = await client.presignUpload("bucket-id", {
  key: "uploads/video.mp4",
  contentType: "video/mp4",
  expiresIn: 3600, // 1 hour
});

// Upload directly to storage (no data passes through your server)
await fetch(presigned.url, {
  method: "PUT",
  headers: presigned.headers,
  body: fileBuffer,
});
```

#### Presigned Downloads

```typescript
const download = await client.presignDownload("bucket-id", {
  key: "uploads/video.mp4",
  expiresIn: 3600,
});

console.log(download.url); // Temporary authenticated download link
```

#### Enterprise S3 Provisioning

```typescript
const s3 = await client.provisionS3Bucket({
  name: "enterprise-media",
  region: "eu-central-1",
  storageClass: "INTELLIGENT_TIERING",
  versioning: true,
});

console.log(s3.endpoint);
console.log(s3.credentials.accessKeyId);
console.log(s3.credentials.secretAccessKey);
```

---

## Configuration

```typescript
import { FotoHub } from "@fotohub/sdk";

const client = new FotoHub({
  // Required
  apiKey: "fh_live_...",

  // Base URL (default: "https://apis.fotohub.app")
  baseUrl: "https://apis.fotohub.app",

  // Request timeout in ms (default: 60000)
  timeout: 30_000,

  // Max retry attempts for transient failures (default: 3)
  maxRetries: 5,

  // Custom fetch implementation (for testing, polyfills, or proxies)
  fetch: customFetchFn,
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | --- | **Required.** Your FOTOhub API key |
| `baseUrl` | `string` | `"https://apis.fotohub.app"` | API base URL |
| `timeout` | `number` | `60000` | Request timeout in milliseconds |
| `maxRetries` | `number` | `3` | Max retry attempts for transient failures |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Custom fetch implementation |

---

## Error Handling

The SDK provides 11 typed error classes for precise error handling:

```typescript
import {
  FotoHub,
  FotoHubError,
  AuthenticationError,
  InsufficientCreditsError,
  RateLimitError,
  ValidationError,
  PermissionError,
  NotFoundError,
  TimeoutError,
  NetworkError,
  ServerError,
  JobFailedError,
  JobTimeoutError,
} from "@fotohub/sdk";

try {
  const result = await client.generateImage({ prompt: "..." });
} catch (error) {
  if (error instanceof AuthenticationError) {
    // 401 --- Invalid or missing API key
    console.error("Authentication failed:", error.message);

  } else if (error instanceof InsufficientCreditsError) {
    // 402 --- Not enough credits for this operation
    console.error(
      `Need ${error.creditsRequired} credits, have ${error.creditsAvailable}`
    );

  } else if (error instanceof RateLimitError) {
    // 429 --- Too many requests
    console.error(`Rate limited. Retry after ${error.retryAfter}s`);

  } else if (error instanceof ValidationError) {
    // 422 --- Invalid request parameters
    console.error("Field errors:", error.fieldErrors);

  } else if (error instanceof PermissionError) {
    // 403 --- Insufficient permissions
    console.error("Forbidden:", error.message);

  } else if (error instanceof NotFoundError) {
    // 404 --- Resource not found
    console.error("Not found:", error.message);

  } else if (error instanceof TimeoutError) {
    // Request timed out (client-side)
    console.error("Timed out:", error.message);

  } else if (error instanceof NetworkError) {
    // Network connectivity issue
    console.error("Network error:", error.message, error.cause);

  } else if (error instanceof ServerError) {
    // 5xx --- Server-side error (auto-retried)
    console.error(`Server error (${error.statusCode}):`, error.message);

  } else if (error instanceof JobFailedError) {
    // Async generation job failed
    console.error(`Job ${error.jobId} failed:`, error.message);

  } else if (error instanceof JobTimeoutError) {
    // waitForVideo() exceeded maxWait
    console.error(`Job ${error.jobId} timed out`);

  } else if (error instanceof FotoHubError) {
    // Catch-all for any other API error
    console.error(`[${error.code}] ${error.message}`);
  }
}
```

### Error Class Reference

| Class | HTTP Status | Properties | Description |
|-------|-------------|------------|-------------|
| `FotoHubError` | any | `code`, `statusCode`, `details` | Base error class |
| `AuthenticationError` | 401 | --- | Invalid or missing API key |
| `InsufficientCreditsError` | 402 | `creditsRequired`, `creditsAvailable` | Not enough credits |
| `PermissionError` | 403 | --- | Insufficient permissions |
| `NotFoundError` | 404 | --- | Resource not found |
| `ValidationError` | 422 | `fieldErrors` | Invalid request parameters |
| `RateLimitError` | 429 | `retryAfter` | Rate limit exceeded |
| `ServerError` | 5xx | --- | Server-side error |
| `TimeoutError` | --- | --- | Request timed out |
| `NetworkError` | --- | `cause` | Network connectivity issue |
| `JobFailedError` | --- | `jobId` | Async job failed |
| `JobTimeoutError` | --- | `jobId` | Job polling exceeded `maxWait` |

---

## Retry Behavior

The SDK automatically retries failed requests with exponential backoff:

| Condition | Retried? |
|-----------|----------|
| 429 Rate Limited | Yes |
| 408 Timeout | Yes |
| 5xx Server Error | Yes |
| Network errors | Yes |
| 401, 402, 403, 404, 422 | No |

**Backoff schedule:** 1s, 2s, 4s (capped at 8s)

```typescript
// Increase retries for critical workloads
const client = new FotoHub({
  apiKey: "fh_live_...",
  maxRetries: 5,
});

// Disable retries entirely
const client = new FotoHub({
  apiKey: "fh_live_...",
  maxRetries: 0,
});
```

---

## Runtime Compatibility

| Runtime | Minimum Version | Notes |
|---------|----------------|-------|
| Node.js | 18.0+ | Native `fetch` required |
| Deno | 1.0+ | Works out of the box |
| Bun | 1.0+ | Works out of the box |
| Browsers | Modern (ES2020+) | Streaming requires `ReadableStream` |
| Cloudflare Workers | --- | Full support |
| Vercel Edge | --- | Full support |

---

## TypeScript

The SDK is written in TypeScript and exports all types for full IntelliSense support:

```typescript
import type {
  FotoHubConfig,
  ImageGenerateParams,
  ImageResult,
  ImageOutput,
  VideoGenerateParams,
  VideoJob,
  VideoResult,
  VideoWaitOptions,
  MusicGenerateParams,
  MusicResult,
  ChatParams,
  ChatMessage,
  ChatCompletion,
  ChatChunk,
  ChatStream,
  GabrielParams,
  GabrielResponse,
  TranslateParams,
  TranslateResult,
  UsageParams,
  UsageResult,
  Bucket,
  PresignedUrl,
} from "@fotohub/sdk";
```

---

## API Methods Reference

| Method | Description | Auth Required |
|--------|-------------|:---:|
| `generateImage(params)` | Generate images from a text prompt | Yes |
| `generateVideo(params)` | Start an async video generation job | Yes |
| `waitForVideo(jobId, options?)` | Poll until video job completes | Yes |
| `getVideoJob(jobId)` | Get video job status | Yes |
| `generateMusic(params)` | Generate music from a text description | Yes |
| `chat(params)` | Create a chat completion | Yes |
| `streamChat(params)` | Create a streaming chat completion | Yes |
| `gabriel(params)` | AI intent orchestration | No |
| `translate(params)` | Translate text between languages | No |
| `getUsage(params?)` | Get usage analytics | Yes |
| `listBuckets()` | List storage buckets | Yes |
| `createBucket(params)` | Create a new bucket | Yes |
| `provisionS3Bucket(params)` | Provision enterprise S3 bucket | Yes |
| `presignUpload(bucketId, params)` | Generate presigned upload URL | Yes |
| `presignDownload(bucketId, params)` | Generate presigned download URL | Yes |

---

## Contributing

We welcome contributions. Please open an issue first to discuss what you would like to change.

```bash
# Clone the repository
git clone https://github.com/fotohubapp/sdk-node.git
cd sdk-node

# Install dependencies
npm install

# Build
npm run build

# Type check
npm run typecheck
```

---

## Links

- [Documentation](https://docs.fotohub.app)
- [API Reference](https://docs.fotohub.app/api)
- [Model Catalog](https://docs.fotohub.app/models)
- [Get API Key](https://fotohub.app/settings/api)
- [Platform](https://fotohub.app)
- [GitHub](https://github.com/fotohubapp/sdk-node)
- [npm](https://www.npmjs.com/package/@fotohub/sdk)

---

## License

[MIT](./LICENSE) --- Copyright (c) 2026 FOTOhub
