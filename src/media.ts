/**
 * Upscale Pro and AI video: two job namespaces on the client.
 *
 * ```typescript
 * const q = await client.upscalePro.quote({ kind: "video", width: 1280, height: 720, fps: 30, seconds: 18 });
 * if (q.available) {
 *   // `credits` is null when the wallet pays (no credit price) or absent; null skips the check.
 *   const job = await client.upscalePro.video({ videoUrl: "https://example.com/clip.mp4", quoteCredits: q.credits as number | null });
 *   const done = await client.upscalePro.waitForJob(job.job_id as string);
 * }
 *
 * const out = await client.aiVideo.generate({ prompt: "A lighthouse at dusk, waves rolling in" });
 * const video = await client.aiVideo.waitForJob((out.job as { id: string }).id);
 * ```
 *
 * `quoteCredits` is optional everywhere. Send back the figure you showed and the API refuses the
 * start with a {@link PriceChangedError} (409, nothing charged) when the price moved; omit it and no
 * check is made.
 */

import { JOB_TERMINAL, Namespace, body, uuid } from "./aiwave.js";
import type { AiWaveJob, AiWaveResponse, WaitOptions } from "./aiwave.js";
import { ValidationError } from "./errors.js";

/**
 * `quoteCredits` checked before any request: unset (`undefined` / `null`: no price check) or a
 * finite number >= 0. `JSON.stringify` turns NaN / Infinity into `null`, which would silently skip
 * the price check, so they are refused here, nothing sent.
 */
function quoteCredits(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new ValidationError(`quoteCredits must be a finite number >= 0, got ${String(value)}`);
  }
  return value;
}

// ─────────────────────────────────────────────────────────────────────────────
// Upscale Pro
// ─────────────────────────────────────────────────────────────────────────────

export interface UpscaleProQuoteOptions {
  kind: "image" | "video";
  width: number;
  height: number;
  /** 2, 3 or 4 (server default 4). */
  scale?: number;
  /** Required for a video quote. */
  fps?: number;
  /** Required for a video quote. */
  seconds?: number;
}

export interface UpscaleProImageOptions {
  /** `https://` URL or `data:image/...;base64`. */
  imageUrl: string;
  /** 2, 3 or 4 (server default 4), lowered automatically to fit the output cap. */
  scale?: number;
  /** `true` (server default): wait up to ~55 s and answer 200 with `result`; else 202 + `job_id`. */
  wait?: boolean;
  /** Up to 2 KB of your own JSON, echoed back in the job. */
  clientRef?: Record<string, unknown>;
}

export interface UpscaleProVideoOptions {
  /** `https://` URL of the source video. */
  videoUrl: string;
  /** 2 (server default), 3 or 4, lowered automatically to fit the output cap. */
  scale?: number;
  /** Where the span starts (default 0). */
  startSeconds?: number;
  /** Span length (default: to the end, within the per-job cap). */
  maxSeconds?: number;
  /**
   * The `credits` of {@link UpscaleProApi.quote} you confirmed. The charge is measured on the file;
   * a higher price is refused with {@link PriceChangedError}, a lower one is charged as measured.
   */
  quoteCredits?: number | null;
  /** Up to 2 KB of your own JSON, echoed back in the job. */
  clientRef?: Record<string, unknown>;
}

/**
 * `/v1/upscale/pro`: generative 4K image and video upscaling (Professional plan and up).
 *
 * Charged once when accepted, refunded automatically when a job fails or is cancelled. The start
 * routes take no idempotency key, so the client does not repeat a start after a 5xx or a timeout
 * (the first attempt may already be running); only a 429 is retried. Check `jobs({ active: true })`
 * before starting again by hand.
 */
export class UpscaleProApi extends Namespace {
  private static readonly BASE = "/v1/upscale/pro";

  /** Free: plan eligibility, applied scale, output size, ETA, billed seconds and (video) `credits`. */
  quote(options: UpscaleProQuoteOptions): Promise<AiWaveResponse> {
    return this.call(
      "POST",
      `${UpscaleProApi.BASE}/quote`,
      body({
        kind: options.kind,
        width: options.width,
        height: options.height,
        scale: options.scale,
        fps: options.fps,
        seconds: options.seconds,
      })
    );
  }

  /** Upscale an image. Charged. 200 with `result` when it finishes in time, else 202 with `job_id`. */
  image(options: UpscaleProImageOptions): Promise<AiWaveResponse> {
    return this.start("image", {
      image_url: options.imageUrl,
      scale: options.scale,
      wait: options.wait,
      client_ref: options.clientRef,
    });
  }

  /** Upscale a span of a video. Charged per billed second; answers 202 with `job_id`. */
  async video(options: UpscaleProVideoOptions): Promise<AiWaveResponse> {
    return this.start("video", {
      video_url: options.videoUrl,
      scale: options.scale,
      start_seconds: options.startSeconds,
      max_seconds: options.maxSeconds,
      quote_credits: quoteCredits(options.quoteCredits),
      client_ref: options.clientRef,
    });
  }

  /** Your recent jobs, newest first (`active: true` = unfinished only). */
  jobs(
    options: { active?: boolean; kind?: "image" | "video"; limit?: number } = {}
  ): Promise<AiWaveResponse> {
    return this.call("GET", `${UpscaleProApi.BASE}/jobs`, undefined, {
      active: options.active ? "true" : undefined,
      kind: options.kind,
      limit: options.limit,
    });
  }

  /** One job: `status`, `progress`, `eta_s`; `result` once succeeded; `error` + `refunded` otherwise. */
  job(jobId: string): Promise<AiWaveJob> {
    return this.call<AiWaveJob>("GET", `${UpscaleProApi.BASE}/jobs/${jobId}`);
  }

  /** Cancel a queued or running job; refunded at once (409 `not_cancellable` when already done). */
  cancel(jobId: string): Promise<AiWaveResponse> {
    return this.call("POST", `${UpscaleProApi.BASE}/jobs/${jobId}/cancel`);
  }

  /**
   * Poll until the job succeeds.
   * @throws AiWaveJobError when it failed or was cancelled (`error.job.refunded`).
   * @throws JobTimeoutError when it did not finish within `maxWait` (it keeps running).
   */
  waitForJob(jobId: string, options: WaitOptions = {}): Promise<AiWaveJob> {
    return this.poll(`${UpscaleProApi.BASE}/jobs/${jobId}`, jobId, JOB_TERMINAL, "Upscale Pro job", options, {
      pollInterval: 5_000,
      maxWait: 1_800_000,
    });
  }

  private start(kind: "image" | "video", fields: Record<string, unknown>): Promise<AiWaveResponse> {
    return this.request<AiWaveResponse>({
      method: "POST",
      path: `${UpscaleProApi.BASE}/${kind}`,
      body: body(fields),
      requiresAuth: true,
      // No idempotency key on these routes: never replay a start whose outcome is unknown.
      retryAmbiguous: false,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI video
// ─────────────────────────────────────────────────────────────────────────────

/** The consent declaration an avatar needs. */
export interface AvatarConsent {
  subject: "self" | "consented_person";
  version: string;
  locale: "en" | "pl" | "de";
  sha256?: string;
}

export interface AiVideoGenerateOptions {
  /** What happens in the clip. */
  prompt: string;
  /** `photos/<your user id>/...` first frame (image-to-video); omit for text-to-video. */
  image?: string;
  /** Seconds; only 5 is available (the server default). */
  duration?: 5;
  /** Only "720p" is available (the server default). */
  resolution?: "720p";
  seed?: number;
  /** The price you showed; 409 {@link PriceChangedError} when stale. */
  quoteCredits?: number | null;
  /** Your UUID for this run; minted when omitted. */
  requestId?: string;
}

export interface AiVideoAvatarOptions {
  /** `photos/<your user id>/...`: your photo or one of a person who agreed. */
  portrait: string;
  /** Required. */
  consent: AvatarConsent;
  /** "audio" (server default: your speech in `audio`) or "script". */
  mode?: "audio" | "script";
  /** Your speech (wav or mp3, up to 5 s). */
  audio?: string;
  /** What the avatar says (up to 400 characters). */
  script?: string;
  language?: "pl" | "en" | "de";
  /** Your own voice recording (script mode); needs `voiceConsent`. */
  voiceRef?: string;
  voiceConsent?: boolean;
  /** Optional style / scene hint. */
  prompt?: string;
  gesture?: "natural" | "calm" | "expressive";
  seed?: number;
  quoteCredits?: number | null;
  requestId?: string;
}

export interface AiVideoDubOptions {
  /** `videos/<your user id>/...` (or `photos/`, `cloud-drive/`). */
  source: string;
  /** Up to 5 target languages: one job each. */
  languages: string[];
  /** Omit or "auto" to detect it. */
  sourceLanguage?: string;
  /** Up to 30 names and terms to keep exactly as written. */
  glossary?: string[];
  /** Your own voice recording to clone for every speaker; needs `voiceConsent`. */
  voiceRef?: string;
  voiceConsent?: { version: string; locale: string; sha256?: string };
  /** The TOTAL price you showed, all languages. */
  quoteCredits?: number | null;
  requestId?: string;
}

/**
 * `/v1/video/generations`, `/v1/video/avatar`, `/v1/video/dub`: FOTOhub AI video jobs (API keys only).
 *
 * Every start takes a `requestId` (minted when omitted, re-sent unchanged on the client's own
 * retries): a retry with the same id returns the first job and is never billed twice. The routes
 * refuse unknown fields, so only the options you set are sent.
 */
export class AiVideoApi extends Namespace {
  static readonly MOTION_MODEL = "fotohub-motion-audio";

  /** AI Motion video with sound (720p, 5 s). Charged. Answers `{ job, created }`. */
  async generate(options: AiVideoGenerateOptions): Promise<AiWaveResponse> {
    return this.call("POST", "/v1/video/generations", {
      ...body({
        model: AiVideoApi.MOTION_MODEL,
        prompt: options.prompt,
        image: options.image,
        duration: options.duration,
        resolution: options.resolution,
        seed: options.seed,
        quote_credits: quoteCredits(options.quoteCredits),
      }),
      request_id: options.requestId ?? uuid(),
    });
  }

  /** A talking-head clip (up to 5 s) from your own portrait. Charged. Answers `{ job, created }`. */
  async avatar(options: AiVideoAvatarOptions): Promise<AiWaveResponse> {
    return this.call("POST", "/v1/video/avatar", {
      ...body({
        portrait: options.portrait,
        consent: options.consent,
        mode: options.mode,
        audio: options.audio,
        script: options.script,
        language: options.language,
        voice_ref: options.voiceRef,
        voice_consent: options.voiceConsent,
        prompt: options.prompt,
        gesture: options.gesture,
        seed: options.seed,
        quote_credits: quoteCredits(options.quoteCredits),
      }),
      request_id: options.requestId ?? uuid(),
    });
  }

  /** Dub a video into up to 5 languages. Charged. Answers `{ project_id, created, jobs: [...] }`. */
  async dub(options: AiVideoDubOptions): Promise<AiWaveResponse> {
    return this.call("POST", "/v1/video/dub", {
      ...body({
        source: options.source,
        languages: options.languages,
        source_language: options.sourceLanguage,
        glossary: options.glossary,
        voice_ref: options.voiceRef,
        voice_consent: options.voiceConsent,
        quote_credits: quoteCredits(options.quoteCredits),
      }),
      request_id: options.requestId ?? uuid(),
    });
  }

  /** A job any of the three routes returned. Free. */
  get(jobId: string): Promise<AiWaveJob> {
    return this.call<AiWaveJob>("GET", `/v1/video/generations/${jobId}`);
  }

  /**
   * Poll {@link AiVideoApi.get} until the job succeeds.
   * @throws AiWaveJobError when it failed or was cancelled (`error.job.refunded`).
   * @throws JobTimeoutError when it did not finish within `maxWait` (it keeps running).
   */
  waitForJob(jobId: string, options: WaitOptions = {}): Promise<AiWaveJob> {
    return this.poll(`/v1/video/generations/${jobId}`, jobId, JOB_TERMINAL, "Video job", options, {
      pollInterval: 5_000,
      maxWait: 1_800_000,
    });
  }
}
