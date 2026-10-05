/**
 * AI Wave 1: Character Studio, Product Shot, video edit by chat, music edits.
 *
 * Reached as properties of the client:
 *
 * ```typescript
 * const client = new FotoHub({ apiKey: process.env.FOTOHUB_API_KEY! });
 * await client.characters.create({ ... });
 * await client.productShot.create({ ... });
 * await client.productShot.batches.create({ ... });
 * await client.videoEdit.edit({ ... });
 * await client.musicEdit.editSection({ ... });
 * ```
 *
 * Conventions (they come from the API, not from this SDK):
 *
 * - Every charged call takes a `requestId`. The SDK mints a UUID when you do not pass one and
 *   re-sends the same body on each of its own retries, so a timeout never bills twice. Pass your own
 *   to make a retry safe across process restarts too.
 * - Every price comes from the server. The `quote*` methods are free and answer the price, the route
 *   and the queue before you commit; `GET /v1/pricing` lists the same rates. This module hard-codes
 *   no price and no limit.
 * - Paths you pass (`imagePath`, `sourcePath`, `photos`) point into your own storage
 *   (`photos/<your user id>/...`, `videos/<id>/...`, `audio/<id>/...`); anything else is a 422 and
 *   nothing is charged.
 * - A feature that is not enabled for your account answers 403 `feature_disabled`
 *   ({@link PermissionError}).
 */

import { FotoHubError, JobFailedError, JobTimeoutError } from "./errors.js";
import type { RequestOptions } from "./types.js";

/** The client's request function, as handed to the namespaces. */
export type AiWaveRequest = <T>(options: RequestOptions) => Promise<T>;

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

/** Job / turn statuses after which nothing changes any more. */
export const JOB_TERMINAL: readonly string[] = ["succeeded", "failed", "cancelled"];
/** Product Shot batch statuses after which nothing changes any more (`paused` is not terminal). */
export const BATCH_TERMINAL: readonly string[] = [
  "completed",
  "completed_with_errors",
  "failed",
  "cancelled",
];

/** A durable job (character sheet / generation, product shot, music edit) or a video-edit turn. */
export interface AiWaveJob {
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  stage?: string | null;
  progress?: number | null;
  /** Present once the job succeeded. */
  result?: Record<string, unknown> | null;
  /** Present when it failed or was cancelled. */
  error?: unknown;
  /** True when the charge was given back. */
  refunded?: boolean;
  refund_message?: string;
  eta?: Record<string, unknown>;
  created_at?: string;
  finished_at?: string | null;
  [key: string]: unknown;
}

/** Any other answer of the API: documented in the docs page of the feature. */
export type AiWaveResponse = Record<string, unknown>;

export interface WaitOptions {
  /** Milliseconds between status checks. */
  pollInterval?: number;
  /** Maximum wait in milliseconds; the job keeps running when it is exceeded. */
  maxWait?: number;
  onProgress?: (view: AiWaveJob) => void;
}

/** `[startS, endS]` or `{ startS, endS }`: the part of a clip to edit, in seconds. */
export type ClipSelection = readonly [number, number] | { startS: number; endS: number };

/** Thrown by the waiters when a job or turn failed or was cancelled; `job` says whether it was refunded. */
export class AiWaveJobError extends JobFailedError {
  public readonly job: AiWaveJob;

  constructor(jobId: string, message: string, job: AiWaveJob) {
    super(jobId, message);
    this.name = "AiWaveJobError";
    this.job = job;
  }
}

function uuid(): string {
  const c: Crypto | undefined = (globalThis as { crypto?: Crypto }).crypto;
  if (typeof c?.randomUUID === "function") return c.randomUUID();
  const hex = (n: number): string =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
}

/** Drops `undefined` so the server's own defaults apply to what the caller did not set. */
function body(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) out[k] = v;
  return out;
}

function selectionBody(
  s: ClipSelection | undefined
): { start_s: number; end_s: number } | undefined {
  if (s === undefined) return undefined;
  if (Array.isArray(s)) return { start_s: Number(s[0]), end_s: Number(s[1]) };
  const o = s as { startS: number; endS: number };
  return { start_s: Number(o.startS), end_s: Number(o.endS) };
}

function errorText(view: AiWaveJob, fallback: string): string {
  const err = view.error;
  const detail =
    typeof err === "string"
      ? err
      : err && typeof err === "object" && typeof (err as { message?: unknown }).message === "string"
        ? (err as { message: string }).message
        : fallback;
  return view.refund_message ? `${detail} ${view.refund_message}` : detail;
}

class Namespace {
  constructor(protected readonly request: AiWaveRequest) {}

  protected call<T = AiWaveResponse>(
    method: RequestOptions["method"],
    path: string,
    payload?: unknown,
    query?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return this.request<T>({ method, path, body: payload, query, requiresAuth: true });
  }

  protected async poll(
    path: string,
    id: string,
    terminal: readonly string[],
    label: string,
    options: WaitOptions,
    defaults: { pollInterval: number; maxWait: number }
  ): Promise<AiWaveJob> {
    const pollInterval = options.pollInterval ?? defaults.pollInterval;
    const maxWait = options.maxWait ?? defaults.maxWait;
    const start = Date.now();
    while (true) {
      const view = await this.call<AiWaveJob>("GET", path);
      options.onProgress?.(view);
      if (terminal.includes(view.status)) {
        // A batch that finished with failed images is the answer (its counts say which); a job or a
        // turn that did not succeed is an error.
        if (terminal === JOB_TERMINAL && view.status !== "succeeded") {
          throw new AiWaveJobError(id, errorText(view, `${label} ${id} ${view.status}`), view);
        }
        return view;
      }
      if (Date.now() - start >= maxWait) {
        throw new JobTimeoutError(
          id,
          `${label} ${id} timed out after ${Math.round(maxWait / 1000)}s`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Character Studio
// ─────────────────────────────────────────────────────────────────────────────

/** The consent declaration a photo character needs (`config().consent` carries version and hashes). */
export interface CharacterConsent {
  subject: "self" | "consented_person" | "fictional";
  version: string;
  locale?: "en" | "pl" | "de";
  sha256?: string;
}

export interface CharacterCreateOptions {
  /** 1-60 characters. */
  name: string;
  source: "photos" | "prompt";
  /** `"face"` (default) or `"non_face"` (mascot, product character, ...). */
  kind?: "face" | "non_face";
  /** 1-5 storage paths, `photos/<your user id>/...` (`source: "photos"`). */
  photos?: string[];
  /** The character in a few words (`source: "prompt"`). */
  prompt?: string;
  description?: string;
  /** How strictly later generations keep the identity, 0..1. */
  strength?: number;
  /** Required for photos. */
  consent?: CharacterConsent;
  seed?: number;
  /** Idempotency key; a UUID is generated when omitted. */
  requestId?: string;
}

export interface CharacterUpdateOptions {
  name?: string;
  description?: string;
  strength?: number;
  excludeAssets?: string[];
  includeAssets?: string[];
}

export interface CharacterGenerationOptions {
  prompt: string;
  /** Default `seedream-5-0-260128`. `config().models` lists the models and their reference caps. */
  model?: string;
  aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | "2:3" | "3:2";
  strength?: number;
  seed?: number;
  requestId?: string;
}

/** `/v1/characters`: a character with an identity sheet, usable in any image generation. */
export class CharactersApi extends Namespace {
  /** Views, photo limits, consent declaration, where each step runs, models, your limits. Free. */
  config(): Promise<AiWaveResponse> {
    return this.call("GET", "/v1/characters/config");
  }

  private createBody(o: CharacterCreateOptions): Record<string, unknown> {
    return body({
      name: o.name,
      kind: o.kind ?? "face",
      source: o.source,
      photos: o.photos,
      prompt: o.prompt,
      description: o.description,
      strength: o.strength,
      consent: o.consent,
      seed: o.seed,
    });
  }

  /** Price, availability, ETA and your limits for a new character. Never charges. */
  quote(options: CharacterCreateOptions): Promise<AiWaveResponse> {
    const { requestId: _ignored, ...rest } = options;
    return this.call("POST", "/v1/characters/quote", this.createBody(rest));
  }

  /**
   * Create a character and start its identity sheet. Charged; refunded in full when too few views
   * pass the identity check. Collect the sheet with {@link CharactersApi.waitForJob}.
   */
  create(options: CharacterCreateOptions): Promise<AiWaveResponse> {
    return this.call("POST", "/v1/characters", {
      ...this.createBody(options),
      request_id: options.requestId ?? uuid(),
    });
  }

  list(options: { limit?: number } = {}): Promise<AiWaveResponse> {
    return this.call("GET", "/v1/characters", undefined, { limit: options.limit ?? 50 });
  }

  /** One character: views with identity scores, references, sheet job state and ETA. */
  get(characterId: string): Promise<AiWaveResponse> {
    return this.call("GET", `/v1/characters/${characterId}`);
  }

  /** Rename, describe, change the strength, exclude or re-include sheet views. Free. */
  update(characterId: string, options: CharacterUpdateOptions): Promise<AiWaveResponse> {
    return this.call(
      "PATCH",
      `/v1/characters/${characterId}`,
      body({
        name: options.name,
        description: options.description,
        strength: options.strength,
        exclude_assets: options.excludeAssets,
        include_assets: options.includeAssets,
      })
    );
  }

  /** Delete a character; active jobs are cancelled (and refunded). The consent record is retained. Free. */
  delete(characterId: string): Promise<AiWaveResponse> {
    return this.call("DELETE", `/v1/characters/${characterId}`);
  }

  /** Regenerate the identity sheet. Charged like a creation. */
  regenerateSheet(
    characterId: string,
    options: { seed?: number; requestId?: string } = {}
  ): Promise<AiWaveResponse> {
    return this.call(
      "POST",
      `/v1/characters/${characterId}/sheet`,
      { ...body({ seed: options.seed }), request_id: options.requestId ?? uuid() }
    );
  }

  /** What a generator would send for `model`: reference URLs, a prompt prefix, the strength. Free. */
  resolve(
    characterId: string,
    model: string,
    options: { strength?: number } = {}
  ): Promise<AiWaveResponse> {
    return this.call(
      "POST",
      `/v1/characters/${characterId}/resolve`,
      body({ model, strength: options.strength })
    );
  }

  private generationBody(o: CharacterGenerationOptions): Record<string, unknown> {
    return body({
      model: o.model ?? "seedream-5-0-260128",
      prompt: o.prompt,
      aspect_ratio: o.aspectRatio,
      strength: o.strength,
      seed: o.seed,
    });
  }

  /** The model's own price plus the character-lock fee, availability and ETA. Never charges. */
  quoteGeneration(
    characterId: string,
    options: CharacterGenerationOptions
  ): Promise<AiWaveResponse> {
    return this.call(
      "POST",
      `/v1/characters/${characterId}/generations/quote`,
      this.generationBody(options)
    );
  }

  /**
   * An image of the character. Charged: the model's own price now, the character-lock fee only when
   * the identity check accepts the result. Returns a job.
   */
  generate(characterId: string, options: CharacterGenerationOptions): Promise<AiWaveResponse> {
    return this.call("POST", `/v1/characters/${characterId}/generations`, {
      ...this.generationBody(options),
      request_id: options.requestId ?? uuid(),
    });
  }

  /** The character's recent jobs. */
  jobs(
    characterId: string,
    options: { limit?: number; kind?: "sheet" | "generation" } = {}
  ): Promise<AiWaveResponse> {
    return this.call("GET", `/v1/characters/${characterId}/jobs`, undefined, {
      limit: options.limit ?? 20,
      kind: options.kind,
    });
  }

  getJob(jobId: string): Promise<AiWaveJob> {
    return this.call<AiWaveJob>("GET", `/v1/characters/jobs/${jobId}`);
  }

  /** Cancel a queued or running job; refunded once. Free. */
  cancelJob(jobId: string): Promise<AiWaveResponse> {
    return this.call("POST", `/v1/characters/jobs/${jobId}/cancel`);
  }

  /**
   * Poll until the job succeeds.
   * @throws AiWaveJobError when it failed or was cancelled (`error.job` says whether it was refunded).
   * @throws JobTimeoutError when it did not finish within `maxWait` (it keeps running).
   */
  waitForJob(jobId: string, options: WaitOptions = {}): Promise<AiWaveJob> {
    return this.poll(`/v1/characters/jobs/${jobId}`, jobId, JOB_TERMINAL, "Character job", options, {
      pollInterval: 3_000,
      maxWait: 600_000,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Product Shot
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductShotSettings {
  /** A built-in or saved preset id (default `studio_white`). */
  presetId?: string;
  /** A custom scene description instead of a preset. */
  prompt?: string;
  params?: Record<string, unknown>;
  /** Subset of `config().aspects`; default `["1:1"]`. */
  aspects?: string[];
  /** `"standard"` (default) or `"premium"` (needs `sceneModel` from `config().premium_models`). */
  tier?: "standard" | "premium";
  sceneModel?: string;
}

export interface ProductShotQuoteOptions extends ProductShotSettings {
  /** `photos/<your user id>/...` */
  imagePath: string;
  seed?: number;
}

export interface ProductShotCreateOptions extends ProductShotQuoteOptions {
  /** Must be `true`: cut-outs are made in the United States. */
  consentUsProcessing: boolean;
  /** `config().residency.consent_version`; required with the consent. */
  consentVersion?: string;
  requestId?: string;
}

export interface ProductShotBatchItem {
  /** A photo in your storage: `photos/<your user id>/...` */
  image_path?: string;
  /** Or an `https://` store photo URL. */
  image_url?: string;
  sku?: string;
  external_id?: string;
  title?: string;
}

export interface ProductShotBatchCreateOptions extends ProductShotSettings {
  items: ProductShotBatchItem[];
  name?: string;
  consentUsProcessing: boolean;
  consentVersion?: string;
  /** Default `"api"`. */
  source?: "app" | "api" | "commerce";
  externalRef?: string;
  requestId?: string;
}

function shotSettings(o: ProductShotSettings): Record<string, unknown> {
  return body({
    preset_id: o.presetId,
    prompt: o.prompt,
    params: o.params,
    aspects: o.aspects,
    tier: o.tier,
    scene_model: o.sceneModel,
  });
}

function consentFields(
  consentUsProcessing: boolean,
  consentVersion: string | undefined
): Record<string, unknown> {
  if (consentUsProcessing && !consentVersion) {
    throw new FotoHubError(
      "consentVersion is required with consentUsProcessing: pass config().residency.consent_version of the Product Shot config.",
      "validation_error"
    );
  }
  return body({
    consent_us_processing: Boolean(consentUsProcessing),
    consent_version: consentVersion,
  });
}

/** `/v1/aiwave/product-shot/batches`: each image is charged when it starts and refunded individually when it fails. */
export class ProductShotBatchesApi extends Namespace {
  private static readonly BASE = "/v1/aiwave/product-shot/batches";

  /** Price per image and in total, availability, your ceilings, whether the batch fits. */
  quote(options: ProductShotSettings & { skus?: number } = {}): Promise<AiWaveResponse> {
    return this.call("POST", `${ProductShotBatchesApi.BASE}/quote`, {
      ...shotSettings(options),
      skus: options.skus ?? 1,
    });
  }

  /** Create a batch. Needs the US-processing consent. */
  create(options: ProductShotBatchCreateOptions): Promise<AiWaveResponse> {
    return this.call("POST", ProductShotBatchesApi.BASE, {
      ...shotSettings(options),
      ...body({ name: options.name, source: options.source ?? "api", external_ref: options.externalRef }),
      items: options.items,
      ...consentFields(options.consentUsProcessing, options.consentVersion),
      request_id: options.requestId ?? uuid(),
    });
  }

  list(options: { limit?: number } = {}): Promise<AiWaveResponse> {
    return this.call("GET", ProductShotBatchesApi.BASE, undefined, { limit: options.limit ?? 20 });
  }

  /** Status, counts, progress, spend, pause reason, ETA, archive state. */
  get(batchId: string): Promise<AiWaveResponse> {
    return this.call("GET", `${ProductShotBatchesApi.BASE}/${batchId}`);
  }

  /** Per-image status, result, error, charge and refund state. */
  items(
    batchId: string,
    options: {
      status?: "queued" | "running" | "succeeded" | "failed" | "cancelled";
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<AiWaveResponse> {
    return this.call("GET", `${ProductShotBatchesApi.BASE}/${batchId}/items`, undefined, {
      status: options.status,
      limit: options.limit ?? 200,
      offset: options.offset ?? 0,
    });
  }

  /** Stop the batch: waiting images are never charged, in-flight ones refunded. Free. */
  cancel(batchId: string): Promise<AiWaveResponse> {
    return this.call("POST", `${ProductShotBatchesApi.BASE}/${batchId}/cancel`);
  }

  /** Queue the failed images again (each is charged when it starts). */
  retryFailed(batchId: string): Promise<AiWaveResponse> {
    return this.call("POST", `${ProductShotBatchesApi.BASE}/${batchId}/retry-failed`);
  }

  /** Resume a paused batch; `acceptPrice: true` when the pause was a price change. */
  resume(batchId: string, options: { acceptPrice?: boolean } = {}): Promise<AiWaveResponse> {
    return this.call("POST", `${ProductShotBatchesApi.BASE}/${batchId}/resume`, {
      accept_price: Boolean(options.acceptPrice),
    });
  }

  /** (Re)build the results zip once the batch has finished. Free. */
  buildArchive(batchId: string): Promise<AiWaveResponse> {
    return this.call("POST", `${ProductShotBatchesApi.BASE}/${batchId}/archive`);
  }

  /** The zip parts; a 409 `archive_not_ready` while it is being built. */
  getArchive(batchId: string): Promise<AiWaveResponse> {
    return this.call("GET", `${ProductShotBatchesApi.BASE}/${batchId}/archive`);
  }

  /**
   * Poll until the batch reaches a terminal status and return its view. A batch that finished with
   * failed images is returned, not thrown (look at `counts`, then {@link retryFailed}); a `paused`
   * batch keeps waiting, so resume it.
   * @throws JobTimeoutError when it did not finish within `maxWait` (the batch keeps running).
   */
  wait(batchId: string, options: WaitOptions = {}): Promise<AiWaveJob> {
    return this.poll(
      `${ProductShotBatchesApi.BASE}/${batchId}`,
      batchId,
      BATCH_TERMINAL,
      "Product Shot batch",
      options,
      { pollInterval: 5_000, maxWait: 3_600_000 }
    );
  }
}

/**
 * `/v1/aiwave/product-shot`: a product photo on a clean or generated background. The product's own
 * pixels are preserved. Cut-outs are made in the United States, so a job needs the consent text from
 * {@link ProductShotApi.config} (`residency`).
 */
export class ProductShotApi extends Namespace {
  private static readonly BASE = "/v1/aiwave/product-shot";
  readonly batches: ProductShotBatchesApi;

  constructor(request: AiWaveRequest) {
    super(request);
    this.batches = new ProductShotBatchesApi(request);
  }

  /** Presets, aspects, marketplaces, premium scene models, your saved presets, the consent text, limits. Free. */
  config(): Promise<AiWaveResponse> {
    return this.call("GET", `${ProductShotApi.BASE}/config`);
  }

  /** Price per image and in total, availability and ETA, before any charge. */
  quote(options: ProductShotQuoteOptions): Promise<AiWaveResponse> {
    return this.call("POST", `${ProductShotApi.BASE}/quote`, {
      ...shotSettings(options),
      ...body({ image_path: options.imagePath, seed: options.seed }),
    });
  }

  /**
   * Create one job per requested aspect. Charged per image, all-or-nothing.
   * Returns `{ request_id, jobs: [{ job_id, aspect, status, replayed }], quote, eta, residency }`.
   */
  create(options: ProductShotCreateOptions): Promise<AiWaveResponse> {
    return this.call("POST", `${ProductShotApi.BASE}/jobs`, {
      ...shotSettings(options),
      ...body({ image_path: options.imagePath, seed: options.seed }),
      ...consentFields(options.consentUsProcessing, options.consentVersion),
      request_id: options.requestId ?? uuid(),
    });
  }

  listJobs(options: { requestId?: string; limit?: number } = {}): Promise<AiWaveResponse> {
    return this.call("GET", `${ProductShotApi.BASE}/jobs`, undefined, {
      request_id: options.requestId,
      limit: options.limit ?? 20,
    });
  }

  getJob(jobId: string): Promise<AiWaveJob> {
    return this.call<AiWaveJob>("GET", `${ProductShotApi.BASE}/jobs/${jobId}`);
  }

  /** Cancel a queued or running job; refunded once. Free. */
  cancelJob(jobId: string): Promise<AiWaveResponse> {
    return this.call("POST", `${ProductShotApi.BASE}/jobs/${jobId}/cancel`);
  }

  /**
   * Poll until the job succeeds.
   * @throws AiWaveJobError when it failed or was cancelled.
   * @throws JobTimeoutError when it did not finish within `maxWait` (it keeps running).
   */
  waitForJob(jobId: string, options: WaitOptions = {}): Promise<AiWaveJob> {
    return this.poll(`${ProductShotApi.BASE}/jobs/${jobId}`, jobId, JOB_TERMINAL, "Product Shot job", options, {
      pollInterval: 3_000,
      maxWait: 300_000,
    });
  }

  /** Your saved presets. */
  presets(): Promise<AiWaveResponse> {
    return this.call("GET", `${ProductShotApi.BASE}/presets`);
  }

  /** Save a preset. Free. */
  createPreset(options: {
    name: string;
    prompt?: string;
    params?: Record<string, unknown>;
    kind?: "studio" | "lifestyle" | "seasonal" | "custom";
  }): Promise<AiWaveResponse> {
    return this.call("POST", `${ProductShotApi.BASE}/presets`, body(options));
  }

  /** Delete a saved preset. Free. */
  deletePreset(presetId: string): Promise<AiWaveResponse> {
    return this.call("DELETE", `${ProductShotApi.BASE}/presets/${presetId}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Video edit by chat
// ─────────────────────────────────────────────────────────────────────────────

export interface VideoEditSessionOptions {
  /** `videos/<your user id>/...` or `photos/<your user id>/...` */
  sourcePath: string;
  durationS: number;
  width: number;
  height: number;
  fps?: number;
  title?: string;
}

export interface VideoEditTurnOptions {
  /** What to change, in plain language (Polish or English). */
  instruction: string;
  /** The part to edit; required for edits, not for extensions. */
  selection?: ClipSelection;
  /** Seconds to add when the instruction extends the clip. */
  extendSeconds?: number;
  audio?: "original" | "edited";
  /** `true` when the quote says `likeness_ack_required`. */
  likenessAck?: boolean;
  requestId?: string;
}

/**
 * `/v1/aiwave/video-edit`: edit or extend a clip with plain-language instructions. A session is a
 * conversation about one clip; each turn is one instruction and yields a new version (the head).
 * `undo` / `revert` move the head without a charge.
 */
export class VideoEditApi extends Namespace {
  private static readonly BASE = "/v1/aiwave/video-edit";

  /** Limits, public route names, price multipliers, the AI-generation disclosure, whether you may pay with credits. Free. */
  config(): Promise<AiWaveResponse> {
    return this.call("GET", `${VideoEditApi.BASE}/config`);
  }

  /** Start a session on one of your clips. Free. */
  createSession(options: VideoEditSessionOptions): Promise<AiWaveResponse> {
    return this.call(
      "POST",
      `${VideoEditApi.BASE}/sessions`,
      body({
        source_path: options.sourcePath,
        clip: body({
          duration_s: options.durationS,
          width: options.width,
          height: options.height,
          fps: options.fps,
        }),
        title: options.title,
      })
    );
  }

  sessions(options: { limit?: number } = {}): Promise<AiWaveResponse> {
    return this.call("GET", `${VideoEditApi.BASE}/sessions`, undefined, { limit: options.limit ?? 20 });
  }

  /** The session, its head clip and every turn with status and ETA. */
  getSession(sessionId: string): Promise<AiWaveResponse> {
    return this.call("GET", `${VideoEditApi.BASE}/sessions/${sessionId}`);
  }

  /** Archive a session (the outputs stay in your storage). Free. */
  archiveSession(sessionId: string): Promise<AiWaveResponse> {
    return this.call("DELETE", `${VideoEditApi.BASE}/sessions/${sessionId}`);
  }

  private turnBody(o: VideoEditTurnOptions): Record<string, unknown> {
    return body({
      instruction: o.instruction,
      selection: selectionBody(o.selection),
      extend_seconds: o.extendSeconds,
      audio: o.audio,
      likeness_ack: o.likenessAck,
    });
  }

  /** The intent, the route that will run, billable seconds, price, how you pay, availability, ETA. Never charges. */
  quote(sessionId: string, options: VideoEditTurnOptions): Promise<AiWaveResponse> {
    const { requestId: _ignored, ...rest } = options;
    return this.call("POST", `${VideoEditApi.BASE}/sessions/${sessionId}/quote`, this.turnBody(rest));
  }

  /**
   * One edit turn. Charged; refunded once if it fails or is cancelled. Returns
   * `{ turn: { turn_id, status, ... }, replayed, eta, quote, payment }`; collect it with
   * {@link VideoEditApi.waitForTurn}.
   */
  edit(sessionId: string, options: VideoEditTurnOptions): Promise<AiWaveResponse> {
    return this.call("POST", `${VideoEditApi.BASE}/sessions/${sessionId}/turns`, {
      ...this.turnBody(options),
      request_id: options.requestId ?? uuid(),
    });
  }

  /** Move the head to the version before the last applied edit. Free. */
  undo(sessionId: string): Promise<AiWaveResponse> {
    return this.call("POST", `${VideoEditApi.BASE}/sessions/${sessionId}/undo`);
  }

  /** Move the head to a delivered turn, or to the original clip (`turnId` omitted). Free. */
  revert(sessionId: string, turnId?: string): Promise<AiWaveResponse> {
    return this.call("POST", `${VideoEditApi.BASE}/sessions/${sessionId}/revert`, {
      turn_id: turnId ?? null,
    });
  }

  getTurn(turnId: string): Promise<AiWaveJob> {
    return this.call<AiWaveJob>("GET", `${VideoEditApi.BASE}/turns/${turnId}`);
  }

  /** Cancel a queued or running turn; refunded once. Free. */
  cancelTurn(turnId: string): Promise<AiWaveResponse> {
    return this.call("POST", `${VideoEditApi.BASE}/turns/${turnId}/cancel`);
  }

  /**
   * Poll until the turn succeeds; `result.url` is the new clip.
   * @throws AiWaveJobError when it failed or was cancelled.
   * @throws JobTimeoutError when it did not finish within `maxWait` (it keeps running).
   */
  waitForTurn(turnId: string, options: WaitOptions = {}): Promise<AiWaveJob> {
    return this.poll(`${VideoEditApi.BASE}/turns/${turnId}`, turnId, JOB_TERMINAL, "Video edit turn", options, {
      pollInterval: 5_000,
      maxWait: 900_000,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Music edits
// ─────────────────────────────────────────────────────────────────────────────

export interface MusicSectionOptions {
  /** `audio/<id>/...`, `photos/<id>/...` or `videos/<id>/...` */
  sourcePath: string;
  sourceDurationS: number;
  startS: number;
  endS: number;
  /** Plain-language change, at most `config().limits.max_instruction_chars` characters. */
  instruction: string;
  /** Words sung in the section; without them the new section is instrumental. */
  lyrics?: string;
  style?: string;
  snapToBeat?: boolean;
  crossfadeMs?: number;
  seed?: number;
  /** The job this edit builds on (chains versions). */
  parentJobId?: string;
  requestId?: string;
}

export interface MusicLyricsOptions {
  sourcePath: string;
  sourceDurationS: number;
  line: { start_s: number; end_s: number; text?: string };
  newText: string;
  style?: string;
  crossfadeMs?: number;
  seed?: number;
  parentJobId?: string;
  requestId?: string;
}

export interface MusicSoundtrackOptions {
  /** `videos/<id>/...` or `photos/<id>/...` */
  sourcePath: string;
  /** Required for a video. */
  mediaDurationS?: number;
  startS?: number;
  durationS?: number;
  mood?: string;
  sfx?: boolean;
  keepOriginalAudio?: boolean;
  duckDb?: number;
  seed?: number;
  requestId?: string;
}

/**
 * `/v1/aiwave/music-edit`: re-do a section or a lyric line of a song, or score a video or image.
 * Everything outside the edited region stays sample-identical; apply an edit as a new version and
 * chain edits with `parentJobId`.
 */
export class MusicEditApi extends Namespace {
  private static readonly BASE = "/v1/aiwave/music-edit";

  /** Prices per operation, limits, stages, the AI disclosure, where each step runs. Free. */
  config(): Promise<AiWaveResponse> {
    return this.call("GET", `${MusicEditApi.BASE}/config`);
  }

  private sectionBody(o: MusicSectionOptions): Record<string, unknown> {
    return body({
      source_path: o.sourcePath,
      source_duration_s: o.sourceDurationS,
      start_s: o.startS,
      end_s: o.endS,
      instruction: o.instruction,
      lyrics: o.lyrics,
      style: o.style,
      snap_to_beat: o.snapToBeat,
      crossfade_ms: o.crossfadeMs,
      seed: o.seed,
      parent_job_id: o.parentJobId,
    });
  }

  private lyricsBody(o: MusicLyricsOptions): Record<string, unknown> {
    return body({
      source_path: o.sourcePath,
      source_duration_s: o.sourceDurationS,
      line: o.line,
      new_text: o.newText,
      style: o.style,
      crossfade_ms: o.crossfadeMs,
      seed: o.seed,
      parent_job_id: o.parentJobId,
    });
  }

  private soundtrackBody(o: MusicSoundtrackOptions): Record<string, unknown> {
    return body({
      source_path: o.sourcePath,
      media_duration_s: o.mediaDurationS,
      start_s: o.startS,
      duration_s: o.durationS,
      mood: o.mood,
      sfx: o.sfx,
      keep_original_audio: o.keepOriginalAudio,
      duck_db: o.duckDb,
      seed: o.seed,
    });
  }

  /** Price, availability, ETA and the normalised plan of a section edit. Never charges. */
  quoteSection(options: MusicSectionOptions): Promise<AiWaveResponse> {
    return this.call("POST", `${MusicEditApi.BASE}/section/quote`, this.sectionBody(options));
  }

  /**
   * Regenerate `[startS, endS]` of a song from a plain-language instruction. Charged. Returns
   * `{ job, replayed, eta, quote, payment }`; collect it with {@link MusicEditApi.waitForJob}.
   */
  editSection(options: MusicSectionOptions): Promise<AiWaveResponse> {
    return this.call("POST", `${MusicEditApi.BASE}/section`, {
      ...this.sectionBody(options),
      request_id: options.requestId ?? uuid(),
    });
  }

  /** Price, availability and ETA of a lyric-line edit. Never charges. */
  quoteLyrics(options: MusicLyricsOptions): Promise<AiWaveResponse> {
    return this.call("POST", `${MusicEditApi.BASE}/lyrics/quote`, this.lyricsBody(options));
  }

  /** Re-sing one line with new words, melody and voice kept. Charged. */
  editLyrics(options: MusicLyricsOptions): Promise<AiWaveResponse> {
    return this.call("POST", `${MusicEditApi.BASE}/lyrics`, {
      ...this.lyricsBody(options),
      request_id: options.requestId ?? uuid(),
    });
  }

  /** Price, availability and ETA of a soundtrack. Never charges. */
  quoteSoundtrack(options: MusicSoundtrackOptions): Promise<AiWaveResponse> {
    return this.call("POST", `${MusicEditApi.BASE}/soundtrack/quote`, this.soundtrackBody(options));
  }

  /** Music (and optionally sound effects, ducked under it) for a video or an image. Charged. */
  soundtrack(options: MusicSoundtrackOptions): Promise<AiWaveResponse> {
    return this.call("POST", `${MusicEditApi.BASE}/soundtrack`, {
      ...this.soundtrackBody(options),
      request_id: options.requestId ?? uuid(),
    });
  }

  /** Your history, newest first. */
  jobs(options: { op?: "section" | "lyrics" | "soundtrack"; limit?: number } = {}): Promise<AiWaveResponse> {
    return this.call("GET", `${MusicEditApi.BASE}/jobs`, undefined, {
      op: options.op,
      limit: options.limit ?? 20,
    });
  }

  getJob(jobId: string): Promise<AiWaveJob> {
    return this.call<AiWaveJob>("GET", `${MusicEditApi.BASE}/jobs/${jobId}`);
  }

  /** Cancel a queued or running job; refunded once. Free. */
  cancelJob(jobId: string): Promise<AiWaveResponse> {
    return this.call("POST", `${MusicEditApi.BASE}/jobs/${jobId}/cancel`);
  }

  /**
   * Poll until the job succeeds.
   * @throws AiWaveJobError when it failed or was cancelled.
   * @throws JobTimeoutError when it did not finish within `maxWait` (it keeps running).
   */
  waitForJob(jobId: string, options: WaitOptions = {}): Promise<AiWaveJob> {
    return this.poll(`${MusicEditApi.BASE}/jobs/${jobId}`, jobId, JOB_TERMINAL, "Music edit job", options, {
      pollInterval: 4_000,
      maxWait: 900_000,
    });
  }
}
