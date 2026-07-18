import type { ChatStreamChunk } from "./types.js";
import { FotoHubError, NetworkError } from "./errors.js";

/**
 * Parses Server-Sent Events (SSE) from a ReadableStream into ChatStreamChunk objects.
 * Returns an AsyncIterable that yields parsed chunks as they arrive.
 *
 * @param response - The raw fetch Response with SSE body
 * @returns AsyncIterable of parsed ChatStreamChunk objects
 */
export async function* parseSSEStream(
  response: Response
): AsyncIterable<ChatStreamChunk> {
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
          // [DONE] signal — stream complete
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
 * Parse a single SSE event string into a ChatStreamChunk.
 * Returns null for the [DONE] signal, undefined for non-data events.
 */
function parseSSEEvent(event: string): ChatStreamChunk | null | undefined {
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
    const parsed = JSON.parse(data) as ChatStreamChunk;
    return parsed;
  } catch {
    throw new FotoHubError(
      `Failed to parse SSE data: ${data}`,
      "parse_error"
    );
  }
}

/**
 * ChatStream wraps an AsyncIterable<ChatStreamChunk> with convenience methods.
 * Implements AsyncIterable so it can be used directly in `for await...of` loops,
 * and provides helper methods for common patterns like collecting full text.
 *
 * @example
 * ```typescript
 * const stream = await client.chatStream({ messages: [...] });
 *
 * // Option 1: iterate over raw chunks
 * for await (const chunk of stream) {
 *   const content = chunk.choices[0]?.delta.content;
 *   if (content) process.stdout.write(content);
 * }
 *
 * // Option 2: collect full text
 * const text = await stream.toText();
 *
 * // Option 3: iterate text fragments only
 * for await (const fragment of stream.textStream()) {
 *   process.stdout.write(fragment);
 * }
 * ```
 */
export class ChatStream implements AsyncIterable<ChatStreamChunk> {
  private readonly source: AsyncIterable<ChatStreamChunk>;

  constructor(source: AsyncIterable<ChatStreamChunk>) {
    this.source = source;
  }

  [Symbol.asyncIterator](): AsyncIterator<ChatStreamChunk> {
    return this.source[Symbol.asyncIterator]();
  }

  /**
   * Collect all text content from the stream into a single string.
   * Consumes the entire stream.
   *
   * @returns The complete generated text
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
   * Yields only non-empty content strings.
   *
   * @returns AsyncIterable of text fragments
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
