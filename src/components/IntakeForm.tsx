import { useState } from "react";
import { ChevronDown, Gavel } from "lucide-react";
import { DIRECTORS, OPENING_ORDER } from "../lib/directors";
import type { StructuredFieldsState } from "../lib/types";
import { DirectorAvatar } from "./DirectorAvatar";

const EMPTY: StructuredFieldsState = {
  problem: "",
  target_customer: "",
  solution: "",
  revenue_model: "",
  team: "",
  unsure: "",
};

const FIELD_DEFS: { key: keyof StructuredFieldsState; label: string; placeholder: string; textarea?: boolean }[] = [
  { key: "problem", label: "Problem", placeholder: "What painful problem does it solve?" },
  { key: "target_customer", label: "Target customer", placeholder: "Who has this problem most acutely?" },
  { key: "solution", label: "Solution", placeholder: "How does the product solve it?" },
  { key: "revenue_model", label: "How it makes money", placeholder: "Pricing model, unit economics, or path to revenue" },
  { key: "team", label: "Team", placeholder: "Who's building it — background and edge" },
  { key: "unsure", label: "What you're most unsure about", placeholder: "The assumption that keeps you up at night", textarea: true },
];

interface Props {
  onConvene: (pitch: string, fields: StructuredFieldsState | null) => void;
}

export function IntakeForm({ onConvene }: Props) {
  const [pitch, setPitch] = useState("");
  const [showFields, setShowFields] = useState(false);
  const [fields, setFields] = useState<StructuredFieldsState>(EMPTY);
  const [touched, setTouched] = useState(false);

  const isEmpty = pitch.trim().length === 0;

  const submit = () => {
    setTouched(true);
    if (isEmpty) return;
    const filled = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v.trim().length > 0),
    ) as StructuredFieldsState;
    onConvene(pitch.trim(), Object.keys(filled).length ? filled : null);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      <div className="text-center">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11.5px] font-medium uppercase tracking-[0.16em] text-accent">
          <Gavel className="h-3.5 w-3.5" /> Press test your idea
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-[2.6rem] sm:leading-[1.1]">
          Convene your board.
          <br />
          <span className="text-muted">Four AI directors, one brutal verdict.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[14.5px] leading-relaxed text-faint">
          A VC, a CTO, a growth lead and a devil's advocate pressure-test your
          startup idea in under five minutes — streaming live, no signup.
        </p>
      </div>

      <div className="panel mt-8 p-5 sm:p-6">
        <label htmlFor="pitch" className="mb-2 block text-[13px] font-medium text-muted">
          What's your idea?
        </label>
        <textarea
          id="pitch"
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={3}
          placeholder="e.g. An AI that reads your invoices and negotiates with vendors to cut costs automatically."
          className="w-full resize-none rounded-lg border border-border bg-background/60 px-4 py-3 text-[15px] text-foreground placeholder:text-faint/70 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/25 transition-colors duration-200"
        />
        <p className="mt-1.5 text-right text-[11.5px] text-faint">{pitch.length}/280</p>

        {touched && isEmpty && (
          <p className="mb-1 -mt-2 text-[13px] text-destructive">
            Give the board something to work with — describe your idea first.
          </p>
        )}

        <button
          type="button"
          onClick={() => setShowFields((v) => !v)}
          aria-expanded={showFields}
          className="mt-1 flex w-full cursor-pointer items-center justify-between rounded-lg border border-border bg-surface-2/40 px-4 py-2.5 text-[13.5px] font-medium text-muted transition-colors duration-200 hover:text-foreground"
        >
          <span>Add context (optional)</span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showFields ? "rotate-180" : ""}`} />
        </button>

        {showFields && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {FIELD_DEFS.map((f) => (
              <div key={f.key} className={f.textarea ? "sm:col-span-2" : ""}>
                <label htmlFor={`field-${f.key}`} className="mb-1.5 block text-[12.5px] font-medium text-faint">
                  {f.label}
                </label>
                {f.textarea ? (
                  <textarea
                    id={`field-${f.key}`}
                    value={fields[f.key]}
                    onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    rows={2}
                    placeholder={f.placeholder}
                    className="w-full resize-none rounded-lg border border-border bg-background/60 px-3.5 py-2.5 text-[14px] text-foreground placeholder:text-faint/70 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/25 transition-colors duration-200"
                  />
                ) : (
                  <input
                    id={`field-${f.key}`}
                    value={fields[f.key]}
                    onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full rounded-lg border border-border bg-background/60 px-3.5 py-2.5 text-[14px] text-foreground placeholder:text-faint/70 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/25 transition-colors duration-200"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={isEmpty}
          className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3.5 text-[15px] font-semibold text-background transition-all duration-200 ease-out hover:bg-accent-strong active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        >
          <Gavel className="h-4.5 w-4.5" strokeWidth={2} />
          Convene the board
        </button>
      </div>

      <div className="mt-8">
        <p className="mb-3 text-center text-[11px] uppercase tracking-[0.2em] text-faint">In the room</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {OPENING_ORDER.map((id) => {
            const d = DIRECTORS[id];
            return (
              <div key={id} className={`panel lift flex flex-col items-center gap-2 p-3 text-center ${d.isDevil ? "bg-black/40" : ""}`}>
                <DirectorAvatar id={id} size="md" />
                <div>
                  <p className={`text-[13px] font-semibold ${d.text}`}>{d.shortName}</p>
                  <p className="text-[10.5px] leading-tight text-faint">{d.title}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-center text-[11px] text-faint">Plus a neutral secretary keeping the minutes.</p>
      </div>
    </div>
  );
}
