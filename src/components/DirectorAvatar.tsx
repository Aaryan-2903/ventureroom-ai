import { TrendingUp, Cpu, Rocket, Swords, Scale } from "lucide-react";
import { director, directorInitials } from "../lib/directors";
import type { DirectorId } from "../lib/types";

const ICONS: Record<string, typeof TrendingUp> = {
  "trending-up": TrendingUp,
  cpu: Cpu,
  rocket: Rocket,
  swords: Swords,
  scale: Scale,
};

interface Props {
  id: DirectorId;
  size?: "sm" | "md" | "lg";
  speaking?: boolean;
  className?: string;
}

const SIZE = {
  sm: "h-9 w-9 text-[15px]",
  md: "h-11 w-11 text-lg",
  lg: "h-14 w-14 text-2xl",
};

export function DirectorAvatar({ id, size = "md", speaking = false, className = "" }: Props) {
  const d = director(id);
  const Icon = ICONS[d.icon] ?? Swords;

  // The Board Secretary gets a neutral, boardroom-accented treatment.
  if (d.id === "secretary") {
    return (
      <div
        className={`relative shrink-0 ${SIZE[size]} rounded-lg border border-accent/40 bg-accent/10 flex items-center justify-center text-accent ${speaking ? "ring-2 ring-accent/60" : ""} ${className}`}
        aria-hidden="true"
      >
        <Icon className={size === "lg" ? "h-7 w-7" : size === "md" ? "h-5 w-5" : "h-4 w-4"} strokeWidth={1.8} />
      </div>
    );
  }

  // The Devil's Advocate gets a distinct treatment: no friendly avatar,
  // a dark chip with a sharp icon instead.
  if (d.isDevil) {
    return (
      <div
        className={`relative shrink-0 ${SIZE[size]} rounded-lg border border-da/50 bg-black/50 flex items-center justify-center text-da ${speaking ? "ring-2 ring-da/60" : ""} ${className}`}
        aria-hidden="true"
      >
        <Icon className={size === "lg" ? "h-7 w-7" : size === "md" ? "h-5 w-5" : "h-4 w-4"} strokeWidth={1.8} />
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 ${SIZE[size]} rounded-full border ${d.border} ${d.bg} flex items-center justify-center ${d.text} font-display font-semibold ${speaking ? `ring-2 ${d.border}` : ""} ${className}`}
      title={d.name}
      aria-hidden="true"
    >
      {size === "lg" ? directorInitials(d.name).slice(0, 1) : directorInitials(d.name)}
    </div>
  );
}
