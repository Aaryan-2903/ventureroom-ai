// ask — streams the addressed director's answer, then a structured decision
// decides whether exactly one OTHER director interjects with a short rebuttal.
// Answers follow the board structure: analysis → opinion → one recommendation
// → at most one follow-up question to the founder.
// SSE events:
//   turn_start { director } → token { delta }* → turn_end { director, text }
//   [interjection if chosen] turn_start → token* → turn_end
//   done { turns }

import { handleOptions, error } from "../_shared/cors.ts";
import { sseStream } from "../_shared/stream.ts";
import { streamChat, chatJSON } from "../_shared/openai.ts";
import {
  DIRECTORS,
  directorPrompt,
  formatTranscript,
  type DirectorId,
} from "../_shared/directors.ts";
import type { Turn } from "../_shared/types.ts";

interface InterjectionDecision {
  interject: boolean;
  director: DirectorId | null;
  reason: string;
}

async function decideInterjection(
  transcriptText: string,
  question: string,
  addressed: DirectorId,
  pitch: string,
): Promise<InterjectionDecision> {
  const all = Object.values(DIRECTORS)
    .filter((d) => d.id !== addressed && d.id !== "secretary")
    .map((d) => `${d.id} (${d.name}, ${d.title})`)
    .join(", ");
  try {
    const res = await chatJSON(
      [
        {
          role: "system",
          content:
            "You are the board secretary. Given the transcript, the founder's question, and who answered, decide whether exactly one OTHER director should add a very short interjection. Return strict JSON: {\"interject\": boolean, \"director\": string|null, \"reason\": string}. Rules: never pick the director who just answered; at most one director; prefer The Devil's Advocate when the answer left a risk or assumption gap, and prefer the director whose lens is most directly challenged by the answer; interject only if it genuinely adds a new angle or pushes back on something specific — otherwise interject=false.",
        },
        {
          role: "user",
          content: [
            `Pitch: ${pitch}`,
            ``,
            `Board transcript so far:`,
            transcriptText,
            ``,
            `Founder's question to ${DIRECTORS[addressed].name}: "${question}"`,
            ``,
            `Eligible interjectors: ${all}`,
            ``,
            `Decide: should someone interject? Return only the JSON object.`,
          ].join("\n"),
        },
      ],
      { maxTokens: 60, temperature: 0.3 },
    );
    const interject = res.interject === true;
    const dir = typeof res.director === "string" ? (res.director as DirectorId) : null;
    return {
      interject,
      director: interject && dir && DIRECTORS[dir] && dir !== addressed && dir !== "secretary" ? dir : null,
      reason: typeof res.reason === "string" ? res.reason : "",
    };
  } catch (err) {
    console.error("interjection decision failed", err);
    return { interject: false, director: null, reason: "" };
  }
}

Deno.serve(async (req: Request) => {
  const opts = handleOptions(req);
  if (opts) return opts;
  if (req.method !== "POST") return error("POST required", 405);

  let body: { pitch?: unknown; transcript?: unknown; question?: unknown; director?: unknown };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body", 400);
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  const director = typeof body.director === "string" ? (body.director as DirectorId) : "";
  const pitch = typeof body.pitch === "string" ? body.pitch.trim() : "(the pitch under discussion)";
  const transcript = Array.isArray(body.transcript)
    ? (body.transcript as Turn[])
    : [];

  if (!question) return error("question is required", 400);
  if (!DIRECTORS[director] || director === "secretary") return error("invalid director", 400);

  const transcriptText = formatTranscript(transcript);
  const d = DIRECTORS[director];

  return sseStream(async (writer) => {
    const turns: Turn[] = [];

    writer.send("turn_start", { director, step: "qa" });

    // Fire the interjection decision in parallel with the answer stream.
    const decisionPromise = decideInterjection(transcriptText, question, director, pitch);

    let answer = "";
    await streamChat(
      [
        { role: "system", content: directorPrompt(director) },
        {
          role: "user",
          content: [
            `Pitch: ${pitch}`,
            ``,
            `Board transcript so far:`,
            transcriptText,
            ``,
            `The founder asks you, ${d.name}: "${question}"`,
            ``,
            `Answer in the board structure: (a) ANALYSIS through your lens, (b) OPINION — engage what the other directors have said by name, (c) RECOMMENDATION — exactly ONE concrete, actionable move, (d) at most ONE follow-up question to the founder on its own line prefixed exactly: "Question for the founder:" — or "None." if you don't need one.`,
            `Ground every claim in the pitch and the discussion above. No generic advice.`,
          ].join("\n"),
        },
      ],
      (delta) => {
        answer += delta;
        writer.send("token", { delta });
      },
      { maxTokens: 440, temperature: 0.8 },
    );

    writer.send("turn_end", { director, text: answer });
    turns.push({ director, step: "qa", text: answer });

    const decision = await decisionPromise;
    if (decision.interject && decision.director) {
      const jd = DIRECTORS[decision.director];
      writer.send("turn_start", { director: decision.director, step: "interjection", interjection: true });

      let rebuttal = "";
      await streamChat(
        [
          { role: "system", content: directorPrompt(decision.director) },
          {
            role: "user",
            content: [
              `Pitch: ${pitch}`,
              ``,
              `Board transcript so far:`,
              transcriptText,
              ``,
              `Founder's question: "${question}"`,
              `${d.name}'s answer: "${answer}"`,
              ``,
              `You are ${jd.name}. Jump in with a SHORT interjection (under 80 words): push back on something SPECIFIC in ${d.name}'s answer, build on it, or sharpen the risk they glossed over — through your lens. Do not repeat the answer and do not give generic advice.`,
            ].join("\n"),
          },
        ],
        (delta) => {
          rebuttal += delta;
          writer.send("token", { delta });
        },
        { maxTokens: 200, temperature: 0.8 },
      );

      writer.send("turn_end", { director: decision.director, text: rebuttal });
      turns.push({ director: decision.director, step: "interjection", text: rebuttal });
    }

    writer.send("done", { turns });
  });
});
