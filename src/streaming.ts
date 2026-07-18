import type { ChatChunk } from "./types.js";
import { FotoHubError, NetworkError } from "./errors.js";

/**
 * Parses Server-Sent Events (SSE) from a ReadableStream into ChatChunk objects.
 * Returns an AsyncIterable that yields parsed chunks.
 */
export async function* parseSSEStream(
  response: Response
): AsyncIterable<ChatChunk> {
  if (!response.body) {
    throw new NetworkError("Response body is null — streaming not supported");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Process any remaining buffer
        if (buffer.trim()) {
          const chunk = parseSSEEvent(buffer);
          if (chunk) yield chunk;
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Split on double newline (SSE event separator)
      const events = buffer.split("\n\n");
      // Keep the last potentially incomplete event in the buffer
      buffer = events.pop() ?? "";

      for (const event of events) {
        if (!event.trim()) continue;

        const chunk = parseSSEEvent(event);
        if (chunk === null) {
          // [DONE] signal
          return;
        }
        if (chunk) {
          yield chunk;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Parse a single SSE event string into a ChatChunk.
 * Returns null for [DONE] signal, undefined for non-data events.
 */
function parseSSEEvent(event: string): ChatChunk | null | undefined {
  const lines = event.split("\n");
  let data = "";

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      data += line.slice(6);
    } else if (line.startsWith("data:")) {
      data += line.slice(5);
    }
    // Ignore event:, id:, retry: lines
  }

  if (!data) return undefined;

  // Check for stream termination
  if (data.trim() === "[DONE]") {
    return null;
  }

  try {
    const parsed = JSON.parse(data) as ChatChunk;
    return parsed;
  } catch {
    throw new FotoHubError(
      `Failed to parse SSE data: ${data}`,
      "parse_error"
    );
  }
}

/**
 * ChatStream wraps an AsyncIterable<ChatChunk> with convenience methods.
 * Provides both async iteration and helper methods for common patterns.
 */
export class ChatStream implements AsyncIterable<ChatChunk> {
  private readonly source: AsyncIterable<ChatChunk>;

  constructor(source: AsyncIterable<ChatChunk>) {
    this.source = source;
  }

  [Symbol.asyncIterator](): AsyncIterator<ChatChunk> {
    return this.source[Symbol.asyncIterator]();
  }

  /**
   * Collect all text content from the stream into a single string.
   */
  async toText(): Promise<string> {
    let text = "";
    for await (const chunk of this.source) {
      for (const choice of chunk.choices) {
        if (choice.delta.content) {
          text += choice.delta.content;
        }
      }
    }
    return text;
  }

  /**
   * Iterate over text fragments only (convenience over raw chunks).
   */
  async *textStream(): AsyncIterable<string> {
    for await (const chunk of this.source) {
      for (const choice of chunk.choices) {
        if (choice.delta.content) {
          yield choice.delta.content;
        }
      }
    }
  }
}
