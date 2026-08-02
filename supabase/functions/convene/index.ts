// convene — streams the four directors' opening statements in fixed order
// (VC → CTO → Growth → Devil's Advocate). Each director sees the full pitch,
// the founder's context, and everything said before them, and must engage the
// earlier speakers by name. SSE events:
//   turn_start { director } → token { delta }* → turn_end { director, text }
//   ... repeated per director ... → done { turns }

import { handleOptions, error } from "../_shared/cors.ts";
import { sseStream } from "../_shared/stream.ts";
import { streamChat } from "../_shared/openai.ts";
import {
  DIRECTORS,
  OPENING_ORDER,
  directorPrompt,
  formatTranscript,
} from "../_shared/directors.ts";
import type { Turn, StructuredFields } from "../_shared/types.ts";

function structuredContext(fields: Record<string, string> | null): string {
  if (!fields) return "";
  const lines = Object.entries(fields)
    .filter(([, v]) => typeof v === "string" && v.trim() !== "")
    .map(([k, v]) => `- ${k}: ${v.trim()}`);
  if (lines.length === 0) return "";
  return `Additional context from the founder:\n${lines.join("\n")}`;
}

Deno.serve(async (req: Request) => {
  const opts = handleOptions(req);
  if (opts) return opts;
  if (req.method !== "POST") return error("POST required", 405);

  let body: { pitch_one_liner?: unknown; structured_fields?: unknown };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  const pitch = typeof body.pitch_one_liner === "string" ? body.pitch_one_liner.trim() : "";
  if (!pitch) return error("pitch_one_liner is required", 400);

  const fields =
    body.structured_fields && typeof body.structured_fields === "object"
      ? (body.structured_fields as Record<string, string>)
      : null;

  return sseStream(async (writer) => {
    const turns: Turn[] = [];
    const extra = structuredContext(fields);

    for (const id of OPENING_ORDER) {
      const d = DIRECTORS[id];
      writer.send("turn_start", { director: id, step: "opening" });

      const previous = formatTranscript(turns);
      const priorLine = turns.length > 0
        ? "You have already heard the statements below. Engage them directly by name — agree, disagree, or build on their points."
        : "You are the first director to speak."

      let text = "";
      await streamChat(
        [
          { role: "system", content: directorPrompt(id) },
          {
            role: "user",
            content: [
              `The founder is presenting this idea to the board:`,
              ``,
              `Pitch: ${pitch}`,
              extra ? `\n${extra}` : "",
              ``,
              `Prior discussion:`,
              previous,
              ``,
              priorLine,
              ``,
              `You are ${d.name} (${d.title}). Deliver your opening statement now.`,
              `- Analyze the idea through your lens first, then state your opinion, then give exactly ONE recommendation.`,
              `- Ground every point in the pitch and the prior discussion — no generic advice.`,
              `- End with at most ONE direct question to the founder on its own line, prefixed exactly: "Question for the founder:" — or "None." if you don't need one.`,
            ].join("\n"),
          },
        ],
        (delta) => {
          text += delta;
          writer.send("token", { delta });
        },
        { maxTokens: 460, temperature: 0.85 },
      );

      writer.send("turn_end", { director: id, text });
      turns.push({ director: id, step: "opening", text });
    }

    writer.send("done", { turns });
  });
});
