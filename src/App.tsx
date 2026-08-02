import { useCallback, useEffect, useRef, useState } from "react";
import { SkipForward, Sparkles } from "lucide-react";
import { jsonFunction, streamFunction } from "./lib/api";
import { DIRECTORS, OPENING_ORDER, director, findFollowUpQuestion } from "./lib/directors";
import type {
  DirectorId,
  Report,
  StructuredFieldsState,
  Turn,
  TurnStep,
  VoteOption,
  Votes,
} from "./lib/types";
import { Header } from "./components/Header";
import { IntakeForm } from "./components/IntakeForm";
import { AskBox } from "./components/AskBox";
import { TurnCard } from "./components/TurnCard";
import { VoteBanner } from "./components/VoteBanner";
import { ReportView } from "./components/ReportView";
import { ShareModal } from "./components/ShareModal";
import { SharedView } from "./components/SharedView";
import { ErrorPanel } from "./components/ErrorPanel";
import { DirectorAvatar } from "./components/DirectorAvatar";

type Stage = "intake" | "opening" | "qa" | "voting" | "report";

interface LiveTurn {
  director: DirectorId;
  step: TurnStep;
  text: string;
}

interface PendingQuestion {
  director: DirectorId;
  text: string;
}

export default function App() {
  // ---- route (share links) ----
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const sharedToken = hash.match(/^#\/m\/([A-Za-z0-9]+)/)?.[1] ?? null;

  // ---- meeting state ----
  const [stage, setStage] = useState<Stage>("intake");
  const [pitch, setPitch] = useState("");
  const [fields, setFields] = useState<StructuredFieldsState | null>(null);
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [votes, setVotes] = useState<Votes>({});
  const [report, setReport] = useState<Report | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [liveTurn, setLiveTurn] = useState<LiveTurn | null>(null);
  const [busy, setBusy] = useState(false);
  const [streamKind, setStreamKind] = useState<"convene" | "ask" | "close" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fastForwarding, setFastForwarding] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<PendingQuestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // refs mirror state for use inside stream callbacks (avoid stale closures)
  const transcriptRef = useRef<Turn[]>([]);
  const votesRef = useRef<Votes>({});
  const fieldsRef = useRef<StructuredFieldsState | null>(null);
  const pitchRef = useRef("");
  const liveTurnRef = useRef<LiveTurn | null>(null);
  const fastForwardRef = useRef(false);
  const skippedIndexRef = useRef<number | null>(null);
  const pendingQuestionRef = useRef<PendingQuestion | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const snapshotRef = useRef<{ transcriptLen: number; votes: Votes }>({ transcriptLen: 0, votes: {} });
  const endSentinelRef = useRef<HTMLDivElement | null>(null);

  // ---- auto-scroll to the latest turn ----
  useEffect(() => {
    const el = endSentinelRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "end", behavior: reduce ? "auto" : "smooth" });
  }, [liveTurn?.text, transcript.length]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStage("intake");
    setPitch("");
    setFields(null);
    fieldsRef.current = null;
    pitchRef.current = "";
    transcriptRef.current = [];
    setTranscript([]);
    votesRef.current = {};
    setVotes({});
    setReport(null);
    setReportLoading(false);
    setLiveTurn(null);
    liveTurnRef.current = null;
    setBusy(false);
    setStreamKind(null);
    setError(null);
    setFastForwarding(false);
    fastForwardRef.current = false;
    skippedIndexRef.current = null;
    setPendingQuestion(null);
    pendingQuestionRef.current = null;
    setSaving(false);
    setShareUrl(null);
    if (window.location.hash) window.location.hash = "";
  }, []);

  // ---- core stream runner: convene / ask / close ----
  const runStream = useCallback(
    async (
      kind: "convene" | "ask" | "close",
      payload: Record<string, unknown>,
      onDone: () => void,
      onErrorStage: () => void,
    ) => {
      abortRef.current?.abort();
      snapshotRef.current = {
        transcriptLen: transcriptRef.current.length,
        votes: { ...votesRef.current },
      };
      fastForwardRef.current = false;
      skippedIndexRef.current = null;
      liveTurnRef.current = null;
      setLiveTurn(null);
      setBusy(true);
      setStreamKind(kind);
      setError(null);
      setFastForwarding(false);

      const ac = new AbortController();
      abortRef.current = ac;

      await streamFunction(
        kind,
        payload,
        {
          onTurnStart: (d) => {
            const step: TurnStep = d.interjection
              ? "interjection"
              : (d.step as TurnStep) ?? (kind === "close" ? "vote" : kind === "ask" ? "qa" : "opening");
            liveTurnRef.current = { director: d.director as DirectorId, step, text: "" };
            setLiveTurn(liveTurnRef.current);
          },
          onToken: (delta) => {
            if (fastForwardRef.current || !liveTurnRef.current) return;
            liveTurnRef.current = { ...liveTurnRef.current, text: liveTurnRef.current.text + delta };
            setLiveTurn(liveTurnRef.current);
          },
          onTurnEnd: (d) => {
            const step = liveTurnRef.current?.step ?? "qa";
            const full: Turn = {
              director: d.director as DirectorId,
              step,
              text: d.text,
            };
            // If this turn was skipped, replace the truncated entry with the full text.
            if (
              skippedIndexRef.current !== null &&
              transcriptRef.current[skippedIndexRef.current]?.director === d.director
            ) {
              const next = [...transcriptRef.current];
              next[skippedIndexRef.current] = { ...full, step: next[skippedIndexRef.current].step };
              transcriptRef.current = next;
              skippedIndexRef.current = null;
            } else {
              transcriptRef.current = [...transcriptRef.current, full];
            }
            setTranscript(transcriptRef.current);

            if (d.vote && d.rationale) {
              votesRef.current = {
                ...votesRef.current,
                [d.director]: { vote: d.vote as VoteOption, rationale: d.rationale },
              };
              setVotes(votesRef.current);
            }

            liveTurnRef.current = null;
            setLiveTurn(null);
          },
          onDone: () => {
            setBusy(false);
            setStreamKind(null);
            setFastForwarding(false);
            setPendingQuestion(null);
            pendingQuestionRef.current = null;
            onDone();
          },
          onError: (msg) => {
            // Roll back the failed stream's partial output; keep earlier turns.
            transcriptRef.current = transcriptRef.current.slice(0, snapshotRef.current.transcriptLen);
            setTranscript(transcriptRef.current);
            votesRef.current = { ...snapshotRef.current.votes };
            setVotes(votesRef.current);
            liveTurnRef.current = null;
            setLiveTurn(null);
            setBusy(false);
            setStreamKind(null);
            setFastForwarding(false);
            setError(msg);
            onErrorStage();
          },
        },
        ac.signal,
      );
    },
    [],
  );

  // ---- convene: opening round ----
  const handleConvene = useCallback(
    (pitchText: string, fieldData: StructuredFieldsState | null) => {
      pitchRef.current = pitchText;
      fieldsRef.current = fieldData;
      setPitch(pitchText);
      setFields(fieldData);
      transcriptRef.current = [];
      setTranscript([]);
      votesRef.current = {};
      setVotes({});
      setReport(null);
      setError(null);
      setStage("opening");
      void runStream(
        "convene",
        { pitch: pitchText, structured_fields: fieldData },
        () => setStage("qa"),
        () => setStage("qa"),
      );
    },
    [runStream],
  );

  // ---- Q&A ----
  const handleAsk = useCallback(
    (question: string, target: DirectorId) => {
      pendingQuestionRef.current = { director: target, text: question };
      setPendingQuestion(pendingQuestionRef.current);
      void runStream(
        "ask",
        {
          pitch: pitchRef.current,
          structured_fields: fieldsRef.current,
          transcript: transcriptRef.current,
          question,
          director: target,
        },
        () => {},
        () => {},
      );
    },
    [runStream],
  );

  // ---- close the meeting: vote round ----
  const handleClose = useCallback(() => {
    setStage("voting");
    void runStream(
      "close",
      {
        pitch: pitchRef.current,
        structured_fields: fieldsRef.current,
        transcript: transcriptRef.current,
      },
      () => {
        setStage("report");
        void generateReport();
      },
      () => setStage("qa"),
    );
  }, [runStream]);

  // ---- report synthesis ----
  const generateReport = useCallback(async () => {
    setReportLoading(true);
    setError(null);
    try {
      const rep = await jsonFunction<Report>("report", {
        pitch: pitchRef.current,
        structured_fields: fieldsRef.current,
        transcript: transcriptRef.current,
        votes: votesRef.current,
      });
      setReport(rep);
    } catch (err) {
      setError(String((err as Error)?.message ?? "Could not generate the report."));
    } finally {
      setReportLoading(false);
    }
  }, []);

  // ---- save & share ----
  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await jsonFunction<{ id: string; share_token: string }>("save", {
        pitch_one_liner: pitchRef.current,
        structured_fields: fieldsRef.current,
        transcript: transcriptRef.current,
        votes: votesRef.current,
        report,
      });
      const url = `${window.location.origin}${window.location.pathname}#/m/${res.share_token}`;
      setShareUrl(url);
    } catch (err) {
      setError(String((err as Error)?.message ?? "Could not save the meeting."));
    } finally {
      setSaving(false);
    }
  }, [report]);

  // ---- skip / fast-forward ----
  const skip = useCallback(() => {
    if (!liveTurnRef.current || fastForwardRef.current) return;
    const cur = liveTurnRef.current;
    const truncated: Turn = {
      director: cur.director,
      step: cur.step,
      text: cur.text ? `${cur.text}…` : "(statement skipped)",
    };
    const idx = transcriptRef.current.length;
    transcriptRef.current = [...transcriptRef.current, truncated];
    setTranscript(transcriptRef.current);
    skippedIndexRef.current = idx;
    liveTurnRef.current = null;
    setLiveTurn(null);
    fastForwardRef.current = true;
    setFastForwarding(true);
  }, []);

  // ---- shared route ----
  if (sharedToken) {
    return <SharedView token={sharedToken} onStartOwn={reset} />;
  }

  const speakingDirector = liveTurn ? director(liveTurn.director) : null;
  const streamLabel = liveTurn
    ? liveTurn.step === "vote"
      ? "is casting their vote"
      : liveTurn.step === "summary"
        ? "is summarizing the meeting"
        : streamKind === "ask"
          ? "is answering"
          : "is speaking"
    : "is speaking";
  const votesExist = Object.keys(votes).length > 0;
  const followUp = stage === "qa" ? findFollowUpQuestion(transcript) : null;

  // Inline-error retry: re-run the failed stream for the current step.
  let retryFn: (() => void) | undefined;
  if (streamKind === "convene") retryFn = () => handleConvene(pitch, fields);
  else if (streamKind === "ask") {
    const pq = pendingQuestionRef.current;
    if (pq) retryFn = () => handleAsk(pq.text, pq.director);
  } else if (streamKind === "close") retryFn = handleClose;

  return (
    <div className="boardroom-glow min-h-screen">
      <Header showReset={stage !== "intake"} onReset={reset} />

      {stage === "intake" ? (
        <IntakeForm onConvene={handleConvene} />
      ) : (
        <>
          <main className="mx-auto w-full max-w-3xl px-4 pb-28 sm:px-6">
            {/* Board intro strip */}
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {OPENING_ORDER.map((id) => {
                const d = DIRECTORS[id];
                const speaking = liveTurn?.director === id;
                return (
                  <div
                    key={id}
                    className={`panel lift flex flex-col gap-1.5 p-3 transition-colors duration-200 ${
                      d.isDevil ? "bg-black/40" : ""
                    } ${speaking ? `${d.border} ${d.bg}` : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <DirectorAvatar id={id} size="sm" speaking={speaking} />
                      <div className="min-w-0 leading-tight">
                        <p className={`truncate text-[12.5px] font-semibold ${d.text}`}>{d.shortName}</p>
                        <p className="truncate text-[10px] text-faint">{d.title}</p>
                      </div>
                    </div>
                    {speaking && (
                      <p className="flex items-center gap-1 text-[10.5px] text-accent">
                        <Sparkles className="h-3 w-3 animate-pulse" /> speaking…
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pitch recap */}
            <div className="mt-6">
              <p className="text-[11px] uppercase tracking-[0.2em] text-faint">The pitch</p>
              <p className="mt-1.5 border-l-2 border-accent/60 bg-surface/40 pl-3.5 font-display text-[17px] leading-snug text-foreground">
                “{pitch}”
              </p>
            </div>

            {/* Stream status + skip */}
            {busy && (
              <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface/70 px-4 py-2.5">
                <p className="text-[13px] text-muted">
                  {speakingDirector ? (
                    <>
                      <span className={`font-medium ${speakingDirector.text}`}>{speakingDirector.name}</span>{" "}
                      {streamLabel}
                      {fastForwarding && <span className="text-faint"> — fast-forwarding…</span>}
                    </>
                  ) : (
                    <span className="text-faint">The board is preparing…</span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={skip}
                  disabled={!liveTurn || fastForwarding}
                  className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-medium text-muted transition-all duration-200 hover:border-faint hover:text-foreground active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  Skip
                </button>
              </div>
            )}

            {/* Inline errors */}
            {error && stage !== "report" && (
              <div className="mt-5">
                <ErrorPanel message={error} onRetry={retryFn} />
              </div>
            )}

            {/* Transcript */}
            <div className="mt-6 space-y-3.5">
              {transcript.map((t, i) => (
                <TurnCard
                  key={i}
                  director={t.director}
                  step={t.step}
                  text={t.text}
                  vote={t.step === "vote" ? votes[t.director]?.vote : undefined}
                  rationale={t.step === "vote" ? votes[t.director]?.rationale : undefined}
                />
              ))}
              {liveTurn && (
                <TurnCard
                  director={liveTurn.director}
                  step={liveTurn.step}
                  text={liveTurn.text}
                  streaming={!fastForwarding}
                  vote={liveTurn.step === "vote" ? votes[liveTurn.director]?.vote : undefined}
                  rationale={liveTurn.step === "vote" ? votes[liveTurn.director]?.rationale : undefined}
                  isQuestion={
                    pendingQuestion && pendingQuestion.director === liveTurn.director && liveTurn.step === "qa"
                      ? pendingQuestion.text
                      : undefined
                  }
                />
              )}
              <div ref={endSentinelRef} className="h-px" aria-hidden="true" />
            </div>

            {/* Live vote tally while voting */}
            {stage === "voting" && votesExist && (
              <div className="mt-6">
                <VoteBanner votes={votes} />
              </div>
            )}

            {/* Report */}
            {stage === "report" && (
              <div className="mt-2">
                <ReportView
                  pitch={pitch}
                  votes={votes}
                  report={report}
                  loading={reportLoading}
                  error={error}
                  onRegenerate={() => void generateReport()}
                  onAskMore={() => setStage("qa")}
                  onSave={() => void handleSave()}
                  saving={saving}
                  retryReport={() => void generateReport()}
                />
              </div>
            )}
          </main>

          {/* Q&A pinned at the bottom */}
          {stage === "qa" && (
            <div className="fixed inset-x-0 bottom-0 z-30">
              <AskBox
                onAsk={handleAsk}
                onCloseMeeting={handleClose}
                busy={busy}
                votesExist={votesExist}
                followUp={followUp}
              />
            </div>
          )}
        </>
      )}

      {shareUrl && <ShareModal url={shareUrl} onClose={() => setShareUrl(null)} />}
    </div>
  );
}
