import type { Constraint, MeaningDoc } from "./types.js";

export function compileReviewTargets(doc: MeaningDoc): Constraint[] {
  const declaredConstraints = Array.isArray(doc.constraints) ? doc.constraints : [];
  const nonGoals = Array.isArray(doc.goal?.non_goals) ? doc.goal.non_goals : [];

  const compiledNonGoals = nonGoals.map((text, index) => ({
    id: nonGoalConstraintId(index),
    description: `Non-goal: ${text}`,
    category: "scope",
    enforcement: "warn",
    owner: doc.owner || "product",
    rationale:
      "This capability is explicitly out of scope. Flag diffs that introduce, normalize, or document it without a deliberate meaning update.",
    source: "declared",
    confidence: "high",
    verification_notes:
      "Review implementation, public docs, and examples for additions that expand the system into this out-of-scope capability.",
  })) satisfies Constraint[];

  return [...declaredConstraints, ...compiledNonGoals];
}

function nonGoalConstraintId(index: number): string {
  return `NG-SCOPE-${String(index + 1).padStart(3, "0")}`;
}
