// Video timeline API: paths, wire format, idempotency, polling and error codes.
// Runs against the built package (`npm test` builds first) with a mocked fetch.
import test from "node:test";
import assert from "node:assert/strict";
import {
  FotoHub,
  FotoHubError,
  JobFailedError,
  JobTimeoutError,
  NotFoundError,
  RateLimitError,
  SaveConflictError,
  InsufficientFundsError,
} from "../dist/esm/index.js";

const ID = "11111111-1111-4111-8111-111111111111";
const JOB = "22222222-2222-4222-8222-222222222222";

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

/** A client whose fetch answers from `responses` (in order) and records every call. */
function harness(responses, config = {}) {
  const calls = [];
  const queue = [...responses];
  const fetch = async (url, init) => {
    const u = new URL(url);
    calls.push({
      url: u.pathname + u.search,
      method: init.method,
      headers: init.headers,
      body: init.body ? JSON.parse(init.body) : undefined,
    });
    const next = queue.length > 1 ? queue.shift() : queue[0];
    return typeof next === "function" ? next() : next.clone();
  };
  const client = new FotoHub({ apiKey: "fh_live_test", fetch, maxRetries: 0, ...config });
  // Keep polling tests fast.
  client.sleep = async () => {};
  return { client, calls };
}

test("createVideoProject: POST /v1/video/projects, camelCase body, template wrapped, idempotency key sent", async () => {
  const created = { projectId: ID, saveRev: 1, editorUrl: "https://fotohub.app/fh/editor/lite/" + ID, unplacedMedia: [] };
  const { client, calls } = harness([json(201, created)]);
  const out = await client.createVideoProject({
    title: "T",
    aspect: "9:16",
    media: [{ url: "https://example.com/a.mp4", name: "a" }],
    template: "tpl-1",
    placeMedia: "none",
  });
  assert.equal(out.projectId, ID);
  assert.equal(out.editorUrl, created.editorUrl);
  assert.deepEqual(out.unplacedMedia, []);
  const [c] = calls;
  assert.equal(c.method, "POST");
  assert.equal(c.url, "/v1/video/projects");
  assert.deepEqual(c.body, {
    title: "T",
    aspect: "9:16",
    media: [{ url: "https://example.com/a.mp4", name: "a" }],
    template: { id: "tpl-1" },
    placeMedia: "none",
  });
  assert.ok(c.headers["X-Idempotency-Key"], "an idempotency key is minted");
});

test("caller-supplied idempotencyKey wins on create/render/capture/auto-edit", async () => {
  const { client, calls } = harness([json(202, { jobId: JOB, status: "queued" })]);
  await client.createVideoProject({ title: "x", idempotencyKey: "k-create" });
  await client.renderVideoProject(ID, { idempotencyKey: "k-render" });
  await client.captureVideoProject(ID, { count: 3, idempotencyKey: "k-capture" });
  await client.autoEditVideoProject(ID, { idempotencyKey: "k-auto" });
  assert.deepEqual(
    calls.map((c) => c.headers["X-Idempotency-Key"]),
    ["k-create", "k-render", "k-capture", "k-auto"]
  );
});

test("one minted key is reused across retries of a single call", async () => {
  const { client, calls } = harness(
    [json(502, { error: { code: "timeline-unavailable", message: "x" } }), json(201, { projectId: ID })],
    { maxRetries: 1 }
  );
  await client.createVideoProject({ title: "x" });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].headers["X-Idempotency-Key"], calls[1].headers["X-Idempotency-Key"]);
});

test("list / get / delete / digest / lint / catalog: paths and methods", async () => {
  const { client, calls } = harness([json(200, {})]);
  await client.listVideoProjects({ limit: 5 });
  await client.getVideoProject(ID);
  await client.getVideoProject(ID, { includeDoc: true });
  await client.deleteVideoProject(ID);
  await client.digestVideoProject(ID, { clipIds: ["c1"], view: "clips" });
  await client.lintVideoProject(ID, { severity: "warn" });
  await client.getVideoOpsCatalog();
  await client.getVideoJob(JOB);
  assert.deepEqual(
    calls.map((c) => `${c.method} ${c.url}`),
    [
      "GET /v1/video/projects?limit=5",
      `GET /v1/video/projects/${ID}`,
      `GET /v1/video/projects/${ID}?include=doc`,
      `DELETE /v1/video/projects/${ID}`,
      `POST /v1/video/projects/${ID}/digest`,
      `POST /v1/video/projects/${ID}/lint`,
      "GET /v1/video/ops/catalog",
      `GET /v1/video/jobs/${JOB}`,
    ]
  );
  assert.deepEqual(calls[4].body, { clipIds: ["c1"], view: "clips" });
  assert.deepEqual(calls[5].body, { severity: "warn" });
});

test("applyVideoOps: POST .../ops with dryRun, expectedSaveRev, label (camelCase)", async () => {
  const result = { ok: false, rolledBack: true, violations: [{ code: "x" }], saveRev: 4, results: [], accepted: 0, rejected: 1 };
  const { client, calls } = harness([json(200, result)]);
  const ops = [{ op: "deleteClips", clipIds: ["a"] }];
  const out = await client.applyVideoOps(ID, { ops, dryRun: true, expectedSaveRev: 4, label: "cut" });
  assert.equal(out.rolledBack, true);
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].url, `/v1/video/projects/${ID}/ops`);
  assert.deepEqual(calls[0].body, { ops, dryRun: true, expectedSaveRev: 4, label: "cut" });
  assert.equal("dry_run" in calls[0].body, false);
});

test("capture and render start async jobs; capture result carries frames/sheets/missing", async () => {
  const done = {
    jobId: JOB,
    status: "completed",
    kind: "capture",
    frames: [{ index: 0, t: 1, actualT: 1, label: "0:01", sheet: 0, x: 0, y: 0, w: 320, h: 180 }],
    sheets: [{ url: "https://x/s.jpg", width: 640, height: 360 }],
    missing: [],
  };
  const { client, calls } = harness([
    json(202, { jobId: JOB, status: "queued" }),
    json(200, { jobId: JOB, status: "running", progress: 40 }),
    json(200, done),
  ]);
  const job = await client.captureVideoProject(ID, { times: [1], wait: true });
  assert.equal(calls[0].url, `/v1/video/projects/${ID}/capture`);
  assert.deepEqual(calls[0].body, { times: [1] });
  assert.equal(job.frames[0].actualT, 1);
  assert.equal(job.sheets[0].width, 640);
});

test("renderVideoProject({wait:true}) polls until completed", async () => {
  const seen = [];
  const { client, calls } = harness([
    json(202, { jobId: JOB, status: "queued", billedMinutes: 0.5 }),
    json(200, { jobId: JOB, status: "queued" }),
    json(200, { jobId: JOB, status: "running", progress: 50 }),
    json(200, { jobId: JOB, status: "completed", progress: 100, outputUrl: "https://x/out.mp4" }),
  ]);
  const orig = client.waitForVideoJob.bind(client);
  client.waitForVideoJob = (id, o) => orig(id, { ...o, onProgress: (j) => seen.push(j.status) });
  const job = await client.renderVideoProject(ID, { format: "mp4", resolution: "1080p", wait: true });
  assert.equal(job.outputUrl, "https://x/out.mp4");
  assert.deepEqual(calls[0].body, { format: "mp4", resolution: "1080p" });
  assert.equal(calls[0].url, `/v1/video/projects/${ID}/render`);
  assert.deepEqual(seen, ["queued", "running", "completed"]);
  assert.equal(calls.length, 4);
});

test("renderVideoProject without wait returns the queued job and does not poll", async () => {
  const { client, calls } = harness([json(202, { jobId: JOB, status: "queued" })]);
  const job = await client.renderVideoProject(ID);
  assert.equal(job.status, "queued");
  assert.equal(calls.length, 1);
});

test("waitForVideoJob: failed job throws JobFailedError whose code is the job reason", async () => {
  const { client } = harness([json(200, { jobId: JOB, status: "failed", error: "render failed", reason: "engine-error", refunded: true })]);
  await assert.rejects(
    () => client.waitForVideoJob(JOB),
    (e) => {
      assert.ok(e instanceof JobFailedError);
      assert.ok(e instanceof FotoHubError);
      assert.equal(e.code, "engine-error");
      assert.equal(e.jobId, JOB);
      assert.equal(e.details.refunded, true);
      return true;
    }
  );
});

test("waitForVideoJob: cancelled without reason falls back to job_failed", async () => {
  const { client } = harness([json(200, { jobId: JOB, status: "cancelled" })]);
  await assert.rejects(() => client.waitForVideoJob(JOB), (e) => e instanceof JobFailedError && e.code === "job_failed");
});

test("waitForVideoJob: JobTimeoutError after maxWaitMs", async () => {
  const { client } = harness([json(200, { jobId: JOB, status: "running" })]);
  await assert.rejects(
    () => client.waitForVideoJob(JOB, { intervalMs: 10, maxWaitMs: 5 }),
    (e) => e instanceof JobTimeoutError && e.jobId === JOB
  );
});

test("409 save-conflict throws SaveConflictError with currentSaveRev and is not retried", async () => {
  const { client, calls } = harness(
    [json(409, { error: { code: "save-conflict", message: "project changed since it was read", details: { currentSaveRev: 9 } } })],
    { maxRetries: 3 }
  );
  await assert.rejects(
    () => client.applyVideoOps(ID, { ops: [{ op: "insertGap" }], expectedSaveRev: 2 }),
    (e) => {
      assert.ok(e instanceof SaveConflictError);
      assert.equal(e.code, "save-conflict");
      assert.equal(e.statusCode, 409);
      assert.equal(e.currentSaveRev, 9);
      return true;
    }
  );
  assert.equal(calls.length, 1);
});

test("in-flight idempotent duplicate (409 idempotency-in-progress) is retried", async () => {
  const { client, calls } = harness(
    [json(409, { error: { code: "idempotency-in-progress", message: "in progress" } }), json(201, { projectId: ID })],
    { maxRetries: 1 }
  );
  const out = await client.createVideoProject({ title: "x" });
  assert.equal(out.projectId, ID);
  assert.equal(calls.length, 2);
});

test("timeline error codes survive on typed errors: media-not-found, media-unreadable, payment-required, rate-limited", async () => {
  const cases = [
    [404, "media-not-found", NotFoundError],
    [422, "media-unreadable", FotoHubError],
    [402, "payment-required", InsufficientFundsError],
    [403, "payment-required", FotoHubError],
    [429, "rate-limited", RateLimitError],
  ];
  for (const [status, code, Cls] of cases) {
    const { client } = harness([json(status, { error: { code, message: "m", details: { path: "/media/0" } } }, status === 429 ? { "retry-after": "180" } : {})]);
    await assert.rejects(
      () => client.createVideoProject({ title: "x" }),
      (e) => {
        assert.ok(e instanceof Cls, `${status} instanceof ${Cls.name}`);
        assert.equal(e.code, code);
        assert.equal(e.statusCode, status);
        if (status === 429) assert.equal(e.retryAfter, 180);
        return true;
      }
    );
  }
});

test("errors outside the timeline routes keep their legacy codes", async () => {
  const { client } = harness([json(404, { error: { code: "model-missing", message: "no" } })]);
  await assert.rejects(() => client.list3DModels(), (e) => e instanceof NotFoundError && e.code === "not_found");
});

test("analysis routes and transcription polling", async () => {
  const { client, calls } = harness([json(200, {})]);
  await client.detectVideoScenes({ projectId: ID, mediaId: "m1", minSceneDuration: 1 });
  await client.detectVideoSilence({ url: "https://e.com/a.mp3", noiseFloorDb: -40 });
  await client.detectVideoBeats({ url: "https://e.com/a.mp3" });
  await client.transcribeVideo({ url: "https://e.com/a.mp4", language: "auto" });
  await client.getVideoTranscription("job_12345678");
  assert.deepEqual(
    calls.map((c) => `${c.method} ${c.url}`),
    [
      "POST /v1/video/detect-scenes",
      "POST /v1/video/detect-silence",
      "POST /v1/video/detect-beats",
      "POST /v1/video/transcribe",
      "GET /v1/video/transcribe/job_12345678",
    ]
  );
  assert.deepEqual(calls[0].body, { projectId: ID, mediaId: "m1", minSceneDuration: 1 });
});

test("autoEditVideoProject: POST .../auto-edit with camelCase options, wait polls the job", async () => {
  const { client, calls } = harness([
    json(202, { jobId: JOB, status: "queued" }),
    json(200, { jobId: JOB, status: "completed", report: { done: [] } }),
  ]);
  const job = await client.autoEditVideoProject(ID, { style: "viral", aiBudgetUsd: 2, autoApply: false, mode: "cut", wait: true });
  assert.equal(calls[0].url, `/v1/video/projects/${ID}/auto-edit`);
  assert.deepEqual(calls[0].body, { style: "viral", aiBudgetUsd: 2, autoApply: false, mode: "cut" });
  assert.deepEqual(job.report, { done: [] });
  await client.applyVideoAutoEdit(ID, JOB);
  assert.equal(calls.at(-1).url, `/v1/video/projects/${ID}/auto-edit/${JOB}/apply`);
});

// ─── Fix round 1: retry safety, explicit-key wait, 409 codes, 422 details ─────

const OPS = [{ op: "insertGap" }];
const err = (status, code, details) => json(status, { error: { code, message: code, details } });

test("applyVideoOps without expectedSaveRev is never retried on 5xx", async () => {
  const { client, calls } = harness(
    [err(504, "timeline-timeout", { retryable: true }), json(200, { ok: true, saveRev: 3 })],
    { maxRetries: 3 }
  );
  await assert.rejects(() => client.applyVideoOps(ID, { ops: OPS }), (e) => e.statusCode === 504);
  assert.equal(calls.length, 1);
});

test("applyVideoOps without expectedSaveRev is not retried on a network failure or timeout", async () => {
  for (const failure of [new TypeError("fetch failed"), new DOMException("aborted", "AbortError")]) {
    const { client, calls } = harness(
      [() => Promise.reject(failure), json(200, { ok: true, saveRev: 3 })],
      { maxRetries: 3 }
    );
    await assert.rejects(() => client.applyVideoOps(ID, { ops: OPS }));
    assert.equal(calls.length, 1);
  }
});

test("applyVideoOps with expectedSaveRev is retried on 5xx (a replay would 409, not double-apply)", async () => {
  const { client, calls } = harness(
    [err(504, "timeline-timeout"), json(200, { ok: true, saveRev: 4 })],
    { maxRetries: 3 }
  );
  const out = await client.applyVideoOps(ID, { ops: OPS, expectedSaveRev: 3 });
  assert.equal(out.saveRev, 4);
  assert.equal(calls.length, 2);
});

test("applyVideoOps still retries 429 without expectedSaveRev (refused before it ran)", async () => {
  const { client, calls } = harness(
    [err(429, "rate-limited"), json(200, { ok: true, saveRev: 4 })],
    { maxRetries: 3 }
  );
  await client.applyVideoOps(ID, { ops: OPS });
  assert.equal(calls.length, 2);
});

test("a caller-supplied idempotencyKey still waits out 409 idempotency-in-progress", async () => {
  const { client, calls } = harness(
    [err(409, "idempotency-in-progress"), err(409, "idempotency-in-progress"), json(202, { jobId: JOB, status: "queued" })],
    { maxRetries: 3 }
  );
  const job = await client.renderVideoProject(ID, { idempotencyKey: "k-stable" });
  assert.equal(job.jobId, JOB);
  assert.equal(calls.length, 3);
  assert.deepEqual(
    calls.map((c) => c.headers["X-Idempotency-Key"]),
    ["k-stable", "k-stable", "k-stable"]
  );
});

test("409 project-limit / draft-limit / save-conflict on a keyed call are not retried", async () => {
  for (const code of ["project-limit", "draft-limit", "save-conflict"]) {
    const { client, calls } = harness([err(409, code)], { maxRetries: 3 });
    await assert.rejects(() => client.createVideoProject({ title: "x" }), (e) => e.code === code);
    assert.equal(calls.length, 1, code);
  }
});

test("timeline 422 details are surfaced as `details`, not `fieldErrors`", async () => {
  const details = { errors: [{ path: "ops[0].op", message: "unknown op" }] };
  const { client } = harness([err(422, "invalid-ops", details)]);
  await assert.rejects(
    () => client.applyVideoOps(ID, { ops: OPS }),
    (e) => {
      assert.equal(e.code, "invalid-ops");
      assert.deepEqual(e.details.errors, details.errors);
      assert.equal(e.fieldErrors, undefined);
      assert.equal(e.details.fieldErrors, undefined);
      return true;
    }
  );
});

test("capture and auto-edit honour intervalMs when waiting", async () => {
  const sleeps = [];
  for (const start of [
    (c) => c.captureVideoProject(ID, { count: 2, wait: true, intervalMs: 77 }),
    (c) => c.autoEditVideoProject(ID, { wait: true, intervalMs: 77 }),
  ]) {
    const { client } = harness([
      json(202, { jobId: JOB, status: "queued" }),
      json(200, { jobId: JOB, status: "running" }),
      json(200, { jobId: JOB, status: "completed" }),
    ]);
    client.sleep = async (ms) => void sleeps.push(ms);
    await start(client);
  }
  assert.deepEqual(sleeps, [77, 77]);
});

// ─── Fix round 2: legacy (non-timeline) in-flight 409 keeps waiting ───────────

const LEGACY_409 = () =>
  json(409, {
    detail:
      "A request with this X-Idempotency-Key is already in progress. Retry shortly to receive its result; the operation is charged once.",
  });

test("legacy code-less {detail} 409 on /v1/ai/generate/* is retried with the same key", async () => {
  const image = { images: [{ url: "https://x/i.png" }] };
  const { client, calls } = harness([LEGACY_409(), LEGACY_409(), json(200, image)], { maxRetries: 3 });
  await client.generateImage({ prompt: "cat", model: "seedream-5-0-260128" });
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, "/v1/ai/generate/image");
  const keys = new Set(calls.map((c) => c.headers["X-Idempotency-Key"] ?? c.headers["x-idempotency-key"]));
  assert.equal(keys.size, 1);
  assert.ok([...keys][0]);
});

test("legacy 409 gives up after maxRetries", async () => {
  const { client, calls } = harness([LEGACY_409()], { maxRetries: 2 });
  await assert.rejects(() => client.generateImage({ prompt: "cat", model: "seedream-5-0-260128" }), (e) => e.statusCode === 409);
  assert.equal(calls.length, 3);
});

test("video route: only idempotency-in-progress is retried, a code-less 409 is not", async () => {
  const { client, calls } = harness([LEGACY_409()], { maxRetries: 3 });
  await assert.rejects(() => client.createVideoProject({ title: "x" }), (e) => e.statusCode === 409);
  assert.equal(calls.length, 1);
});
