// 1.13.0: typed price / URL / pricing errors, Kling `mode`, Upscale Pro, AI video, IDA Q Image 2.
// `npm test` compiles the sources to .test-build/ and runs this file with node:test; no network.
// Bodies mirror what api-server sends (`{"detail": {...}}`, FastAPI default).
import test from "node:test";
import assert from "node:assert/strict";
import {
  FotoHub,
  FotoHubError,
  PermissionError,
  PriceChangedError,
  PricingNotConfiguredError,
  RateLimitError,
  ServerError,
  UrlBlockedError,
  ValidationError,
  AiWaveJobError,
  UpscaleProApi,
  AiVideoApi,
} from "../.test-build/index.js";
import { readFileSync } from "node:fs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const JID = "5b0c9a52-5d1e-4f3e-9f3a-70d0c0a1e0b1";

/** A client whose fetch answers from a queue and records every call; sleeps are instant. */
function make(maxRetries = 0) {
  const calls = [];
  const queue = [];
  let fallback = [200, {}];
  const fetch = async (url, init) => {
    const u = new URL(url);
    calls.push({
      method: init.method,
      path: u.pathname,
      query: Object.fromEntries(u.searchParams),
      body: init.body ? JSON.parse(init.body) : undefined,
      headers: init.headers,
    });
    const [status, payload, headers] = queue.length ? queue.shift() : fallback;
    return new Response(JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json", ...(headers ?? {}) },
    });
  };
  const client = new FotoHub({ apiKey: "fh_test_key", baseUrl: "https://api.test", fetch, maxRetries });
  client.sleep = async () => {};
  return {
    client,
    calls,
    last: () => calls[calls.length - 1],
    reply: (...answers) => queue.push(...answers),
    always: (answer) => (fallback = answer),
  };
}

async function rejects(promise) {
  try {
    await promise;
  } catch (e) {
    return e;
  }
  assert.fail("expected a rejection");
}

const fastWait = { pollInterval: 1, maxWait: 5_000 };

// ── version ─────────────────────────────────────────────────────────────────

test("version is 1.13.0 everywhere", async () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
  const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url)));
  assert.equal(pkg.version, "1.13.0");
  assert.equal(lock.version, "1.13.0");
  assert.equal(lock.packages[""].version, "1.13.0");
  const t = make();
  await t.client.upscalePro.job(JID);
  assert.equal(t.last().headers["X-SDK-Version"], "1.13.0");
  assert.equal(t.last().headers["User-Agent"], "fotohub-sdk-node/1.13.0");
});

// ── typed errors ────────────────────────────────────────────────────────────

const UPSCALE_409 = {
  detail: {
    error: "price_changed",
    message: "The price changed since it was shown: this video is longer or larger than quoted. Check the new price. Your wallet was not charged for this request.",
    quoted_credits: 12,
    current_credits: 18.5,
    billed_seconds: 20,
  },
};
const WAVE_409 = {
  detail: {
    error: "price_changed",
    quoted_credits: 3,
    current_credits: 4.2,
    message: "The price changed since it was shown. Check the new price; you were not charged.",
  },
};

test("409 price_changed from Upscale Pro is a PriceChangedError", async () => {
  const t = make();
  t.reply([409, UPSCALE_409]);
  const e = await rejects(t.client.upscalePro.video({ videoUrl: "https://example.com/c.mp4", quoteCredits: 12 }));
  assert.ok(e instanceof PriceChangedError && e instanceof FotoHubError);
  assert.equal(e.statusCode, 409);
  assert.equal(e.code, "price_changed");
  assert.equal(e.quotedCredits, 12);
  assert.equal(e.currentCredits, 18.5);
  assert.equal(e.billedSeconds, 20);
  assert.equal(e.charged, false);
  assert.match(e.message, /price changed/);
});

test("409 price_changed on a keyed /v1/video route is never retried", async () => {
  const t = make(3);
  t.reply([409, WAVE_409], [409, WAVE_409], [409, WAVE_409]);
  const e = await rejects(t.client.aiVideo.generate({ prompt: "a lighthouse", quoteCredits: 3 }));
  assert.ok(e instanceof PriceChangedError);
  assert.equal(e.billedSeconds, undefined);
  assert.equal(e.currentCredits, 4.2);
  assert.equal(t.calls.length, 1);
});

test("the code-less in-flight 409 on a keyed route is still waited out", async () => {
  const t = make(2);
  t.reply(
    [409, { detail: "A request with this X-Idempotency-Key is already in progress." }, { "retry-after": "5" }],
    [200, { job: { id: JID }, created: true }]
  );
  const out = await t.client.aiVideo.generate({ prompt: "a lighthouse" });
  assert.equal(out.job.id, JID);
  assert.equal(t.calls.length, 2);
});

for (const [code, text] of [
  ["url_blocked", "image_url must be a public https URL"],
  ["url_not_allowed", "image_url must be a file from your FOTOhub storage"],
]) {
  test(`400 ${code} is a UrlBlockedError (and a ValidationError)`, async () => {
    const t = make();
    t.reply([400, { detail: { error: code, field: "image_urls[2]", charged: false, message: `${text}. Your wallet was not charged for this request.` } }]);
    const e = await rejects(t.client.upscalePro.image({ imageUrl: "http://10.0.0.1/a.png" }));
    assert.ok(e instanceof UrlBlockedError && e instanceof ValidationError);
    assert.equal(e.statusCode, 400);
    assert.equal(e.code, code);
    assert.equal(e.field, "image_urls[2]");
    assert.equal(e.charged, false);
  });
}

test("503 PRICING_NOT_CONFIGURED is typed and not retried", async () => {
  const t = make(3);
  const body = { detail: { code: "PRICING_NOT_CONFIGURED", message: "This model has no video price configured. You were not charged." } };
  t.reply([503, body], [503, body], [503, body]);
  const e = await rejects(t.client.generateVideo({ prompt: "a fox", model: "kling-v3" }));
  assert.ok(e instanceof PricingNotConfiguredError && e instanceof ServerError);
  assert.equal(e.statusCode, 503);
  assert.equal(e.code, "PRICING_NOT_CONFIGURED");
  assert.equal(e.charged, false);
  assert.equal(t.calls.length, 1);
});

test("PRICING_NOT_CONFIGURED inside a 424 string is typed", async () => {
  const t = make();
  t.reply([424, { detail: '{"success":false,"error":"Brak ceny","code":"PRICING_NOT_CONFIGURED"} Your wallet was not charged for this request.' }]);
  const e = await rejects(t.client.generateVideo({ prompt: "a fox", model: "kling-v3" }));
  assert.ok(e instanceof PricingNotConfiguredError);
  assert.equal(e.statusCode, 424);
});

test("other 503s are still retried", async () => {
  const t = make(2);
  t.reply([503, { detail: "busy" }], [200, { video_url: "https://cdn.test/v.mp4", status: "completed" }]);
  const out = await t.client.generateVideo({ prompt: "a fox" });
  assert.equal(out.video_url, "https://cdn.test/v.mp4");
  assert.equal(t.calls.length, 2);
});

for (const [status, detail, cls] of [
  [429, { error: "The IDA Q queue is full. Try again shortly.", code: "QUEUE_FULL", charged: false, eta_seconds: 900, retry_after: 120 }, RateLimitError],
  [403, { error: "Your plan does not include IDA Q Image 2.", code: "PLAN_REQUIRED", charged: false }, PermissionError],
  [503, { error: "IDA Q Image 2 is temporarily unavailable.", code: "MODEL_DISABLED", charged: false }, ServerError],
  [409, { error: "This job_id is already used. Send a new job_id.", code: "JOB_ID_CONFLICT", charged: false }, FotoHubError],
  [422, { error: "num_images must be a whole number from 1 to 1 for HD / max.", code: "INVALID_REQUEST", charged: false }, ValidationError],
]) {
  test(`IDA Q Image 2 refusal ${status} ${detail.code} carries its code`, async () => {
    const t = make();
    t.reply([status, { detail }]);
    const e = await rejects(t.client.generateIdaQ2({ prompt: "a poster", size_tier: "HD", preset: "max" }));
    assert.ok(e instanceof cls);
    assert.equal(e.code, detail.code);
    assert.equal(e.statusCode, status);
    if (status === 429) assert.equal(e.retryAfter, 120);
  });
}

test("503 MODEL_DISABLED is not retried", async () => {
  const t = make(3);
  const body = { detail: { error: "IDA Q Image 2 is temporarily unavailable.", code: "MODEL_DISABLED", charged: false } };
  t.reply([503, body], [503, body], [503, body]);
  await rejects(t.client.generateIdaQ2({ prompt: "a poster" }));
  assert.equal(t.calls.length, 1);
});

// ── generateVideo({ mode }) ────────────────────────────────────────────────

test("generateVideo sends mode only when set", async () => {
  const t = make();
  t.reply([200, { video_url: "https://cdn.test/a.mp4" }], [200, { video_url: "https://cdn.test/b.mp4" }]);
  await t.client.generateVideo({ prompt: "a fox", model: "kling-v3", mode: "pro", duration: 10 });
  assert.equal(t.last().body.mode, "pro");
  await t.client.generateVideo({ prompt: "a fox" });
  assert.ok(!("mode" in t.last().body));
});

// ── Upscale Pro ─────────────────────────────────────────────────────────────

test("upscalePro is exported and quote sends only what was set", async () => {
  const t = make();
  assert.ok(t.client.upscalePro instanceof UpscaleProApi);
  t.reply([200, { available: true, credits: 12 }]);
  const q = await t.client.upscalePro.quote({ kind: "video", width: 1280, height: 720, scale: 2, fps: 30, seconds: 18 });
  assert.equal(q.credits, 12);
  assert.equal(t.last().method, "POST");
  assert.equal(t.last().path, "/v1/upscale/pro/quote");
  assert.deepEqual(t.last().body, { kind: "video", width: 1280, height: 720, scale: 2, fps: 30, seconds: 18 });
  await t.client.upscalePro.quote({ kind: "image", width: 800, height: 600 });
  assert.deepEqual(t.last().body, { kind: "image", width: 800, height: 600 });
});

test("upscalePro.image / video bodies (no request_id: the route has none)", async () => {
  const t = make();
  t.reply([200, { status: "succeeded" }], [202, { job_id: JID, status: "queued" }]);
  await t.client.upscalePro.image({ imageUrl: "https://example.com/a.png", scale: 3, wait: false, clientRef: { sku: "A1" } });
  assert.equal(t.last().path, "/v1/upscale/pro/image");
  assert.deepEqual(t.last().body, { image_url: "https://example.com/a.png", scale: 3, wait: false, client_ref: { sku: "A1" } });
  const out = await t.client.upscalePro.video({ videoUrl: "https://example.com/c.mp4", startSeconds: 2, maxSeconds: 10, quoteCredits: 12 });
  assert.equal(out.job_id, JID);
  assert.equal(t.last().path, "/v1/upscale/pro/video");
  assert.deepEqual(t.last().body, { video_url: "https://example.com/c.mp4", start_seconds: 2, max_seconds: 10, quote_credits: 12 });
});

test("upscalePro.video is not replayed after a 5xx", async () => {
  const t = make(3);
  t.reply([502, { detail: "bad gateway" }], [202, { job_id: JID }]);
  const e = await rejects(t.client.upscalePro.video({ videoUrl: "https://example.com/c.mp4" }));
  assert.ok(e instanceof ServerError);
  assert.equal(t.calls.length, 1);
});

test("upscalePro jobs / job / cancel / waitForJob", async () => {
  const t = make();
  await t.client.upscalePro.jobs({ active: true, kind: "video" });
  assert.equal(t.last().path, "/v1/upscale/pro/jobs");
  assert.deepEqual(t.last().query, { active: "true", kind: "video" });
  await t.client.upscalePro.jobs();
  assert.deepEqual(t.last().query, {});
  await t.client.upscalePro.job(JID);
  assert.equal(t.last().path, `/v1/upscale/pro/jobs/${JID}`);
  await t.client.upscalePro.cancel(JID);
  assert.equal(t.last().method, "POST");
  assert.equal(t.last().path, `/v1/upscale/pro/jobs/${JID}/cancel`);
  t.reply([200, { job_id: JID, status: "running" }], [200, { job_id: JID, status: "succeeded", result: { url: "u" } }]);
  const done = await t.client.upscalePro.waitForJob(JID, fastWait);
  assert.equal(done.result.url, "u");
  t.reply([200, { job_id: JID, status: "failed", error: "The upscale failed.", refunded: true }]);
  const e = await rejects(t.client.upscalePro.waitForJob(JID, fastWait));
  assert.ok(e instanceof AiWaveJobError);
  assert.equal(e.job.refunded, true);
});

// ── AI video ────────────────────────────────────────────────────────────────

test("aiVideo.generate body: fixed model, minted request_id, only set fields", async () => {
  const t = make();
  assert.ok(t.client.aiVideo instanceof AiVideoApi);
  t.reply([200, { job: { id: JID, status: "queued" }, created: true }]);
  const out = await t.client.aiVideo.generate({ prompt: "a lighthouse at dusk", quoteCredits: 3 });
  assert.equal(out.job.id, JID);
  assert.equal(t.last().path, "/v1/video/generations");
  const b = t.last().body;
  assert.equal(b.model, "fotohub-motion-audio");
  assert.equal(b.quote_credits, 3);
  assert.match(b.request_id, UUID);
  assert.deepEqual(Object.keys(b).sort(), ["model", "prompt", "quote_credits", "request_id"]);
});

test("aiVideo.generate keeps the caller's requestId and image", async () => {
  const t = make();
  const rid = "0c9d3f0e-6a7b-4c1e-9b8a-3e5f2a1d7c60";
  await t.client.aiVideo.generate({ prompt: "x", image: "photos/u1/f.jpg", seed: 7, requestId: rid });
  assert.equal(t.last().body.request_id, rid);
  assert.equal(t.last().body.image, "photos/u1/f.jpg");
  assert.equal(t.last().body.seed, 7);
});

test("aiVideo.avatar and dub bodies", async () => {
  const t = make();
  const consent = { subject: "self", version: "2026-10-05.1", locale: "en" };
  await t.client.aiVideo.avatar({ portrait: "photos/u1/me.jpg", consent, mode: "script", script: "Hello", language: "en", voiceConsent: true, quoteCredits: 2.5 });
  assert.equal(t.last().path, "/v1/video/avatar");
  let b = t.last().body;
  assert.deepEqual(b.consent, consent);
  assert.equal(b.portrait, "photos/u1/me.jpg");
  assert.equal(b.script, "Hello");
  assert.equal(b.voice_consent, true);
  assert.equal(b.quote_credits, 2.5);
  assert.match(b.request_id, UUID);
  assert.ok(!("audio" in b));
  await t.client.aiVideo.dub({ source: "videos/u1/talk.mp4", languages: ["de", "en"], glossary: ["FOTOhub"], sourceLanguage: "pl", quoteCredits: 9 });
  assert.equal(t.last().path, "/v1/video/dub");
  b = t.last().body;
  assert.deepEqual(b.languages, ["de", "en"]);
  assert.equal(b.source_language, "pl");
  assert.equal(b.quote_credits, 9);
  assert.match(b.request_id, UUID);
  assert.ok(!("review" in b) && !("voice_consent" in b));
});

test("aiVideo.get and waitForJob", async () => {
  const t = make();
  await t.client.aiVideo.get(JID);
  assert.equal(t.last().method, "GET");
  assert.equal(t.last().path, `/v1/video/generations/${JID}`);
  t.reply([200, { id: JID, status: "running" }], [200, { id: JID, status: "succeeded", result: { assets: [{ url: "u" }] } }]);
  const done = await t.client.aiVideo.waitForJob(JID, fastWait);
  assert.equal(done.result.assets[0].url, "u");
  t.reply([200, { id: JID, status: "failed", error: { code: "render_failed", message: "It failed." }, refunded: true }]);
  const e = await rejects(t.client.aiVideo.waitForJob(JID, fastWait));
  assert.ok(e instanceof AiWaveJobError);
  assert.match(e.message, /It failed\./);
});

// ── IDA Q Image 2 ───────────────────────────────────────────────────────────

test("generateIdaQ2 submits with a minted job_id and polls the ida-q-image-2 route", async () => {
  const t = make();
  t.reply(
    [202, { model: "ida-q-image-2", job_id: JID, status: "queued", cost_usd: 0.04, billing: { cost_usd: 0.04 } }],
    [200, { job_id: JID, status: "running", progress: 40 }],
    [200, { job_id: JID, status: "completed", images: ["https://cdn.test/1.png"], metadata: { model: "ida-q-image-2" }, result: { seed: 3 } }]
  );
  const out = await t.client.generateIdaQ2({
    prompt: "a typographic poster",
    size_tier: "1K",
    preset: "fast",
    num_images: 2,
    aspect_ratio: "4:5",
    style: "poster",
    transparent: false,
    poll_interval_seconds: 0.001,
  });
  const first = t.calls[0];
  assert.equal(first.path, "/v1/ai/generate/image");
  assert.equal(first.body.model, "ida-q-image-2");
  assert.equal(first.body.size_tier, "1K");
  assert.equal(first.body.preset, "fast");
  assert.equal(first.body.num_images, 2);
  assert.equal(first.body.transparent, false);
  assert.match(first.body.job_id, UUID);
  assert.equal(t.calls[1].path, `/v1/ai/generate/image/ida-q-image-2/${JID}`);
  assert.deepEqual(out.images, ["https://cdn.test/1.png"]);
  assert.equal(out.cost_usd, 0.04);
  assert.equal(out.job_id, JID);
  assert.equal(out.result.seed, 3);
});

test("generateIdaQ2 defaults and a failed job", async () => {
  const t = make();
  t.reply(
    [202, { job_id: JID, status: "queued" }],
    [200, { job_id: JID, status: "failed", error: "Blocked by the safety filter.", error_code: "SAFETY_BLOCKED" }]
  );
  const e = await rejects(t.client.generateIdaQ2({ prompt: "x", job_id: JID, poll_interval_seconds: 0.001 }));
  assert.equal(t.calls[0].body.job_id, JID);
  assert.equal(t.calls[0].body.size_tier, "1K");
  assert.equal(t.calls[0].body.preset, "balanced");
  assert.equal(t.calls[0].body.aspect_ratio, "1:1");
  assert.ok(e instanceof FotoHubError);
  assert.equal(e.code, "SAFETY_BLOCKED");
});
