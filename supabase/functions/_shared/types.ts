// Shared types for the board meeting transcript and API payloads.

import type { DirectorId } from "./directors.ts";

export type TurnStep = "opening" | "qa" | "interjection" | "vote" | "summary";

export interface Turn {
  director: DirectorId;
  step: TurnStep;
  text: string;
}

export interface StructuredFields {
  problem?: string;
  target_customer?: string;
  solution?: string;
  revenue_model?: string;
  team?: string;
  unsure?: string;
}
