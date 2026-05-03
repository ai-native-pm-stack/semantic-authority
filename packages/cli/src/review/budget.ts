import type { Constraint, Diff } from "./types.js";
import { fileContextToText } from "./diff.js";

// Pricing per 1M tokens (USD). Conservative defaults; override via --pricing later.
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-7": { input: 15, output: 75 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
  "gpt-5.5": { input: 5, output: 30 },
  "gpt-5.4": { input: 2.5, output: 15 },
  "gpt-5.4-mini": { input: 0.75, output: 4.5 },
  "gpt-5.4-nano": { input: 0.2, output: 1.25 },
  "gpt-5.1": { input: 1.25, output: 10 },
  "gpt-5": { input: 1.25, output: 10 },
};

export function estimateTokens(text: string): number {
  // Rough char-based heuristic: ~4 chars/token for English+code.
  return Math.ceil(text.length / 4);
}

export function estimatePromptTokens(constraints: Constraint[], diff: Diff): number {
  const constraintText = constraints
    .map((c) => `${c.id} ${c.description} ${c.rationale} ${c.verification_notes ?? ""}`)
    .join("\n");
  const diffText = diff.files.map((f) => f.rawPatch).join("\n");
  const fileContextText = fileContextToText(diff);
  return (
    estimateTokens(constraintText) +
    estimateTokens(diffText) +
    estimateTokens(fileContextText) +
    800
  ); // +overhead
}

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const p = PRICING[model] ?? { input: 15, output: 75 };
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

export interface BudgetCheck {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
  withinBudget: boolean;
}

export function checkBudget(
  model: string,
  constraints: Constraint[],
  diff: Diff,
  budgetUsd: number
): BudgetCheck {
  const inputTokens = estimatePromptTokens(constraints, diff);
  const outputTokens = Math.min(2000, Math.max(400, constraints.length * 80));
  const cost = estimateCostUsd(model, inputTokens, outputTokens);
  return {
    estimatedInputTokens: inputTokens,
    estimatedOutputTokens: outputTokens,
    estimatedCostUsd: cost,
    withinBudget: cost <= budgetUsd,
  };
}
