// Shared frontend types mirroring the Edge Function contracts.

export type DirectorId = "vera" | "marcus" | "sofia" | "devil" | "secretary";

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

export interface StructuredFieldsState {
  problem: string;
  target_customer: string;
  solution: string;
  revenue_model: string;
  team: string;
  unsure: string;
}

export type VoteOption = "Proceed" | "Pivot" | "Kill";

export interface VoteRecord {
  vote: VoteOption;
  rationale: string;
}

export type Votes = Partial<Record<DirectorId, VoteRecord>>;

export interface Report {
  tally: { proceed: number; pivot: number; kill: number };
  executive_summary?: string;
  strengths: string[];
  key_risks: string[];
  opportunities: string[];
  next_steps: string[];
  metrics_to_track?: string[];

  /* Investor-grade report fields (v3+) */
  market_analysis?: string[];
  competition?: string[];
  business_model?: string[];
  technology_review?: string[];
  growth_strategy?: string[];
  risk_analysis?: string[];
  vote_breakdown?: string;
  plan_30_day?: string[];
  roadmap_90_day?: string[];
  final_recommendation?: string;
}

export interface Meeting {
  id: string;
  pitch_one_liner: string;
  structured_fields: StructuredFields | null;
  transcript: Turn[];
  votes: Votes | null;
  report: Report | null;
  share_token: string;
  created_at: string;
}
