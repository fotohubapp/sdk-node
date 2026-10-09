import type { ApiError } from "./types.js";

/**
 * Base error class for all FOTOhub SDK errors.
 * All SDK errors extend this class, making it easy to catch any SDK-related error.
 */
export class FotoHubError extends Error {
  public readonly code: string;
  public readonly statusCode: number | undefined;
  public readonly details: Record<string, unknown> | undefined;

  constructor(
    message: string,
    code: string = "unknown_error",
    statusCode?: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "FotoHubError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Create a FotoHubError from an API error response object.
   */
  static fromApiError(apiError: ApiError, statusCode?: number): FotoHubError {
    return new FotoHubError(
      apiError.message,
      apiError.code,
      statusCode,
      apiError.details
    );
  }
}

/**
 * Thrown when the API returns a 401 Unauthorized response.
 * Usually means the API key is missing, invalid, or expired.
 */
export class AuthenticationError extends FotoHubError {
  constructor(message: string = "Invalid or missing API key") {
    super(message, "authentication_error", 401);
    this.name = "AuthenticationError";
  }
}

/**
 * Thrown when the API returns a 403 Forbidden response.
 * The API key is valid but lacks the required permissions/scopes.
 */
export class PermissionError extends FotoHubError {
  constructor(
    message: string = "Insufficient permissions for this operation",
    code: string = "permission_error"
  ) {
    super(message, code, 403);
    this.name = "PermissionError";
  }
}

/**
 * Thrown when the API returns a 404 Not Found response.
 */
export class NotFoundError extends FotoHubError {
  constructor(
    message: string = "The requested resource was not found",
    code: string = "not_found",
    details?: Record<string, unknown>
  ) {
    super(message, code, 404, details);
    this.name = "NotFoundError";
  }
}

/**
 * Thrown when the API returns a 429 Too Many Requests response.
 * Check the `retryAfter` property for the recommended wait time.
 */
export class RateLimitError extends FotoHubError {
  public readonly retryAfter: number | undefined;

  constructor(
    message: string = "Rate limit exceeded",
    retryAfter?: number,
    code: string = "rate_limit_exceeded",
    details?: Record<string, unknown>
  ) {
    super(message, code, 429, details);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Thrown when the prepaid wallet cannot cover the operation (HTTP 402).
 *
 * The FOTOhub API is prepaid in USD. Credits exist only in the fotohub.app web
 * app and can never pay for an API call, so this error is about dollars: the
 * request was refused, **nothing was charged**, and the wallet needs topping up
 * at {@link InsufficientFundsError.topupUrl}.
 *
 * @example
 * ```typescript
 * try {
 *   await client.generateImage({ prompt: "a cat", model: "seedream-5-0-260128" });
 * } catch (err) {
 *   if (err instanceof InsufficientFundsError) {
 *     console.error(`Need $${err.shortfallUsd} more — top up: ${err.topupUrl}`);
 *   }
 * }
 * ```
 */
export class InsufficientFundsError extends FotoHubError {
  /** USD price of the refused request. */
  public readonly requiredUsd: number | undefined;
  /** USD wallet balance at the time of the refusal. */
  public readonly balanceUsd: number | undefined;
  /** The minimum top-up that would let this request through. */
  public readonly shortfallUsd: number | undefined;
  /** Where to add funds. */
  public readonly topupUrl: string | undefined;
  /** The operation that was refused, e.g. `generate_image:seedream-5-0-pro`. */
  public readonly operation: string | undefined;

  /**
   * Credits the operation would have cost.
   *
   * @deprecated Always `undefined` against a current server: the API has no
   * credits. Use {@link requiredUsd}. Removed in the next major version.
   */
  public readonly creditsRequired: number | undefined;
  /**
   * Credits available.
   *
   * @deprecated Always `undefined` against a current server. Use
   * {@link balanceUsd}. Removed in the next major version.
   */
  public readonly creditsAvailable: number | undefined;

  constructor(
    message: string = "Insufficient funds in your prepaid wallet",
    fields: {
      requiredUsd?: number;
      balanceUsd?: number;
      shortfallUsd?: number;
      topupUrl?: string;
      operation?: string;
      creditsRequired?: number;
      creditsAvailable?: number;
    } = {},
    code: string = "insufficient_funds"
  ) {
    super(message, code, 402, { ...fields });
    this.name = "InsufficientFundsError";
    this.requiredUsd = fields.requiredUsd;
    this.balanceUsd = fields.balanceUsd;
    this.shortfallUsd = fields.shortfallUsd;
    this.topupUrl = fields.topupUrl;
    this.operation = fields.operation;
    this.creditsRequired = fields.creditsRequired;
    this.creditsAvailable = fields.creditsAvailable;
  }

  /** Nothing was charged for a refused request. Always `false`. */
  public get charged(): boolean {
    return false;
  }
}

/**
 * @deprecated Renamed to {@link InsufficientFundsError} — the API is prepaid in
 * USD and has no credits. This alias is the SAME class, so existing
 * `catch (e) { if (e instanceof InsufficientCreditsError) }` code keeps working
 * and will also catch the new name. It is removed in the next major version.
 *
 * Note the `code` on a thrown error is now `insufficient_funds`, matching the
 * server. Code that compares `err.code === "insufficient_credits"` must be
 * updated; an `instanceof` check needs no change.
 */
export const InsufficientCreditsError = InsufficientFundsError;
/** @deprecated Use {@link InsufficientFundsError}. */
export type InsufficientCreditsError = InsufficientFundsError;

/**
 * Thrown when the API returns a 422 Unprocessable Entity response.
 * Usually means the request body failed validation.
 */
export class ValidationError extends FotoHubError {
  public readonly fieldErrors: Record<string, string[]> | undefined;

  constructor(
    message: string = "Request validation failed",
    fieldErrors?: Record<string, string[]>,
    code: string = "validation_error",
    details?: Record<string, unknown>,
    statusCode: number = 422
  ) {
    super(message, code, statusCode, { fieldErrors, ...details });
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Thrown when a request times out before receiving a response.
 */
export class TimeoutError extends FotoHubError {
  constructor(message: string = "Request timed out") {
    super(message, "timeout", undefined);
    this.name = "TimeoutError";
  }
}

/**
 * Thrown when a network error occurs (no response received).
 * This could be DNS failure, connection refused, etc.
 */
export class NetworkError extends FotoHubError {
  public readonly cause: Error | undefined;

  constructor(message: string = "Network error", cause?: Error) {
    super(message, "network_error", undefined);
    this.name = "NetworkError";
    this.cause = cause;
  }
}

/**
 * Thrown when the API returns a 5xx server error.
 */
export class ServerError extends FotoHubError {
  constructor(
    message: string = "Internal server error",
    statusCode: number = 500,
    code: string = "server_error",
    details?: Record<string, unknown>
  ) {
    super(message, code, statusCode, details);
    this.name = "ServerError";
  }
}

/**
 * Thrown when an async generation job (video, music) fails.
 */
export class JobFailedError extends FotoHubError {
  public readonly jobId: string;

  constructor(
    jobId: string,
    message: string = "Generation job failed",
    code: string = "job_failed",
    details?: Record<string, unknown>
  ) {
    super(message, code, undefined, { jobId, ...details });
    this.name = "JobFailedError";
    this.jobId = jobId;
  }
}

/**
 * Thrown when waiting for an async job exceeds the maximum wait time.
 */
export class JobTimeoutError extends FotoHubError {
  public readonly jobId: string;

  constructor(
    jobId: string,
    message: string = "Job timed out waiting for completion"
  ) {
    super(message, "job_timeout", undefined, { jobId });
    this.name = "JobTimeoutError";
    this.jobId = jobId;
  }
}

/**
 * Thrown when a webhook delivery or test fails.
 */
export class WebhookError extends FotoHubError {
  public readonly webhookId: string;

  constructor(
    webhookId: string,
    message: string = "Webhook delivery failed"
  ) {
    super(message, "webhook_error", undefined, { webhookId });
    this.name = "WebhookError";
    this.webhookId = webhookId;
  }
}

/**
 * Thrown on a 409 `save-conflict`: the project changed (in the editor, or by
 * another caller) after you read it. Re-read it, re-plan against
 * `currentSaveRev`, and retry with that value as `expectedSaveRev`.
 */
export class SaveConflictError extends FotoHubError {
  /** The project's current `saveRev`, when the server reported it. */
  public readonly currentSaveRev: number | undefined;

  constructor(
    message: string = "The project changed since it was read",
    details?: Record<string, unknown>
  ) {
    super(message, "save-conflict", 409, details);
    this.name = "SaveConflictError";
    const rev = details?.currentSaveRev;
    this.currentSaveRev = typeof rev === "number" ? rev : undefined;
  }
}

/** A number from an error body, or `undefined` (a string numeral counts; a boolean does not). */
function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

/**
 * Thrown on a 409 `price_changed`: the price moved away from the `quoteCredits` you sent.
 *
 * Sent by the routes that take `quote_credits` (Upscale Pro video, the AI video routes).
 * The start was refused **before anything was charged**: show {@link currentCredits} (or
 * quote again) and resend with the new figure. For the AI video routes keep the same
 * `requestId`.
 */
export class PriceChangedError extends FotoHubError {
  /** The `quote_credits` you sent. */
  public readonly quotedCredits: number | undefined;
  /** The price now, in the same unit. */
  public readonly currentCredits: number | undefined;
  /** Upscale Pro video only: the seconds the measured file is billed for. */
  public readonly billedSeconds: number | undefined;

  constructor(
    message: string = "The price changed since it was shown",
    details: Record<string, unknown> = {}
  ) {
    super(message, "price_changed", 409, details);
    this.name = "PriceChangedError";
    this.quotedCredits = num(details.quoted_credits);
    this.currentCredits = num(details.current_credits);
    this.billedSeconds = num(details.billed_seconds);
  }

  /** A refused start is never billed. Always `false`. */
  public get charged(): boolean {
    return false;
  }
}

/**
 * Thrown on a 400 `url_blocked`: a URL you passed was refused before any work.
 *
 * API-key callers must pass public `https://` URLs on the default port 443, without
 * credentials, whose host resolves to public addresses only. {@link field} names the
 * parameter (list items as `image_urls[2]`); the URL is never echoed back. Nothing was
 * charged. A subclass of {@link ValidationError}. `code` is `url_blocked` (or
 * `url_not_allowed` for browser-session callers).
 */
export class UrlBlockedError extends ValidationError {
  /** The request parameter that carried the refused URL. */
  public readonly field: string | undefined;
  /** `false`: the URL is checked before billing. */
  public readonly charged: boolean;

  constructor(
    message: string = "A URL in the request was refused",
    code: string = "url_blocked",
    details: Record<string, unknown> = {}
  ) {
    super(message, undefined, code, details, 400);
    this.name = "UrlBlockedError";
    this.field = typeof details.field === "string" ? details.field : undefined;
    this.charged = details.charged === true;
  }
}

/**
 * Thrown when the model has no price configured (`PRICING_NOT_CONFIGURED`).
 *
 * Refused before any money moved; never billed at a guessed price. Usually HTTP 503; when the
 * refusal comes from further down the pipeline the API answers 424 with the code inside the
 * message (also mapped here). Not retried: retrying cannot help until the price is configured.
 */
export class PricingNotConfiguredError extends ServerError {
  constructor(
    message: string = "This model has no price configured. You were not charged.",
    statusCode: number = 503,
    details?: Record<string, unknown>
  ) {
    super(message, statusCode, "PRICING_NOT_CONFIGURED", details);
    this.name = "PricingNotConfiguredError";
  }

  /** Always `false`. */
  public get charged(): boolean {
    return false;
  }
}
