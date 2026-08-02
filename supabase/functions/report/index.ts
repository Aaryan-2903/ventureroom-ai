// report — one synthesis pass over the full transcript + votes → structured
// report JSON. Regenerable: call again with an updated transcript.
// Returns JSON:
// { tally, executive_summary, strengths[], key_risks[], opportunities[],
//   next_steps[], metrics_to_track[] }

import { handleOptions, error, json } from "../_shared/cors.ts";
import { chatJSON } from "../_shared/openai.ts";
import { formatTranscript } from "../_shared/directors.ts";
import type { Turn } from "../_shared/types.ts";

interface VoteRecord {
  vote: "Proceed" | "Pivot" | "Kill";
  rationale: string;
}

function computeTally(votes: Record<string, VoteRecord> | null) {
  const tally = { proceed: 0, pivot: 0, kill: 0 };
  if (votes) {
    for (const v of Object.values(votes)) {
      if (v?.vote === "Proceed") tally.proceed++;
      else if (v?.vote === "Kill") tally.kill++;
      else tally.pivot++;
    }
  }
  return tally;
}

function asStringArray(value: unknown, max = 6): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim())
    .slice(0, max);
}

Deno.serve(async (req: Request) => {
  const opts = handleOptions(req);
  if (opts) return opts;
  if (req.method !== "POST") return error("POST required", 405);

  let body: { pitch?: unknown; transcript?: unknown; votes?: unknown };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  const transcript = Array.isArray(body.transcript) ? (body.transcript as Turn[]) : [];
  const pitch = typeof body.pitch === "string" ? body.pitch.trim() : "";
  const votes = body.votes && typeof body.votes === "object"
    ? (body.votes as Record<string, VoteRecord>)
    : null;

  const tally = computeTally(votes);
  const transcriptText = formatTranscript(transcript);

  try {
    const res = await chatJSON(
      [
        {
          role: "system",
          content:
            "You are the board secretary writing the official post-meeting report for the founder. Write at investor quality: specific, honest, and actionable — a partner at a good fund would sign this. Synthesize ONLY from the transcript and the directors' votes; never invent facts. Return strict JSON with these keys: executive_summary (string, 2-3 sentences — the neutral verdict and the single thing it hinges on), strengths (string[] of 3-5 items), key_risks (string[] of 3-5 items), opportunities (string[] of 2-4 items), next_steps (string[] of 3-5 items — each a concrete move the founder can start within a week, with an owner and a target where sensible), metrics_to_track (string[] of 3-5 items — the specific numbers, with rough targets, that would change the board's view). Every item must be grounded in what was actually said — name specifics from the pitch and discussion. No generic filler.",
        },
        {
          role: "user",
          content: [
            `Pitch: ${pitch}`,
            ``,
            `Board transcript:`,
            transcriptText,
            ``,
            `Directors' votes:`,
            votes
              ? Object.entries(votes)
                  .map(([id, v]) => `${id}: ${v?.vote} — ${v?.rationale}`)
                  .join("\n")
              : "(votes pending)",
            ``,
            `Write the report sections. Return only the JSON object.`,
          ].join("\n"),
        },
      ],
      { maxTokens: 1100, temperature: 0.5 },
    );

    const executiveSummary =
      typeof res.executive_summary === "string" && res.executive_summary.trim()
        ? res.executive_summary.trim()
        : "";

    return json({
      tally,
      executive_summary: executiveSummary,
      strengths: asStringArray(res.strengths),
      key_risks: asStringArray(res.key_risks),
      opportunities: asStringArray(res.opportunities),
      next_steps: asStringArray(res.next_steps),
      metrics_to_track: asStringArray(res.metrics_to_track),
    });
  } catch (err) {
    console.error("report synthesis failed", err);
    return error(
      err instanceof Error ? `Report generation failed: ${err.message}` : "Report generation failed",
      502,
    );
  }
});
