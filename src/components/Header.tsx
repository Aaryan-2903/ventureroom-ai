import { Landmark, RotateCcw } from "lucide-react";

interface Props {
  onReset?: () => void;
  showReset?: boolean;
}

export function Header({ onReset, showReset = false }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 text-accent">
            <Landmark className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <div className="leading-tight">
            <p className="font-display text-[17px] font-semibold tracking-wide text-foreground">
              The Boardroom
            </p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-faint">
              AI Board of Directors
            </p>
          </div>
        </div>
        {showReset && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] text-muted transition-colors duration-200 hover:border-faint hover:text-foreground active:scale-[0.97]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            New meeting
          </button>
        )}
      </div>
    </header>
  );
}
