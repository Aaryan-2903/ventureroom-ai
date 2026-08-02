// Director identity metadata + mapping to design-system colors (client-side mirror).

import type { DirectorId, Turn } from "./types";

export interface DirectorMeta {
  id: DirectorId;
  name: string;
  title: string;
  shortName: string;
  /** Tailwind text color class */
  text: string;
  /** Tailwind bg color class (chip / avatar) */
  bg: string;
  /** Border color class */
  border: string;
  /** Soft glow / halo class */
  glow: string;
  /** Lucide icon name */
  icon: string;
  /** True for the Devil's Advocate — distinct dark card treatment */
  isDevil: boolean;
  /** Director name shown in transcript headers */
  blurb: string;
}

export const DIRECTORS: Record<DirectorId, DirectorMeta> = {
  vera: {
    id: "vera",
    name: "Vera Sterling",
    title: "Venture Partner",
    shortName: "Vera",
    text: "text-vc",
    bg: "bg-vc/15",
    border: "border-vc/40",
    glow: "shadow-[0_0_24px_-6px] shadow-vc/40",
    icon: "trending-up",
    isDevil: false,
    blurb: "Market size, unit economics, fundraising path.",
  },
  marcus: {
    id: "marcus",
    name: "Marcus Chen",
    title: "CTO",
    shortName: "Marcus",
    text: "text-cto",
    bg: "bg-cto/15",
    border: "border-cto/40",
    glow: "shadow-[0_0_24px_-6px] shadow-cto/40",
    icon: "cpu",
    isDevil: false,
    blurb: "Feasibility, architecture, technical risk.",
  },
  sofia: {
    id: "sofia",
    name: "Sofia Reyes",
    title: "Head of Growth",
    shortName: "Sofia",
    text: "text-growth",
    bg: "bg-growth/15",
    border: "border-growth/40",
    glow: "shadow-[0_0_24px_-6px] shadow-growth/40",
    icon: "rocket",
    isDevil: false,
    blurb: "GTM, channels, retention, positioning.",
  },
  devil: {
    id: "devil",
    name: "The Devil's Advocate",
    title: "Contrarian",
    shortName: "Advocate",
    text: "text-da",
    bg: "bg-da/10",
    border: "border-da/40",
    glow: "shadow-[0_0_24px_-6px] shadow-da/30",
    icon: "swords",
    isDevil: true,
    blurb: "Assumptions, weak logic, uncomfortable questions.",
  },
  secretary: {
    id: "secretary",
    name: "The Board Secretary",
    title: "Secretary",
    shortName: "Secretary",
    text: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/40",
    glow: "shadow-[0_0_24px_-6px] shadow-accent/30",
    icon: "scale",
    isDevil: false,
    blurb: "The neutral keeper of the record.",
  },
};

export const OPENING_ORDER: DirectorId[] = ["vera", "marcus", "sofia", "devil"];

/** The exact prefix directors are instructed to use for a follow-up question. */
export const FOLLOW_UP_PREFIX = "Question for the founder:";

/**
 * Pull a director's follow-up question out of a turn's text.
 * Directors are instructed to put it on its own line prefixed with
 * "Question for the founder:" (optionally wrapped in ** for emphasis).
 */
export function extractFollowUp(text: string): string | null {
  if (!text) return null;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\*\*/g, "").replace(/^[-*•]\s*/, "").trim();
    const m = line.match(/^question for the founder:?\s*(.+)$/i);
    if (m && m[1].trim()) return m[1].trim();
  }
  return null;
}

/** Find the most recent director follow-up question in the transcript. */
export function findFollowUpQuestion(
  transcript: Turn[],
): { director: DirectorId; question: string } | null {
  if (!transcript) return null;
  for (let i = transcript.length - 1; i >= 0; i--) {
    const t = transcript[i];
    if (t.director === "secretary") continue;
    const q = extractFollowUp(t.text);
    if (q) return { director: t.director, question: q };
  }
  return null;
}

export function director(id: DirectorId): DirectorMeta {
  return DIRECTORS[id];
}

export function directorInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
