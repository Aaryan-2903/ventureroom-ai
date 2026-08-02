import { AlertTriangle } from "lucide-react";

interface Props {
  message: string;
  onRetry?: () => void;
}

export function ErrorPanel({ message, onRetry }: Props) {
  return (
    <div
      role="alert"
      className="panel flex items-start gap-3 border-da/40 bg-da/8 p-4 sm:p-5"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-da" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-foreground">The board hit a snag</p>
        <p className="mt-0.5 text-[13.5px] leading-snug text-muted">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 cursor-pointer rounded-lg border border-da/40 bg-da/15 px-3.5 py-1.5 text-[13px] font-medium text-da transition-all duration-200 hover:bg-da/25 active:scale-[0.97]"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
