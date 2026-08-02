// close — streams each director's final vote (Proceed / Pivot / Kill) with a
// one-line rationale grounded in the discussion, in fixed board order. After
// the votes, the neutral Board Secretary delivers a closing summary of the
// meeting. The streamed vote text is strictly formatted so votes can be parsed
// deterministically for the tally.
// SSE events:
//   turn_start { director } → token { delta }* → turn_end { director, text, vote, rationale }
//   ... per director ...
//   turn_start { director: secretary, step: summary } → token* → turn_end
//   done { turns, votes }

import { handleOptions, error } from "../_shared/cors.ts";
import { sseStream } from "../_shared/stream.ts";
import { streamChat } from "../_shared/openai.ts";
import {
  DIRECTORS,
  OPENING_ORDER,
  SECRETARY_PROMPT,
  directorPrompt,
  formatTranscript,
  type DirectorId,
} from "../_shared/directors.ts";
import type { Turn } from "../_shared/types.ts";

export type VoteOption = "Proceed" | "Pivot" | "Kill";

function parseVote(text: string): { vote: VoteOption; rationale: string } {
  const m = text.match(/Vote:\s*(Proceed|Pivot|Kill)/i);
  const vote: VoteOption = m ? (m[1] as VoteOption) : "Pivot";
  const rationale = text
    .replace(/Vote:\s*(Proceed|Pivot|Kill)/i, "")
    .replace(/^[\s\n:—–-]+/, "")
    .trim();
  return { vote, rationale: rationale || "The director declined to elaborate." };
}

Deno.serve(async (req: Request) => {
  const opts = handleOptions(req);
  if (opts) return opts;
  if (req.method !== "POST") return error("POST required", 405);

  let body: { pitch?: unknown; transcript?: unknown };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  const transcript = Array.isArray(body.transcript)
    ? (body.transcript as Turn[])
    : [];
  const pitch = typeof body.pitch === "string" ? body.pitch.trim() : "(the pitch under discussion)";
  const transcriptText = formatTranscript(transcript);

  return sseStream(async (writer) => {
    const turns: Turn[] = [];
    const votes: Partial<Record<DirectorId, { vote: VoteOption; rationale: string }>> = {};

    for (const id of OPENING_ORDER) {
      const d = DIRECTORS[id];
      writer.send("turn_start", { director: id, step: "vote" });

      let text = "";
      await streamChat(
        [
          {
            role: "system",
            content: `${directorPrompt(id)} The meeting is closing — give your final vote.`,
          },
          {
            role: "user",
            content: [
              `Pitch: ${pitch}`,
              ``,
              `Board transcript:`,
              transcriptText,
              ``,
              `Cast your vote based on the EVIDENCE in the discussion — not on generic criteria. Your rationale must name the specific point, risk, or metric that decides your vote.`,
              `Output in EXACTLY this format and nothing else:`,
              `Vote: <Proceed|Pivot|Kill>`,
              ``,
              `<one-line rationale, max 40 words, citing the specific evidence>`,
            ].join("\n"),
          },
        ],
        (delta) => {
          text += delta;
          writer.send("token", { delta });
        },
        { maxTokens: 140, temperature: 0.4 },
      );

      const parsed = parseVote(text);
      writer.send("turn_end", { director: id, text, ...parsed });
      turns.push({ director: id, step: "vote", text });
      votes[id] = parsed;
    }

    // Neutral Board Secretary summary — the close of the meeting.
    const secretary = DIRECTORS.secretary;
    writer.send("turn_start", { director: "secretary", step: "summary" });

    let summaryText = "";
    await streamChat(
      [
        { role: "system", content: SECRETARY_PROMPT },
        {
          role: "user",
          content: [
            `Pitch: ${pitch}`,
            ``,
            `Board transcript:`,
            transcriptText,
            ``,
            `The votes just cast:`,
            Object.entries(votes)
              .map(([id, v]) => `${DIRECTORS[id as DirectorId].name}: ${v?.vote} — ${v?.rationale}`)
              .join("\n"),
            ``,
            `You are ${secretary.name}. Deliver the closing summary of this meeting now.`,
          ].join("\n"),
        },
      ],
      (delta) => {
        summaryText += delta;
        writer.send("token", { delta });
      },
      { maxTokens: 260, temperature: 0.4 },
    );

    writer.send("turn_end", { director: "secretary", text: summaryText });
    turns.push({ director: "secretary", step: "summary", text: summaryText });

    writer.send("done", { turns, votes });
  });
});
