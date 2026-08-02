import { useEffect, useState } from "react";
import { Link2, SearchX } from "lucide-react";
import { jsonFunction } from "../lib/api";
import type { Meeting } from "../lib/types";
import { Header } from "./Header";
import { TurnCard } from "./TurnCard";
import { VoteBanner } from "./VoteBanner";
import { ReportView } from "./ReportView";

interface Props {
  token: string;
  onStartOwn: () => void;
}

export function SharedView({ token, onStartOwn }: Props) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    jsonFunction<{ meeting: Meeting }>("get", { token })
      .then((res) => {
        if (cancelled) return;
        setMeeting(res.meeting);
        setState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = String(err?.message ?? "");
        setState(msg.toLowerCase().includes("doesn't exist") ? "missing" : "error");
        setErrorMsg(msg || "Could not load this meeting.");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="boardroom-glow min-h-screen">
      <Header showReset onReset={onStartOwn} />
      <main className="mx-auto w-full max-w-2xl px-4 pb-20 sm:px-6">
        {state === "loading" && (
          <div className="flex flex-col items-center gap-4 pt-24 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
            <p className="text-[14px] text-muted">Loading shared meeting…</p>
          </div>
        )}

        {(state === "missing" || state === "error") && (
          <div className="panel mt-16 flex flex-col items-center gap-4 p-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-da/40 bg-da/10 text-da">
              <SearchX className="h-7 w-7" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">
                {state === "missing" ? "This meeting doesn't exist" : "Couldn't load this meeting"}
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-muted">
                {state === "missing"
                  ? "The link may be wrong, or the meeting was never saved. Double-check the URL."
                  : errorMsg}
              </p>
            </div>
            <button
              type="button"
              onClick={onStartOwn}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-[14px] font-semibold text-background transition-all duration-200 hover:bg-accent-strong active:scale-[0.97]"
            >
              <Link2 className="h-4 w-4" />
              Start your own meeting
            </button>
          </div>
        )}

        {state === "ready" && meeting && (
          <>
            <div className="mt-8 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-faint">
              <Link2 className="h-3.5 w-3.5" /> Shared meeting
            </div>
            <blockquote className="mt-3 border-l-2 border-accent/60 bg-surface/50 pl-4 font-display text-[19px] font-medium leading-snug text-foreground">
              “{meeting.pitch_one_liner}”
            </blockquote>

            {meeting.structured_fields && (
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {Object.entries(meeting.structured_fields)
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k} className="panel p-3">
                      <p className="text-[10.5px] uppercase tracking-wider text-faint">{k.replace(/_/g, " ")}</p>
                      <p className="mt-0.5 text-[13.5px] text-muted">{v}</p>
                    </div>
                  ))}
              </div>
            )}

            <div className="mt-7 space-y-3.5">
              {meeting.transcript.map((turn, i) => (
                <TurnCard
                  key={i}
                  director={turn.director}
                  step={turn.step}
                  text={turn.text}
                  vote={turn.step === "vote" ? meeting.votes?.[turn.director]?.vote : undefined}
                  rationale={turn.step === "vote" ? meeting.votes?.[turn.director]?.rationale : undefined}
                />
              ))}
            </div>

            {meeting.votes && <div className="mt-6"><VoteBanner votes={meeting.votes} /></div>}

            {meeting.report && (
              <div className="mt-8">
                <ReportView
                  pitch={meeting.pitch_one_liner}
                  votes={meeting.votes}
                  report={meeting.report}
                  loading={false}
                  error={null}
                  onRegenerate={() => {}}
                  onAskMore={onStartOwn}
                  onSave={() => {}}
                  saving={false}
                  retryReport={() => {}}
                  readOnly
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
