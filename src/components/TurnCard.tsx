import { HelpCircle } from "lucide-react";
import { director, extractFollowUp } from "../lib/directors";
import type { DirectorId, TurnStep, VoteOption } from "../lib/types";
import { Markdown } from "../lib/markdown";
import { DirectorAvatar } from "./DirectorAvatar";

interface Props {
  director: DirectorId;
  step: TurnStep;
  text: string;
  streaming?: boolean;
  vote?: VoteOption;
  rationale?: string;
  isQuestion?: string; // the founder's question this turn answers (Q&A phase)
}

const STEP_LABEL: Record<TurnStep, string> = {
  opening: "Opening statement",
  qa: "Answer",
  interjection: "Rebuttal",
  vote: "Vote",
  summary: "Secretary's summary",
};

const VOTE_STYLE: Record<VoteOption, string> = {
  Proceed: "bg-vc/15 text-vc border-vc/40",
  Pivot: "bg-growth/15 text-growth border-growth/40",
  Kill: "bg-da/15 text-da border-da/40",
};

/** Split a turn into its main body and any follow-up question for the founder. */
function splitFollowUp(text: string): { body: string; question: string | null } {
  if (!text) return { body: "", question: null };
  const lines = text.split("\n");
  const idx = lines.findIndex((raw) => {
    const line = raw.replace(/\*\*/g, "").replace(/^[-*•]\s*/, "").trim();
    return /^question for the founder:?\s*\S+/i.test(line);
  });
  if (idx === -1) return { body: text, question: null };
  const question = extractFollowUp(lines[idx]);
  const body = lines.filter((_, i) => i !== idx).join("\n").trim();
  return { body, question };
}

export function TurnCard({ director: id, step, text, streaming = false, vote, rationale, isQuestion }: Props) {
  const d = director(id);
  const isVote = step === "vote";
  const isSummary = step === "summary";
  const { body, question } = splitFollowUp(text);

  return (
    <article
      className={`panel turn-enter p-4 sm:p-5 transition-colors duration-200 ${
        streaming ? `border-transparent ${d.border} ${d.glow}` : ""
      } ${isSummary ? "border-accent/30 bg-accent/5" : ""}`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <DirectorAvatar id={id} size="md" speaking={streaming} />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className={`font-display text-[15px] font-semibold ${d.text}`}>{d.name}</h3>
            <span className="text-[12px] text-faint">{d.title}</span>
            <span
              className={`ml-auto rounded-full border px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider ${
                isVote
                  ? VOTE_STYLE[vote ?? "Pivot"]
                  : isSummary
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-border bg-surface-2/60 text-faint"
              }`}
            >
              {isVote ? (vote ?? "Vote") : STEP_LABEL[step]}
            </span>
          </div>

          {isQuestion && (
            <p className="mb-2 rounded-lg border border-accent/25 bg-accent/8 px-3 py-2 text-[13.5px] italic text-muted">
              <span className="font-medium not-italic text-accent-strong">You asked {d.shortName}:</span> {isQuestion}
            </p>
          )}

          {body ? <Markdown text={body} streaming={streaming} /> : streaming ? <Markdown text="" streaming /> : null}

          {question && (
            <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-accent/25 bg-accent/8 px-3.5 py-2.5">
              <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-accent">
                  Follow-up question for you
                </p>
                <p className="mt-1 text-[14px] leading-snug text-muted">“{question}”</p>
              </div>
            </div>
          )}

          {isVote && rationale && (
            <p className="mt-3 border-t border-border/70 pt-2.5 text-[13.5px] italic text-faint">
              “{rationale}”
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
