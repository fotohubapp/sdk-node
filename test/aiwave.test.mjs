// AI Wave 1 namespaces: request shape (method, path, body), request ids, waiters, errors.
// `npm test` compiles the sources to .test-build/ and runs this file with node:test; no network.
import test from "node:test";
import assert from "node:assert/strict";
import {
  FotoHub,
  AiWaveJobError,
  JobTimeoutError,
  PermissionError,
  ValidationError,
  InsufficientFundsError,
} from "../.test-build/index.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CID = "0c9d3f0e-6a7b-4c1e-9b8a-3e5f2a1d7c60";
const JID = "5b0c9a52-5d1e-4f3e-9f3a-70d0c0a1e0b1";

/** A client whose fetch answers from a queue and records every call. */
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
  return {
    client,
    calls,
    last: () => calls[calls.length - 1],
    reply: (...answers) => queue.push(...answers),
    always: (answer) => (fallback = answer),
  };
}

// ── characters ──────────────────────────────────────────────────────────────

test("characters.create from photos sends the consent and a request id", async () => {
  const t = make();
  t.reply([200, { character: { id: CID }, job: { job_id: JID } }]);
  const consent = { subject: "self", version: "2026-10-05.1", locale: "en" };
  const out = await t.client.characters.create({
    name: "Ada",
    source: "photos",
    photos: ["photos/u1/a.jpg", "photos/u1/b.jpg"],
    consent,
  });
  assert.equal(out.job.job_id, JID);
  assert.equal(t.last().method, "POST");
  assert.equal(t.last().path, "/v1/characters");
  const b = t.last().body;
  assert.equal(b.kind, "face");
  assert.deepEqual(b.consent, consent);
  assert.match(b.request_id, UUID);
  assert.ok(!("prompt" in b) && !("seed" in b));
  assert.equal(t.last().headers.Authorization, "Bearer fh_test_key");
});

test("characters.create keeps the caller's requestId; quote sends none", async () => {
  const t = make();
  await t.client.characters.create({ name: "Max", source: "prompt", prompt: "a robot", kind: "non_face", requestId: "abcd1234-0000" });
  assert.equal(t.last().body.request_id, "abcd1234-0000");
  await t.client.characters.quote({ name: "Max", source: "prompt", prompt: "a robot", requestId: "ignored-1234" });
  assert.equal(t.last().path, "/v1/characters/quote");
  assert.ok(!("request_id" in t.last().body));
});

test("characters.generate defaults to the documented example model", async () => {
  const t = make();
  await t.client.characters.generate(CID, { prompt: "Ada on a bicycle", aspectRatio: "3:4" });
  assert.equal(t.last().path, `/v1/characters/${CID}/generations`);
  assert.equal(t.last().body.model, "seedream-5-0-260128");
  assert.equal(t.last().body.aspect_ratio, "3:4");
  assert.match(t.last().body.request_id, /^[A-Za-z0-9-]{8,64}$/);
});

test("characters free routes: verbs, paths, snake_case bodies, unset query dropped", async () => {
  const t = make();
  await t.client.characters.update(CID, { name: "Ada L.", excludeAssets: ["a1"] });
  assert.equal(t.last().method, "PATCH");
  assert.deepEqual(t.last().body, { name: "Ada L.", exclude_assets: ["a1"] });
  await t.client.characters.delete(CID);
  assert.equal(t.last().method, "DELETE");
  await t.client.characters.resolve(CID, "seedream-5-0-260128", { strength: 0.8 });
  assert.deepEqual(t.last().body, { model: "seedream-5-0-260128", strength: 0.8 });
  await t.client.characters.jobs(CID);
  assert.deepEqual(t.last().query, { limit: "20" });
  await t.client.characters.jobs(CID, { kind: "sheet" });
  assert.equal(t.last().query.kind, "sheet");
  await t.client.characters.cancelJob(JID);
  assert.equal(t.last().path, `/v1/characters/jobs/${JID}/cancel`);
});

test("waitForJob returns the succeeded view and reports progress", async () => {
  const t = make();
  t.reply([200, { status: "queued" }], [200, { status: "running" }], [200, { status: "succeeded", result: { url: "https://x/y.png" } }]);
  const seen = [];
  const view = await t.client.characters.waitForJob(JID, { pollInterval: 1, onProgress: (v) => seen.push(v.status) });
  assert.equal(view.result.url, "https://x/y.png");
  assert.deepEqual(seen, ["queued", "running", "succeeded"]);
});

test("waitForJob throws AiWaveJobError carrying the refund state", async () => {
  const t = make();
  t.reply([200, { status: "failed", error: "sheet_failed", refunded: true, refund_message: "You were not charged for this." }]);
  await assert.rejects(t.client.characters.waitForJob(JID, { pollInterval: 1 }), (e) => {
    assert.ok(e instanceof AiWaveJobError);
    assert.equal(e.job.refunded, true);
    assert.match(e.message, /sheet_failed/);
    assert.match(e.message, /not charged/);
    return true;
  });
});

test("waitForJob times out without cancelling the job", async () => {
  const t = make();
  t.always([200, { status: "running" }]);
  await assert.rejects(t.client.characters.waitForJob(JID, { pollInterval: 1, maxWait: 0 }), JobTimeoutError);
  assert.ok(!t.calls.some((c) => c.method === "POST"));
});

// ── product shot ────────────────────────────────────────────────────────────

test("productShot.create refuses a consent without its version, before any request", async () => {
  const t = make();
  assert.throws(
    () => t.client.productShot.create({ imagePath: "photos/u1/shoe.jpg", consentUsProcessing: true }),
    /consentVersion/
  );
  assert.equal(t.calls.length, 0);
});

test("productShot.create body", async () => {
  const t = make();
  await t.client.productShot.create({
    imagePath: "photos/u1/shoe.jpg",
    presetId: "studio_white",
    aspects: ["1:1", "4:5"],
    consentUsProcessing: true,
    consentVersion: "2026-10-04",
  });
  assert.equal(t.last().path, "/v1/aiwave/product-shot/jobs");
  const b = t.last().body;
  assert.equal(b.image_path, "photos/u1/shoe.jpg");
  assert.deepEqual(b.aspects, ["1:1", "4:5"]);
  assert.equal(b.consent_us_processing, true);
  assert.equal(b.consent_version, "2026-10-04");
  assert.match(b.request_id, UUID);
  assert.ok(!("tier" in b));
});

test("productShot without consent sends false and lets the server refuse (422)", async () => {
  const t = make();
  t.reply([422, { detail: { error: "consent_required", message: "Background removal runs in the US" } }]);
  await assert.rejects(t.client.productShot.create({ imagePath: "photos/u1/shoe.jpg", consentUsProcessing: false }), ValidationError);
  assert.equal(t.last().body.consent_us_processing, false);
});

test("productShot quote, presets, jobs", async () => {
  const t = make();
  await t.client.productShot.quote({ imagePath: "photos/u1/shoe.jpg", tier: "premium", sceneModel: "m1" });
  assert.deepEqual(t.last().body, { tier: "premium", scene_model: "m1", image_path: "photos/u1/shoe.jpg" });
  await t.client.productShot.createPreset({ name: "Autumn", prompt: "oak table", kind: "seasonal" });
  assert.equal(t.last().path, "/v1/aiwave/product-shot/presets");
  await t.client.productShot.deletePreset(CID);
  assert.equal(t.last().method, "DELETE");
  await t.client.productShot.listJobs({ requestId: CID });
  assert.equal(t.last().query.request_id, CID);
});

test("batches.create defaults source to api and needs the consent version", async () => {
  const t = make();
  const items = [{ image_path: "photos/u1/a.jpg", sku: "A-1" }, { image_url: "https://shop.test/b.jpg" }];
  assert.throws(() => t.client.productShot.batches.create({ items, consentUsProcessing: true }), /consentVersion/);
  await t.client.productShot.batches.create({ items, name: "Autumn", presetId: "studio_white", consentUsProcessing: true, consentVersion: "2026-10-04" });
  assert.equal(t.last().path, "/v1/aiwave/product-shot/batches");
  assert.equal(t.last().body.source, "api");
  assert.deepEqual(t.last().body.items, items);
  assert.match(t.last().body.request_id, UUID);
});

test("batch control routes", async () => {
  const t = make();
  const b = t.client.productShot.batches;
  await b.quote({ skus: 50, presetId: "studio_white" });
  assert.deepEqual(t.last().body, { preset_id: "studio_white", skus: 50 });
  await b.items(CID, { status: "failed", limit: 50 });
  assert.deepEqual(t.last().query, { status: "failed", limit: "50", offset: "0" });
  await b.retryFailed(CID);
  assert.ok(t.last().path.endsWith(`/${CID}/retry-failed`));
  await b.resume(CID, { acceptPrice: true });
  assert.deepEqual(t.last().body, { accept_price: true });
  await b.buildArchive(CID);
  assert.equal(t.last().method, "POST");
  await b.getArchive(CID);
  assert.equal(t.last().method, "GET");
  await b.cancel(CID);
  assert.ok(t.last().path.endsWith("/cancel"));
});

test("a batch that finished with failed images is returned, a paused one keeps waiting", async () => {
  const t = make();
  t.reply(
    [200, { status: "paused", pause: { reason: "insufficient_funds" } }],
    [200, { status: "active" }],
    [200, { status: "completed_with_errors", counts: { failed: 4, succeeded: 46 } }]
  );
  const view = await t.client.productShot.batches.wait(CID, { pollInterval: 1 });
  assert.equal(view.counts.failed, 4);
  assert.equal(t.calls.length, 3);
});

// ── video edit ──────────────────────────────────────────────────────────────

test("videoEdit session and turn", async () => {
  const t = make();
  await t.client.videoEdit.createSession({ sourcePath: "videos/u1/clip.mp4", durationS: 12.5, width: 1920, height: 1080, fps: 30 });
  assert.equal(t.last().path, "/v1/aiwave/video-edit/sessions");
  assert.deepEqual(t.last().body, { source_path: "videos/u1/clip.mp4", clip: { duration_s: 12.5, width: 1920, height: 1080, fps: 30 } });
  await t.client.videoEdit.edit(CID, { instruction: "make the sky a sunset", selection: [2, 6.5], likenessAck: true });
  assert.equal(t.last().path, `/v1/aiwave/video-edit/sessions/${CID}/turns`);
  assert.deepEqual(t.last().body.selection, { start_s: 2, end_s: 6.5 });
  assert.equal(t.last().body.likeness_ack, true);
  assert.match(t.last().body.request_id, UUID);
  assert.ok(!("extend_seconds" in t.last().body));
});

test("videoEdit accepts an object selection; a quote has no request id; extend has no selection", async () => {
  const t = make();
  await t.client.videoEdit.quote(CID, { instruction: "slow motion", selection: { startS: 1, endS: 3 }, requestId: "ignored-1234" });
  assert.equal(t.last().path, `/v1/aiwave/video-edit/sessions/${CID}/quote`);
  assert.deepEqual(t.last().body, { instruction: "slow motion", selection: { start_s: 1, end_s: 3 } });
  await t.client.videoEdit.edit(CID, { instruction: "continue the scene", extendSeconds: 5 });
  assert.ok(!("selection" in t.last().body));
  assert.equal(t.last().body.extend_seconds, 5);
});

test("videoEdit revert to the original sends an explicit null", async () => {
  const t = make();
  await t.client.videoEdit.revert(CID);
  assert.deepEqual(t.last().body, { turn_id: null });
  await t.client.videoEdit.revert(CID, JID);
  assert.deepEqual(t.last().body, { turn_id: JID });
  await t.client.videoEdit.undo(CID);
  assert.ok(t.last().path.endsWith("/undo"));
  await t.client.videoEdit.archiveSession(CID);
  assert.equal(t.last().method, "DELETE");
});

test("videoEdit.waitForTurn", async () => {
  const t = make();
  t.reply([200, { status: "running" }], [200, { status: "succeeded", result: { url: "https://x/v.mp4" } }]);
  const view = await t.client.videoEdit.waitForTurn(JID, { pollInterval: 1 });
  assert.equal(view.result.url, "https://x/v.mp4");
  assert.equal(t.last().path, `/v1/aiwave/video-edit/turns/${JID}`);
});

test("a 402 on a turn carries the amounts", async () => {
  const t = make();
  t.reply([402, { detail: { error: "insufficient_funds", message: "short", required_usd: 1.25, balance_usd: 0.5, shortfall_usd: 0.75 } }]);
  await assert.rejects(t.client.videoEdit.edit(CID, { instruction: "x", selection: [0, 1] }), (e) => {
    assert.ok(e instanceof InsufficientFundsError);
    assert.equal(e.requiredUsd, 1.25);
    assert.equal(e.shortfallUsd, 0.75);
    return true;
  });
});

// ── music edit ──────────────────────────────────────────────────────────────

test("musicEdit.editSection leaves server defaults alone", async () => {
  const t = make();
  await t.client.musicEdit.editSection({
    sourcePath: "audio/u1/song.flac", sourceDurationS: 180, startS: 60, endS: 80,
    instruction: "make the chorus more energetic", lyrics: "la la la", crossfadeMs: 100,
  });
  assert.equal(t.last().path, "/v1/aiwave/music-edit/section");
  const b = t.last().body;
  assert.equal(b.start_s, 60);
  assert.equal(b.crossfade_ms, 100);
  assert.ok(!("snap_to_beat" in b));
  assert.match(b.request_id, UUID);
});

test("musicEdit lyrics, soundtrack and jobs", async () => {
  const t = make();
  await t.client.musicEdit.editLyrics({
    sourcePath: "audio/u1/song.flac", sourceDurationS: 180,
    line: { start_s: 30, end_s: 34, text: "old words" }, newText: "new words", parentJobId: JID,
  });
  assert.equal(t.last().path, "/v1/aiwave/music-edit/lyrics");
  assert.equal(t.last().body.parent_job_id, JID);
  await t.client.musicEdit.quoteLyrics({ sourcePath: "audio/u1/song.flac", sourceDurationS: 180, line: { start_s: 30, end_s: 34 }, newText: "n" });
  assert.equal(t.last().path, "/v1/aiwave/music-edit/lyrics/quote");
  assert.ok(!("request_id" in t.last().body));
  await t.client.musicEdit.soundtrack({ sourcePath: "videos/u1/clip.mp4", mediaDurationS: 40, durationS: 30, mood: "calm" });
  assert.equal(t.last().path, "/v1/aiwave/music-edit/soundtrack");
  assert.ok(!("sfx" in t.last().body));
  await t.client.musicEdit.soundtrack({ sourcePath: "photos/u1/pic.jpg", sfx: false });
  assert.equal(t.last().body.sfx, false);
  await t.client.musicEdit.jobs({ op: "section" });
  assert.deepEqual(t.last().query, { op: "section", limit: "20" });
});

test("a failed music job throws with the engine's message and the refund note", async () => {
  const t = make();
  t.reply([200, { status: "failed", error: { code: "engine_failed", message: "The music engine could not finish this edit." }, refunded: true, refund_message: "You were not charged for this edit." }]);
  await assert.rejects(t.client.musicEdit.waitForJob(JID, { pollInterval: 1 }), (e) => {
    assert.ok(e instanceof AiWaveJobError);
    assert.match(e.message, /could not finish/);
    assert.match(e.message, /not charged/);
    return true;
  });
});

// ── common ──────────────────────────────────────────────────────────────────

test("feature_disabled is a permission error", async () => {
  const t = make();
  t.reply([403, { detail: { error: "feature_disabled", feature: "product_shot", reason: "tier_required" } }]);
  await assert.rejects(t.client.productShot.config(), PermissionError);
});

test("a retry of a charged call re-sends the same request id", async () => {
  const t = make(2);
  t.reply([503, { detail: { error: "backend_unavailable" } }], [200, { jobs: [{ job_id: JID }] }]);
  const realSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn, _ms, ...rest) => realSetTimeout(fn, 0, ...rest); // skip the backoff wait
  try {
    await t.client.productShot.create({ imagePath: "photos/u1/x.jpg", consentUsProcessing: true, consentVersion: "v" });
  } finally {
    globalThis.setTimeout = realSetTimeout;
  }
  assert.equal(t.calls.length, 2);
  assert.equal(t.calls[0].body.request_id, t.calls[1].body.request_id);
});
