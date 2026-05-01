export type Severity = "block" | "warn" | "observe";
export type Verdict = "at_risk" | "not_at_risk" | "insufficient_context";
export type Confidence = "low" | "medium" | "high";

export interface Constraint {
  id: string;
  description: string;
  category: string;
  enforcement: Severity;
  owner: string;
  rationale: string;
  source: string;
  confidence: Confidence;
  verification_notes?: string;
  path_globs?: string[];
}

export interface MeaningDoc {
  system: string;
  version: string;
  status: string;
  owner: string;
  last_reviewed: string;
  goal: { primary: string; success_criteria?: string[]; non_goals: string[] };
  constraints: Constraint[];
  [key: string]: unknown;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

export interface FileDiff {
  path: string;
  oldPath?: string;
  status: "added" | "modified" | "deleted" | "renamed";
  hunks: DiffHunk[];
  rawPatch: string;
}

export interface Diff {
  base: string;
  head: string;
  files: FileDiff[];
  totalLines: number;
}

export interface JudgeFindingRaw {
  constraint_id: string;
  verdict: Verdict;
  confidence: Confidence;
  file?: string;
  line?: number;
  evidence_quote?: string;
  rationale: string;
  suggestion?: string;
}

export interface Finding {
  constraintId: string;
  severity: Severity;
  verdict: Verdict;
  confidence: Confidence;
  file?: string;
  line?: number;
  evidenceQuote?: string;
  rationale: string;
  suggestion?: string;
}

export interface ReviewResult {
  meaningFile: string;
  system: string;
  version: string;
  diff: { base: string; head: string; files: number; lines: number };
  findings: Finding[];
  stats: {
    constraintsTotal: number;
    constraintsReviewed: number;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  };
  insufficientContext: string[];
}

export interface JudgeUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
}
