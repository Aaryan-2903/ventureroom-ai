import { useState } from "react";
import { Check, Copy, ExternalLink, X } from "lucide-react";

interface Props {
  url: string;
  onClose: () => void;
}

export function ShareModal({ url, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share meeting"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-foreground">Meeting saved</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-faint transition-colors duration-200 hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <p className="mb-4 text-[13.5px] leading-snug text-muted">
          Your meeting is saved anonymously. Anyone with this link can read the
          full transcript, votes and verdict — no login needed.
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            aria-label="Share link"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background/70 px-3 py-2.5 text-[12.5px] text-muted focus:border-accent/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={copy}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-semibold text-background transition-all duration-200 hover:bg-accent-strong active:scale-[0.97]"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-[13.5px] font-medium text-muted transition-colors duration-200 hover:border-faint hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          Open shared view
        </a>
      </div>
    </div>
  );
}
