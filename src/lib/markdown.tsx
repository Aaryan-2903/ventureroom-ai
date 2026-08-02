import type { ReactNode } from "react";

/**
 * Minimal, streaming-safe markdown renderer.
 * Tolerant of partial tokens mid-stream (an unclosed ** or * renders literally
 * until the next chunk completes it). Supports bold, italic, inline code,
 * paragraphs, bullet lists, and numbered lists.
 */

function renderInline(text: string): ReactNode[] {
  const re = /(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`)/g;
  return text.split(re).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={i} className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] text-accent-strong">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function renderBlocks(text: string): ReactNode[] {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (list) {
      const { ordered, items } = list;
      const key = blocks.length;
      if (ordered) {
        blocks.push(
          <ol key={key} className="my-2 space-y-1 pl-5 list-decimal marker:text-faint">
            {items.map((item, i) => (
              <li key={i} className="pl-1">{renderInline(item)}</li>
            ))}
          </ol>,
        );
      } else {
        blocks.push(
          <ul key={key} className="my-2 space-y-1 pl-5 list-disc marker:text-faint">
            {items.map((item, i) => (
              <li key={i} className="pl-1">{renderInline(item)}</li>
            ))}
          </ul>,
        );
      }
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push((bullet ? bullet[1] : numbered![1]) ?? "");
      continue;
    }
    flushList();
    if (line.trim() === "") continue;
    blocks.push(
      <p key={blocks.length} className="my-2 first:mt-0 last:mb-0 leading-relaxed">
        {renderInline(line)}
      </p>,
    );
  }
  flushList();
  return blocks;
}

export function Markdown({ text, streaming = false }: { text: string; streaming?: boolean }) {
  const blocks = renderBlocks(text || "");
  return (
    <div className={`text-[15px] text-muted ${streaming ? "stream-caret" : ""}`}>
      {blocks.length ? blocks : streaming ? <span>&nbsp;</span> : <span className="text-faint">—</span>}
    </div>
  );
}
