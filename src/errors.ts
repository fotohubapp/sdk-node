import type { ApiError } from "./types.js";

/**
 * Base error class for all FOTOhub SDK errors.
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
 */
export class AuthenticationError extends FotoHubError {
  constructor(message: string = "Invalid or missing API key") {
    super(message, "authentication_error", 401);
    this.name = "AuthenticationError";
  }
}

/**
 * Thrown when the API returns a 403 Forbidden response.
 */
export class PermissionError extends FotoHubError {
  constructor(
    message: string = "Insufficient permissions for this operation"
  ) {
    super(message, "permission_error", 403);
    this.name = "PermissionError";
  }
}

/**
 * Thrown when the API returns a 404 Not Found response.
 */
export class NotFoundError extends FotoHubError {
  constructor(message: string = "The requested resource was not found") {
    super(message, "not_found", 404);
    this.name = "NotFoundError";
  }
}

/**
 * Thrown when the API returns a 429 Too Many Requests response.
 */
export class RateLimitError extends FotoHubError {
  public readonly retryAfter: number | undefined;

  constructor(message: string = "Rate limit exceeded", retryAfter?: number) {
    super(message, "rate_limit_exceeded", 429);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * Thrown when the user has insufficient credits for the operation.
 */
export class InsufficientCreditsError extends FotoHubError {
  public readonly creditsRequired: number | undefined;
  public readonly creditsAvailable: number | undefined;

  constructor(
    message: string = "Insufficient credits",
    creditsRequired?: number,
    creditsAvailable?: number
  ) {
    super(message, "insufficient_credits", 402, {
      creditsRequired,
      creditsAvailable,
    });
    this.name = "InsufficientCreditsError";
    this.creditsRequired = creditsRequired;
    this.creditsAvailable = creditsAvailable;
  }
}

/**
 * Thrown when the API returns a 422 Unprocessable Entity response.
 */
export class ValidationError extends FotoHubError {
  public readonly fieldErrors: Record<string, string[]> | undefined;

  constructor(
    message: string = "Request validation failed",
    fieldErrors?: Record<string, string[]>
  ) {
    super(message, "validation_error", 422, { fieldErrors });
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Thrown when a request times out.
 */
export class TimeoutError extends FotoHubError {
  constructor(message: string = "Request timed out") {
    super(message, "timeout", undefined);
    this.name = "TimeoutError";
  }
}

/**
 * Thrown when a network error occurs (no response received).
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
    statusCode: number = 500
  ) {
    super(message, "server_error", statusCode);
    this.name = "ServerError";
  }
}

/**
 * Thrown when a video generation job fails.
 */
export class JobFailedError extends FotoHubError {
  public readonly jobId: string;

  constructor(jobId: string, message: string = "Video generation job failed") {
    super(message, "job_failed", undefined, { jobId });
    this.name = "JobFailedError";
    this.jobId = jobId;
  }
}

/**
 * Thrown when waiting for a video job exceeds the maximum wait time.
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
