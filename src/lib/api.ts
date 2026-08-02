// Supabase Edge Function client: streaming SSE + JSON calls.
// Functions are deployed with verify_jwt=false, so no auth header is required.

const FUNCTIONS_URL = "https://iduiyybgfxlxrbnebrmz.supabase.co/functions/v1";

export interface StreamHandlers {
  onTurnStart?: (d: { director: string; step?: string; interjection?: boolean }) => void;
  onToken?: (delta: string) => void;
  onTurnEnd?: (d: { director: string; text: string; vote?: string; rationale?: string }) => void;
  onDone?: (data: Record<string, unknown>) => void;
  onError?: (message: string) => void;
}

/**
 * POST to an Edge Function and consume its SSE stream.
 * Events: turn_start / token / turn_end / done / error.
 */
export async function streamFunction(
  name: string,
  payload: unknown,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_URL}/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    handlers.onError?.(friendlyNetworkError(err));
    return;
  }

  if (!res.ok) {
    let message = `The meeting server returned ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* keep default */
    }
    handlers.onError?.(message);
    return;
  }

  if (!res.body) {
    handlers.onError?.("The meeting server closed the connection.");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;

  try {
    while (!done) {
      const { done: readerDone, value } = await reader.read();
      if (readerDone) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line.
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) >= 0) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        dispatchFrame(frame, handlers);
        done = frame.includes("event: done") || frame.includes('event: "done"');
      }
    }
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      handlers.onError?.(friendlyNetworkError(err));
    }
  }

  // Flush any trailing frame.
  if (buffer.trim()) dispatchFrame(buffer, handlers);
}

function dispatchFrame(frame: string, handlers: StreamHandlers): void {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    const t = line.trim();
    if (t.startsWith("event:")) {
      event = t.slice("event:".length).trim().replace(/^"|"$/g, "");
    } else if (t.startsWith("data:")) {
      dataLines.push(t.slice("data:".length).trim());
    }
  }
  if (dataLines.length === 0) return;

  let data: unknown;
  try {
    data = JSON.parse(dataLines.join("\n"));
  } catch {
    return;
  }
  const d = (data ?? {}) as Record<string, unknown>;

  switch (event) {
    case "turn_start":
      handlers.onTurnStart?.({
        director: String(d.director ?? ""),
        step: d.step ? String(d.step) : undefined,
        interjection: d.interjection === true,
      });
      break;
    case "token":
      if (typeof d.delta === "string") handlers.onToken?.(d.delta);
      break;
    case "turn_end":
      handlers.onTurnEnd?.({
        director: String(d.director ?? ""),
        text: String(d.text ?? ""),
        vote: d.vote ? String(d.vote) : undefined,
        rationale: d.rationale ? String(d.rationale) : undefined,
      });
      break;
    case "done":
      handlers.onDone?.(d);
      break;
    case "error":
      handlers.onError?.(String(d.message ?? "The meeting server had a problem."));
      break;
  }
}

/** POST JSON → JSON (report, save, get). Throws a friendly Error on failure. */
export async function jsonFunction<T>(name: string, payload: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_URL}/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Could not reach the meeting server — check your connection.");
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `The meeting server returned ${res.status}`;
    throw new Error(message);
  }
  return body as T;
}

function friendlyNetworkError(err: unknown): string {
  const name = (err as Error)?.name;
  if (name === "TimeoutError") return "The meeting server took too long — try again?";
  return "Could not reach the meeting server — check your connection.";
}
