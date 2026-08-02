import { useEffect, useState } from "react";
import { Send, Gavel, CornerDownLeft } from "lucide-react";
import { OPENING_ORDER, director } from "../lib/directors";
import type { DirectorId } from "../lib/types";
import { DirectorAvatar } from "./DirectorAvatar";

interface Props {
  onAsk: (question: string, director: DirectorId) => void;
  onCloseMeeting: () => void;
  busy: boolean;
  votesExist: boolean;
  /** The most recent director follow-up question, surfaced as a shortcut. */
  followUp?: { director: DirectorId; question: string } | null;
}

export function AskBox({ onAsk, onCloseMeeting, busy, votesExist, followUp = null }: Props) {
  const [question, setQuestion] = useState("");
  const [target, setTarget] = useState<DirectorId>("vera");
  const [followUpDismissed, setFollowUpDismissed] = useState(false);

  // A new director follow-up question reappears even after a previous one was dismissed.
  useEffect(() => {
    setFollowUpDismissed(false);
  }, [followUp?.question]);

  const canSend = question.trim().length > 0 && !busy;

  const send = (text?: string) => {
    const q = (text ?? question).trim();
    if (!q || busy) return;
    onAsk(q, target);
    setQuestion("");
    setFollowUpDismissed(true);
  };

  const showFollowUp = followUp && !followUpDismissed;

  return (
    <div className="border-t border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
        <div className="panel p-3.5 sm:p-4">
          {showFollowUp && (
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-accent/25 bg-accent/8 px-3.5 py-2.5">
              <p className="min-w-0 flex-1 text-[13px] leading-snug text-muted">
                <span className={`font-semibold ${director(followUp.director).text}`}>
                  {director(followUp.director).shortName}
                </span>{" "}
                asked you: <span className="italic">“{followUp.question}”</span>
              </p>
              <button
                type="button"
                onClick={() => {
                  setTarget(followUp.director);
                  setQuestion(followUp.question);
                  setFollowUpDismissed(true);
                }}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[12.5px] font-medium text-accent transition-all duration-200 hover:bg-accent/20 active:scale-[0.97]"
              >
                <CornerDownLeft className="h-3.5 w-3.5" />
                Answer it
              </button>
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Choose a director">
            <span className="mr-1 text-[11.5px] uppercase tracking-wider text-faint">Ask</span>
            {OPENING_ORDER.map((id) => {
              const d = director(id);
              const selected = target === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTarget(id)}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] transition-all duration-200 active:scale-[0.97] ${
                    selected
                      ? `${d.border} ${d.bg} ${d.text} font-medium`
                      : "border-border text-faint hover:text-muted"
                  }`}
                >
                  <DirectorAvatar id={id} size="sm" />
                  {d.shortName}
                </button>
              );
            })}
          </div>

          <div className="flex items-end gap-2">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              placeholder={`Ask ${director(target).name} anything…`}
              className="min-h-[52px] flex-1 resize-none rounded-lg border border-border bg-background/60 px-3.5 py-2.5 text-[14.5px] text-foreground placeholder:text-faint/70 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/25 transition-colors duration-200"
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={!canSend}
              aria-label="Send question"
              className="flex h-[52px] w-[52px] shrink-0 cursor-pointer items-center justify-center rounded-lg bg-accent text-background transition-all duration-200 hover:bg-accent-strong active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {busy ? (
              <p className="flex items-center gap-2 text-[12.5px] text-faint" role="status" aria-live="polite">
                <span className="typing-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                The board is deliberating…
              </p>
            ) : (
              <p className="text-[12px] text-faint">
                A second director may jump in with a rebuttal.
              </p>
            )}
            <button
              type="button"
              onClick={onCloseMeeting}
              disabled={busy}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3.5 py-2 text-[13px] font-medium text-accent transition-all duration-200 hover:bg-accent/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Gavel className="h-3.5 w-3.5" />
              {votesExist ? "Re-run the vote" : "Close the meeting & vote"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
