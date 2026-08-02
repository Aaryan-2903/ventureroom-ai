import { CircleCheck } from "lucide-react";
import { OPENING_ORDER, director } from "../lib/directors";
import type { VoteOption, Votes } from "../lib/types";
import { DirectorAvatar } from "./DirectorAvatar";

const VOTE_WORD: Record<VoteOption, string> = {
  Proceed: "Proceed",
  Pivot: "Pivot",
  Kill: "Kill",
};

const WORD_STYLE: Record<VoteOption, string> = {
  Proceed: "text-vc",
  Pivot: "text-growth",
  Kill: "text-da",
};

const CHIP_STYLE: Record<VoteOption, string> = {
  Proceed: "bg-vc/15 text-vc border-vc/40",
  Pivot: "bg-growth/15 text-growth border-growth/40",
  Kill: "bg-da/15 text-da border-da/40",
};

export function tallyOf(votes: Votes) {
  const tally = { proceed: 0, pivot: 0, kill: 0 };
  for (const v of Object.values(votes)) {
    if (!v) continue;
    if (v.vote === "Proceed") tally.proceed++;
    else if (v.vote === "Pivot") tally.pivot++;
    else if (v.vote === "Kill") tally.kill++;
  }
  return tally;
}

export function verdictLine(votes: Votes): string {
  const t = tallyOf(votes);
  const parts: string[] = [];
  if (t.proceed) parts.push(`${t.proceed} Proceed`);
  if (t.pivot) parts.push(`${t.pivot} Pivot`);
  if (t.kill) parts.push(`${t.kill} Kill`);
  return parts.length ? parts.join(" · ") : "No votes yet";
}

export function VoteBanner({ votes }: { votes: Votes }) {
  const tally = tallyOf(votes);
  const rows: { opt: VoteOption; count: number }[] = [
    { opt: "Proceed", count: tally.proceed },
    { opt: "Pivot", count: tally.pivot },
    { opt: "Kill", count: tally.kill },
  ];
  const total = Object.keys(votes).length;

  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-border/70 bg-surface-2/30 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <CircleCheck className="h-4.5 w-4.5 text-accent" />
          <h3 className="font-display text-[15px] font-semibold text-foreground">The board has voted</h3>
          {total < 4 && (
            <span className="ml-auto text-[12px] text-faint">{total}/4 directors in</span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {rows.map((r) => (
            <span
              key={r.opt}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-semibold ${CHIP_STYLE[r.opt]}`}
            >
              {r.count} {VOTE_WORD[r.opt]}
            </span>
          ))}
        </div>
      </div>
      <ul className="divide-y divide-border/60">
        {OPENING_ORDER.map((id) => {
          const v = votes[id];
          const d = director(id);
          return (
            <li key={id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
              <DirectorAvatar id={id} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className={`text-[13.5px] font-semibold ${d.text}`}>{d.name}</span>
                  <span className={`text-[12px] font-bold uppercase tracking-wide ${v ? WORD_STYLE[v.vote] : "text-faint"}`}>
                    {v ? VOTE_WORD[v.vote] : "…"}
                  </span>
                </div>
                {v?.rationale && (
                  <p className="mt-0.5 text-[13px] leading-snug text-muted">“{v.rationale}”</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
