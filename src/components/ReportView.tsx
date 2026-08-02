import { useState } from "react";
import { Check, Copy, FileText, Link2, RefreshCw, MessageSquare } from "lucide-react";
import type { Report, Votes } from "../lib/types";
import { tallyOf, verdictLine } from "./VoteBanner";
import { ErrorPanel } from "./ErrorPanel";

export function reportToMarkdown(report: Report, votes: Votes | null, pitch: string): string {
  const t = report.tally;
  const lines: string[] = [
    "# Board Verdict",
    "",
    `**${verdictLine(votes ?? {})}**` + (votes ? ` — ${t.proceed} proceed, ${t.pivot} pivot, ${t.kill} kill` : ""),
    "",
  ];
  const section = (title: string, items: string[], numbered = false) => {
    if (!items?.length) return;
    lines.push(`## ${title}`, "");
    items.forEach((item, i) => lines.push(numbered ? `${i + 1}. ${item}` : `- ${item}`));
    lines.push("");
  };
  if (report.executive_summary) {
    lines.push("## Executive Summary", "", report.executive_summary, "");
  }
  if (report.final_recommendation) {
    lines.push("## Final Recommendation", "", report.final_recommendation, "");
  }
  const investSections: [string, string[] | undefined][] = [
    ["Market Analysis", report.market_analysis],
    ["Competition", report.competition],
    ["Business Model", report.business_model],
    ["Technology Review", report.technology_review],
    ["Growth Strategy", report.growth_strategy],
    ["Risk Analysis", report.risk_analysis],
  ];
  for (const [title, items] of investSections) {
    section(title, items ?? []);
  }
  if (report.vote_breakdown) {
    lines.push("## Vote Breakdown", "", report.vote_breakdown, "");
  }
  section("30-Day Plan", report.plan_30_day ?? [], true);
  section("90-Day Roadmap", report.roadmap_90_day ?? [], true);
  // Legacy sections — only include if no investor-grade sections are present
  if (!report.market_analysis && !report.final_recommendation) {
    section("Strengths", report.strengths);
    section("Key Risks", report.key_risks);
    section("Opportunities", report.opportunities);
    section("Recommended Next Steps", report.next_steps, true);
    section("Metrics That Would Move the Board", report.metrics_to_track ?? []);
  }
  if (pitch) {
    lines.push("---", "", `_Original pitch: ${pitch}_`, "");
  }
  return lines.join("\n");
}

interface Props {
  pitch: string;
  votes: Votes | null;
  report: Report | null;
  loading: boolean;
  error: string | null;
  onRegenerate: () => void;
  onAskMore: () => void;
  onSave: () => void;
  saving: boolean;
  retryReport: () => void;
  /** Hide action buttons — used in the read-only shared view. */
  readOnly?: boolean;
}

export function ReportView({
  pitch,
  votes,
  report,
  loading,
  error,
  onRegenerate,
  onAskMore,
  onSave,
  saving,
  retryReport,
  readOnly = false,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copyReport = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(reportToMarkdown(report, votes, pitch));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const Section = ({ title, items, numbered }: { title: string; items: string[]; numbered?: boolean }) => (
    <section className="panel p-5 sm:p-6">
      <h3 className="mb-3 font-display text-[16px] font-semibold text-accent-strong">{title}</h3>
      {items?.length ? (
        <ul className={numbered ? "space-y-2" : "space-y-2.5"}>
          {items.map((item, i) => (
            <li key={i} className="flex gap-2.5 text-[14.5px] leading-relaxed text-muted">
              {numbered && (
                <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11.5px] font-bold text-accent">
                  {i + 1}
                </span>
              )}
              {!numbered && <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-accent" />}
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13.5px] italic text-faint">Nothing flagged here.</p>
      )}
    </section>
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6">
      <div className="mb-6 mt-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-faint">Board verdict</p>
        <h2 className="mt-2 font-display text-3xl font-semibold text-foreground sm:text-4xl">
          {votes ? verdictLine(votes) : "Synthesizing…"}
        </h2>
        {votes && (
          <p className="mt-2 text-[13.5px] text-faint">
            {tallyOf(votes).proceed} proceed · {tallyOf(votes).pivot} pivot ·{" "}
            {tallyOf(votes).kill} kill
          </p>
        )}
      </div>

      {error && (
        <div className="mb-5">
          <ErrorPanel message={error} onRetry={retryReport} />
        </div>
      )}

      {loading && !report && (
        <div className="space-y-4" role="status" aria-live="polite">
          <div className="panel flex flex-col items-center gap-3 p-8 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
            <p className="text-[14px] text-muted">Reading the room and drafting the verdict…</p>
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="panel h-24 skeleton rounded-xl" />
          ))}
        </div>
      )}

      {!loading && report && (
        <div className="space-y-4">
          {report.executive_summary && (
            <section className="panel border-l-2 border-l-accent p-5 sm:p-6">
              <h3 className="mb-2 font-display text-[16px] font-semibold text-accent-strong">Executive Summary</h3>
              <p className="text-[14.5px] leading-relaxed text-muted">{report.executive_summary}</p>
            </section>
          )}

          {/* Investor-grade sections (v3+) */}
          {report.final_recommendation && (
            <section className="panel border-l-2 border-l-accent p-5 sm:p-6">
              <h3 className="mb-2 font-display text-[16px] font-semibold text-accent-strong">Final Recommendation</h3>
              <p className="text-[14.5px] leading-relaxed text-muted">{report.final_recommendation}</p>
            </section>
          )}
          {report.market_analysis && <Section title="Market Analysis" items={report.market_analysis} />}
          {report.competition && <Section title="Competition" items={report.competition} />}
          {report.business_model && <Section title="Business Model" items={report.business_model} />}
          {report.technology_review && <Section title="Technology Review" items={report.technology_review} />}
          {report.growth_strategy && <Section title="Growth Strategy" items={report.growth_strategy} />}
          {report.risk_analysis && <Section title="Risk Analysis" items={report.risk_analysis} />}
          {report.vote_breakdown && (
            <section className="panel p-5 sm:p-6">
              <h3 className="mb-2 font-display text-[16px] font-semibold text-accent-strong">Vote Breakdown</h3>
              <p className="text-[14.5px] leading-relaxed text-muted">{report.vote_breakdown}</p>
            </section>
          )}
          {report.plan_30_day && <Section title="30-Day Plan" items={report.plan_30_day} numbered />}
          {report.roadmap_90_day && <Section title="90-Day Roadmap" items={report.roadmap_90_day} numbered />}

          {/* Legacy sections (fallback for older meetings) */}
          {(!report.market_analysis && !report.final_recommendation) && (
            <>
              <Section title="Strengths" items={report.strengths} />
              <Section title="Key Risks" items={report.key_risks} />
              <Section title="Opportunities" items={report.opportunities} />
              <Section title="Recommended Next Steps" items={report.next_steps} numbered />
              <Section title="Metrics That Would Move the Board" items={report.metrics_to_track ?? []} />
            </>
          )}
        </div>
      )}

      {!readOnly && (
      <div className="mt-8 flex flex-wrap justify-center gap-2.5">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-[14px] font-semibold text-background transition-all duration-200 hover:bg-accent-strong active:scale-[0.97] disabled:opacity-50"
        >
          <Link2 className="h-4 w-4" />
          {saving ? "Saving…" : "Save & share"}
        </button>
        <button
          type="button"
          onClick={copyReport}
          disabled={!report}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-[14px] font-medium text-muted transition-all duration-200 hover:border-faint hover:text-foreground active:scale-[0.97] disabled:opacity-50"
        >
          {copied ? <Check className="h-4 w-4 text-vc" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy report"}
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={loading}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-[14px] font-medium text-muted transition-all duration-200 hover:border-faint hover:text-foreground active:scale-[0.97] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Regenerate
        </button>
        <button
          type="button"
          onClick={onAskMore}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-[14px] font-medium text-muted transition-all duration-200 hover:border-faint hover:text-foreground active:scale-[0.97]"
        >
          <MessageSquare className="h-4 w-4" />
          Ask another question
        </button>
      </div>
      )}

      {!readOnly && (
        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[12px] text-faint">
          <FileText className="h-3.5 w-3.5" />
          Verdict synthesized from the full transcript by the board.
        </p>
      )}
    </div>
  );
}
