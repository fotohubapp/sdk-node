<p align="center">
  <img src="https://static.fotohub.app/brand/fotohub-logo-dark.png" alt="FOTOhub" width="280" />
</p>

<h1 align="center">fotohub</h1>

<p align="center">
  <strong>Official TypeScript SDK for the FOTOhub AI Platform</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/fotohub"><img src="https://img.shields.io/npm/v/fotohub.svg?style=flat-square&color=0070f3" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/fotohub"><img src="https://img.shields.io/npm/dm/fotohub.svg?style=flat-square&color=0070f3" alt="npm downloads" /></a>
  <a href="https://github.com/fotohubapp/sdk-node"><img src="https://img.shields.io/badge/TypeScript-5.4+-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://bundlephobia.com/package/fotohub"><img src="https://img.shields.io/bundlephobia/minzip/fotohub?style=flat-square&color=0070f3&label=bundle%20size" alt="Bundle Size" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/fotohub?style=flat-square&color=0070f3" alt="License: MIT" /></a>
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
- **Virtual try-on** --- one garment, or a chained top + bottom outfit in a single call
- **IDA Q 1.0** --- FOTOhub's own image model, submitted and polled for you
- **Stability tools** --- upscale, erase, inpaint, outpaint, recolor, style transfer
- **Billing in USD** --- balance, top-ups, transactions, invoices, overage caps
- **Automatic retries** --- exponential backoff on transient failures
- **Typed errors** --- 12 distinct error classes for precise handling
- **Tiny footprint** --- tree-shakeable, no bloat

---

## Installation

```bash
npm install fotohub
```

```bash
pnpm add fotohub
```

```bash
yarn add fotohub
```

```bash
bun add fotohub
```

> Requires Node.js 18+ (or any runtime with a global `fetch` implementation).

---

## Quick Start

```typescript
import { FotoHub } from "fotohub";

const client = new FotoHub({
  apiKey: process.env.FOTOHUB_API_KEY!,
});

// Generate an image
const image = await client.generateImage({
  prompt: "A cyberpunk cityscape at sunset, neon lights reflecting on wet streets",
  aspect_ratio: "16:9",
});

console.log(image.images[0]);
```

> **Options are `snake_case`.** They are forwarded to the API as-is, so it is
> `aspect_ratio`, `num_images`, `image_url` — not `aspectRatio`. `result.images`
> is a `string[]` of URLs, not a list of objects.

---

## Authentication

All authenticated endpoints require an API key. Get yours at [fotohub.app/settings/api](https://fotohub.app/settings/api).

```typescript
const client = new FotoHub({
  apiKey: "fh_live_...", // Your FOTOhub API key
});
```

The API key is sent as a Bearer token in the `Authorization` header. Four methods
skip it — `translate()`, `gabrielSuggest()`, `gabrielRecommend()` and
`getTierCatalog()`. Everything else, `gabrielClassify()` included, needs a key.

> **Security:** Never expose your API key in client-side code. Use environment variables or a server-side proxy.

---

## Usage Examples

### Image Generation

Generate images from text prompts with 25+ AI models.

```typescript
const result = await client.generateImage({
  prompt: "A serene Japanese garden in autumn, watercolor style",
  model: "seedream-5-0-260128",
  aspect_ratio: "16:9",
  num_images: 2,
  output_format: "png",
});

for (const url of result.images) {
  console.log(url);
}

console.log(result.credits_used);
console.log(result.billing.usd_charged);
console.log(result.metadata?.generation_time_ms);
```

`guidance_scale` and `steps` are accepted by the type but forwarded to an
endpoint that ignores them — treat them as no-ops rather than knobs.

#### Image-to-Image (Style Reference)

```typescript
const result = await client.generateImage({
  prompt: "Same scene but in winter with snow",
  reference_image_url: "https://example.com/original.jpg",
  reference_strength: 0.7,
});
```

#### IDA Q 1.0

FOTOhub's own model runs on a single-GPU queue, so it has a dedicated method that
submits the job and polls until it finishes — ~30 s at `1K`, up to ~3.5 min at `2K`:

```typescript
const result = await client.generateIdaQ({
  prompt: "Portret kobiety w świetle porannym",   // any language
  aspect_ratio: "4:3",
  image_size: "1.5K",
});

console.log(result.images[0]);
```

---

### Video Generation

Video generation is synchronous — the call resolves once the video is ready and
the result already contains `video_url`.

```typescript
const video = await client.generateVideo({
  prompt: "A drone flying over a misty forest at sunrise",
  duration: 5,
  aspect_ratio: "16:9",
  resolution: "1080p",
});

console.log(video.video_url);    // Final video URL
console.log(video.duration);     // Duration in seconds
console.log(video.credits_used); // Credits consumed
```

---

### Seedance — long clips and video editing

Seedance is the one video family that runs **asynchronously**: the API answers
`202` with a `job_id` rather than a finished video, so `generateVideo()` cannot
consume it. Use `generateSeedance()`, which submits the job and polls until it
finishes.

`seedance-2-5` renders **4–30 seconds in a single clip** — the longest we offer —
and its audio track is included in the price. The trade-off is resolution:
**480p and 720p only**. For 1080p or 4K stay on `seedance-2-0-pro` (4–15s).

```typescript
const result = await client.generateSeedance({
  prompt: "A lone hiker crossing a snowfield, wind picking up, wide drone shot",
  duration: 30,
  resolution: "720p",
  generate_audio: true,          // free
  onProgress: (job) => console.log(`${job.status} ${job.progress ?? 0}%`),
});

console.log(result.video_url);
console.log(result.credits_used); // ~435 for 30s @ 720p
```

Rates are per second: **14.5 credits/s at 720p**, **6.4 at 480p**. Draft at 480p
(a 5s test costs 32 credits) and re-render the take you like at 720p.

**Edit or extend an existing video** — pass `reference_videos` and
`duration: -1` to keep the source length:

```typescript
const edited = await client.generateSeedance({
  prompt: "Make it golden hour, warmer light on the subject's face",
  reference_videos: ["https://example.com/clip.mp4"],
  duration: -1,
});
```

A video reference bills at the higher **17.6 credits/s** (720p) because the
source frames are charged as input.

**Face consistency** — register a portrait once, then reuse the asset id:

```typescript
const asset = await client.registerVideoAsset("https://example.com/face.jpg");

const result = await client.generateSeedance({
  prompt: "The same woman walking through a night market, neon reflections",
  asset_ids: [asset.asset_id],
  duration: 10,
});
```

`generateSeedance()` throws `JobTimeoutError` if the job is still running when
`maxWait` (default 30 min) expires, and `JobFailedError` if the render fails.

---

### Music Generation

Generate original music from text descriptions.

```typescript
const music = await client.generateMusic({
  prompt: "Upbeat electronic dance track, euphoric synths, festival energy",
  duration: 30,
  genre: "electronic",
  tempo: 128,
  instrumental: true,
});

console.log(music.audio_url);
console.log(music.duration);
console.log(music.credits_used);
```

Music costs 5 credits up to 30 s, 10 up to 60 s, 25 beyond that; duration is
capped at 300 s. `generateSfx()` and `generateSpeech()` follow the same shape and
also return `audio_url`.

---

### Virtual Try-On

A try-on is a job, not a blocking call: a render takes about 11 seconds, so you submit and then wait.

```typescript
const job = await client.tryOn({
  personImageUrl: "https://example.com/person.jpg",
  garmentImageUrl: "https://example.com/shirt.png",
  category: "tops",              // "tops" | "bottoms" | "one-pieces"
  garmentPhotoType: "flat-lay",
});

const result = await client.waitForTryOn(job.job_id, {
  onProgress: (r) => console.log(r.status, r.progress),
});
console.log(result.images?.[0]);
```

Pass `garments` to dress a top **and** a bottom in one job. The API applies the top first, feeds
that render into the second pass, and charges 3 credits instead of 4:

```typescript
const job = await client.tryOn({
  personImageUrl: "https://example.com/person.jpg",
  garments: [
    { garmentImageUrl: "https://example.com/tee.png", category: "tops" },
    { garmentId: "0f1e2d3c-...", category: "bottoms" },   // or a catalogue id
  ],
});

const result = await client.waitForTryOn(job.job_id, { maxWait: 60_000 });

// If the second pass failed, the top-only render still comes back and one credit
// is refunded — so check before calling it a finished outfit.
const partial = result.metadata?.partial_failure;
if (partial) {
  console.warn(`The ${partial.slot} is missing`, result.images?.[0]);
}
```

Exactly one top plus one bottom is required — two tops, three garments, or a `one-pieces` in the
array are rejected with `400`. Hats and shoes are not supported by the model at all.

---

### Chat / LLM Completions

#### Non-Streaming

```typescript
const response = await client.chat({
  messages: [
    { role: "user", content: "Explain quantum entanglement in simple terms" },
  ],
  model: "gpt-4o",
  max_tokens: 1000,
  temperature: 0.7,
});

console.log(response.choices[0].message.content);
console.log(response.credits_used);
```

`chat()` accepts exactly four model IDs — `gemini-flash` (default),
`gemini-pro`, `gpt-4o`, `claude-sonnet`. Anything else is rejected with `400`.
For a full Claude model ID use `chatClaude()` or `chatBedrock()`.

`credits_used` is the authoritative charge. `usage` is passed straight through
from the provider and can arrive as `{}`, so read `usage.total_tokens` defensively.

#### Streaming

> **`client.chatStream()` throws `ValidationError`.**
> It targeted `/v1/ai/chat/completions`, which accepts `stream: true` for OpenAI
> compatibility and then ignores it, returning one complete JSON body. The SSE
> parser found no `data:` frames there, so the iterator completed after **zero
> chunks without throwing** — an empty result for a request you were still billed
> for. It now throws before sending, which keeps the call free.

The one streaming endpoint is `POST /v1/ai/agent/stream`. There is no wrapper for
it yet — call it with `fetch`. Frames are keyed by `type` and the stream ends at
`data: [DONE]`:

```typescript
interface AgentFrame {
  type: "text_delta" | "tool_use" | "done" | "error";
  text?: string;
  name?: string;
  usage?: { input_tokens: number; output_tokens: number; total_tokens: number };
  message?: string;
}

async function* agentFrames(prompt: string): AsyncGenerator<AgentFrame> {
  const res = await fetch("https://apis.fotohub.app/v1/ai/agent/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.FOTOHUB_API_KEY}`,
    },
    body: JSON.stringify({
      model: "claude-sonnet-4.6",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  outer: while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Frames are delimited by a blank line, not by a chunk boundary.
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data: "));
      if (!line) continue;
      const data = line.slice(6);
      if (data === "[DONE]") break outer;   // the only reliable terminator
      yield JSON.parse(data) as AgentFrame;
    }
  }
}

for await (const frame of agentFrames("Write a short story about a robot")) {
  if (frame.type === "text_delta") process.stdout.write(frame.text ?? "");
  else if (frame.type === "error") throw new Error(frame.message);
}
```

Two things to know: the `done` frame is **optional** (omitted when the turn
produced no tokens, replaced by `error` when generation succeeded but settlement
failed), and **abandoning the stream still bills you** — the server settles the
tokens it already generated.

---

### Gabriel --- Model Routing

Gabriel returns a routing *decision*, not a completion: it names the feature and
model to use, and you make that call yourself. **An API key is required.**

```typescript
const decision = await client.gabrielClassify({
  prompt: "I want to create a professional headshot for LinkedIn",
  language: "en",
});

console.log(decision.action);          // route | answer | workflow | error
console.log(decision.target);          // the feature to send the user to
console.log(decision.model_selected);
console.log(decision.credits_estimated);

// Autocomplete while typing, and idle suggestions — both keyless:
console.log(await client.gabrielSuggest({ partial: "make me a log", tab: "image" }));
console.log(await client.gabrielRecommend({ credits_remaining: 40 }));
```

---

### Translation

**No authentication required.**

```typescript
const result = await client.translate({
  text: "The future of AI is collaborative and open",
  target_language: "pl",
});

console.log(result.translated_text);
console.log(result.source_language);   // "auto" unless you set source_language
console.log(result.character_count);
```

There is no `formality`, `context` or `confidence` — the endpoint takes `text`,
`target_language` and optional `source_language`, nothing more. On a provider
timeout it returns your input text unchanged instead of an error, so compare
against the input if that distinction matters.

---

### Billing & Usage

All amounts are **USD**.

```typescript
const balance = await client.getBalance();
console.log(balance.credits.remaining_4h, "credits left in this 4h window");
console.log(balance.wallet.balance, balance.wallet.currency);   // USD

console.log(await client.getTransactions({ page: 1, pageSize: 20 }));
console.log(await client.getInvoices());
console.log(
  await client.estimateCost([{ type: "generate_image", model: "flux-2-pro", count: 10 }])
);
```

Per-endpoint analytics live at `GET /v1/usage` (JWT auth, fixed 30-day window)
and have no SDK wrapper — see the
[Usage & Analytics docs](https://docs.fotohub.app/api/usage-analytics).

**Topping up.** Take a fixed package or name your own amount:

```typescript
for (const pkg of await client.getTopupPackages()) {
  // The slugs are historical — topup-50 is now the $15 package. Read
  // amount_usd, never the number in the slug.
  console.log(pkg.slug, pkg.amount_usd, `+${pkg.bonus_pct}% bonus credits`);
}

// topupWallet takes positional arguments, not an options object.
const session = await client.topupWallet(40);
console.log(session.checkout_url);
```

The wallet is denominated in USD, but a customer in Poland can pay in złoty —
pass `"pln"` as the second argument and Stripe offers BLIK, card and bank
transfer while the wallet is credited the USD amount you asked for:

```typescript
const session = await client.topupWallet(40, "pln");
```

---

### Storage

Dedicated S3 buckets live under `/v1/storage/s3/*` and are **not wrapped by this
SDK** — call them with `fetch` for now:

```typescript
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.FOTOHUB_API_KEY}`,
};

const buckets = await (
  await fetch("https://apis.fotohub.app/v1/storage/s3/buckets", { headers })
).json();

const presigned = await (
  await fetch(
    `https://apis.fotohub.app/v1/storage/s3/buckets/${buckets[0].id}/objects/presign-upload`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        key: "uploads/video.mp4",
        content_type: "video/mp4",
        expires_in: 3600,
      }),
    }
  )
).json();

// Upload directly to storage — no data passes through your server.
await fetch(presigned.url, { method: "PUT", body: fileBuffer });
```

---

## Configuration

```typescript
import { FotoHub } from "fotohub";

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
} from "fotohub";

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
    // Async generation job failed (e.g. waitFor3D)
    console.error(`Job ${error.jobId} failed:`, error.message);

  } else if (error instanceof JobTimeoutError) {
    // waitFor3D() exceeded maxWait
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
const resilient = new FotoHub({
  apiKey: "fh_live_...",
  maxRetries: 5,
});

// Disable retries entirely
const noRetry = new FotoHub({
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
  GenerateImageOptions,
  GenerateIdaQOptions,
  ImageResult,
  ImageMetadata,
  EditImageOptions,
  EditResult,
  GenerateVideoOptions,
  VideoResult,
  GenerateMusicOptions,
  MusicResult,
  GenerateSpeechOptions,
  SpeechResult,
  TranscribeOptions,
  TranscriptionResult,
  ChatOptions,
  ChatMessage,
  ChatResult,
  ChatClaudeOptions,
  GabrielClassifyOptions,
  GabrielResult,
  TranslateOptions,
  TranslateResult,
  BillingBalance,
  WalletInfo,
  TopupPackage,
  CostOperation,
  CostEstimate,
  TransactionOptions,
  TransactionPage,
  StabilityTool,
  StabilityResult,
  Generate3DOptions,
  ThreeDResult,
  TryOnOptions,
  TryOnResult,
  Webhook,
} from "fotohub";
```

`ChatStreamChunk` and the `ChatStream` class are still exported, but only so
existing imports keep compiling — `chatStream()` throws before it ever produces
one. There is nothing to type against; use the raw `/v1/ai/agent/stream` frames
from the [Streaming](#streaming) section instead.

---

## API Methods Reference

Every method takes a single options object unless the signature below shows
positional arguments. Only four methods work without an API key.

**Generation**

| Method | Description | Key |
|--------|-------------|:---:|
| `generateImage(options)` | Generate images from a text prompt | Yes |
| `generateIdaQ(options)` | Generate with IDA Q 1.0 (proprietary) | Yes |
| `editImage(options)` | Edit an existing image from an instruction | Yes |
| `removeBackground(imageUrl)` | Cut out the background | Yes |
| `upscaleImage(imageUrl, scale?)` | Upscale (`scale` defaults to `2`) | Yes |
| `analyzeImage(options)` | Vision analysis of an image | Yes |
| `generateVideo(options)` | Generate a video — **synchronous**, returns `video_url`. Not for Seedance | Yes |
| `generateSeedance(options)` | Seedance 4–30s — submits and polls to completion | Yes |
| `registerVideoAsset(imageUrl)` | Register a face for Seedance `asset_ids` — free | Yes |
| `waitForVideo(result, opts?)` | Deprecated no-op; returns its input unchanged | Yes |
| `generateMusic(options)` | Generate music from a description | Yes |
| `generateSfx(options)` | Generate a sound effect | Yes |
| `generateSpeech(options)` | Text-to-speech synthesis | Yes |
| `transcribe(options)` | Transcribe audio to text | Yes |
| `generate3D(options)` | Submit a 3D generation job | Yes |
| `get3DStatus(jobId)` | Poll a 3D job | Yes |
| `waitFor3D(jobId, opts?)` | Wait for a 3D job to finish | Yes |
| `list3DModels()` | List available 3D models | Yes |
| `tryOn(options)` | Submit a virtual try-on (one garment, or top + bottom) | Yes |
| `getTryOnStatus(jobId)` | Poll a try-on job | Yes |
| `waitForTryOn(jobId, opts?)` | Wait for a try-on job to finish | Yes |

**Chat & orchestration**

| Method | Description | Key |
|--------|-------------|:---:|
| `chat(options)` | Chat completion — one complete body, never a stream | Yes |
| `chatClaude(options)` | Chat completion on a premium Claude model | Yes |
| `chatBedrock(options)` | Chat completion via Bedrock routing | Yes |
| `chatStream(options)` | **Throws `ValidationError`** — see [Streaming](#streaming) | --- |
| `enhancePrompt(prompt, style?)` | Rewrite a prompt for better output | Yes |
| `gabrielClassify(options)` | Route a request to a model (returns a decision, not a completion) | Yes |
| `gabrielSuggest(options)` | Prompt suggestions | No |
| `gabrielRecommend(options?)` | Model recommendations | No |
| `translate(options)` | Translate text (returns the input unchanged on failure) | No |

**Stability AI tools**

| Method | Description | Key |
|--------|-------------|:---:|
| `listStabilityTools()` | List available tools | Yes |
| `runStabilityTool(toolId, options)` | Run any tool by id | Yes |
| `stabilityUpscale(...)` | Upscale | Yes |
| `stabilityRemoveBackground(imageBase64)` | Remove background | Yes |
| `stabilityErase(imageBase64, maskBase64)` | Erase a masked region | Yes |
| `stabilityInpaint(...)` | Inpaint a masked region | Yes |
| `stabilityOutpaint(imageBase64, padding)` | Extend the canvas | Yes |
| `stabilitySearchReplace(...)` | Replace an object by description | Yes |
| `stabilityRecolor(...)` | Recolour an object | Yes |
| `stabilityStyleTransfer(...)` | Apply a style reference | Yes |

**Billing & tiers** --- all amounts USD

| Method | Description | Key |
|--------|-------------|:---:|
| `getBalance()` | Credit balance, tier and overage config | Yes |
| `getCredits()` | Credit totals only | Yes |
| `getWallet()` | Wallet balance in USD | Yes |
| `topupWallet(amountUsd, payCurrency?)` | Checkout for any amount; pass `"pln"` for BLIK | Yes |
| `getTopupPackages()` | Fixed packages (read `amount_usd`, not the slug) | Yes |
| `createTopup(packageSlug)` | Checkout for a fixed package | Yes |
| `setOverageLimit(hardLimitUsd, projectId?)` | Cap overage spend | Yes |
| `estimateCost(operations)` | Price a `CostOperation[]` before spending | Yes |
| `getTransactions(options?)` | Paginated transaction history | Yes |
| `getInvoices()` | Invoice list | Yes |
| `getPricing()` | Public price catalogue | Yes |
| `listModels(category?)` | Model catalogue | Yes |
| `getPlans()` | API subscription plans | Yes |
| `getTierCatalog()` | Public tier catalogue | No |
| `getCurrentTier()` | Your tier, limits and usage | Yes |
| `compareTiers()` | Your tier against the others | Yes |
| `subscribeTier(tierSlug)` | Checkout for an API tier | Yes |
| `applyEnterprise(application)` | Submit an enterprise application | Yes |

**Webhooks**

| Method | Description | Key |
|--------|-------------|:---:|
| `listWebhooks()` | List subscriptions | Yes |
| `createWebhook(options)` | Create a subscription | Yes |
| `updateWebhook(webhookId, options)` | Update a subscription | Yes |
| `deleteWebhook(webhookId)` | Delete a subscription | Yes |
| `testWebhook(webhookId)` | Send a test delivery | Yes |
| `getWebhookLogs(webhookId)` | Recent delivery attempts | Yes |

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
- [npm](https://www.npmjs.com/package/fotohub)

---

## License

[MIT](./LICENSE) --- Copyright (c) 2026 FOTOhub
