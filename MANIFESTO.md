# The Manifesto

## Semantic Authority

**Complex systems fail when intent is not understood.**

---

AI has made execution cheap and fast.
It has not made understanding cheaper.

As execution accelerates, systems accumulate complexity faster than shared mental models can keep up. When intent is implicit, speed becomes a liability.

Historically, product managers, engineers, and engineering managers served as translation layers — turning human goals into coherent system requirements. This role relied on conversation, tacit knowledge, and informal documentation.

AI-accelerated development has broken this equilibrium.

Systems now evolve faster than intent can be communicated verbally or preserved implicitly.

Prompt engineering contextualizes execution for known workflows.
It does not create intent for new ones.

Multi-agent systems do not solve this problem.
Without shared, explicit meaning, they amplify drift, contradiction, and incoherence.

Meaning cannot live in prompts.
Prompts are ephemeral. Meaning must be durable.

---

## The belief:

**Human goals must become explicit system meaning.**

Constraints must be declared, not rediscovered.

Trade-offs must be documented, not buried.

Requirements must be legible to machines, not just humans.

Systems must be explainable by construction, not post-hoc.

---

The teams that survive will not be the fastest builders.

They will be the ones who can make meaning legible to both humans and machines.

---

## Enforcement & Drift

Divergence is inevitable. Governance is the response.

**Three responses to divergence:**

- **Block** — for hard constraints and invariants (safety, regulatory, financial correctness)
- **Warn** — for soft constraints and trade-offs (drift is costly, not catastrophic)
- **Observe** — for exploratory areas (drift is informative)

Enforcement is rule-scoped. Each constraint declares its enforcement level. No blanket policy.

Humans adjudicate meaning. Machines can detect and gate. Only humans decide what the system should mean.

**If it matters, it must be enforceable.** A system of meaning that cannot block anything is advisory by default.

---

## The Core Principle

> Tests enforce behavior.
> Specs describe intent.
> Prompts influence execution.
> **Semantic Authority defines validity.**
>
> Tests are the operational floor.
> Authority is the semantic ceiling.
> Between them, drift becomes visible.

---

**If it matters enough to defend in a postmortem,
it matters enough to exist in the MEANING.yaml.**
