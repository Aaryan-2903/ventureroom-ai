// Server-Sent Events (SSE) streaming helper for Edge Functions.
// Pattern per Supabase docs: keep the isolate alive via EdgeRuntime.waitUntil
// while piping the upstream OpenAI stream into the response.

import { corsHeaders } from "./cors.ts";

export interface SSEWriter {
  send(event: string, data: unknown): void;
}

/**
 * Build a text/event-stream Response. The `produce` callback receives a writer
 * and must resolve when all events have been written; the stream then closes.
 * An "error" event is emitted if produce throws, then the stream closes.
 */
export function sseStream(produce: (writer: SSEWriter) => Promise<void>): Response {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });

  const writer: SSEWriter = {
    send(event: string, data: unknown) {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(encoder.encode(payload));
    },
  };

  // Fire-and-forget producer; EdgeRuntime.waitUntil keeps the isolate alive.
  const run = (async () => {
    try {
      await produce(writer);
    } catch (err) {
      console.error("sse producer error", err);
      try {
        writer.send("error", { message: err instanceof Error ? err.message : "Stream failed" });
      } catch {
        // stream already closed
      }
    } finally {
      try {
        controller.close();
      } catch {
        // already closed
      }
    }
  })();

  EdgeRuntime.waitUntil(run);

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
