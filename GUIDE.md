# How to Write a MEANING.yaml

A practical guide for PMs, architects, tech leads, and anyone responsible for making system intent explicit.

---

## What Is a MEANING.yaml?

A MEANING.yaml defines the **validity boundaries** of a system. It is the constitution of a feature, product, or platform.

It answers one question: **Under what conditions is this system valid?**

It declares:
- What must hold (constraints)
- What must never happen (invariants)
- What is intentionally excluded (non-goals)
- Who owns each boundary (ownership)
- How violations are handled (enforcement)

It is not a PRD. It is not a design doc. It is not an implementation plan. It defines **limits, not features.**

That does not make it “technical only.”

In a healthy team:

- PMs use it to make scope boundaries and trade-offs explicit
- architects and tech leads use it to encode invariants and ownership
- engineers use it to keep implementation aligned
- agents use generated context derived from it

The same semantic contract serves different roles without forcing them into the same interface.

---

## Why Existing Artifacts Fall Short

The problems MEANING.yaml addresses are not new. Teams already have artifacts. But each captures only part of the picture:

| Artifact | What It Captures | What It Lacks |
|----------|-----------------|---------------|
| **PRD** | Goals, user stories, narrative context | Not structured. Not version-controlled with code. No enforcement. |
| **ADR** | Past decisions, trade-offs, rationale | No goals, no non-goals, no constraints. Not enforced. Historical, not governing. |
| **RFC** | Proposals, alternatives considered | Point-in-time. Rarely maintained after approval. Prose, not structured. |
| **CLAUDE.md / AGENT.md** | Operational context for agents (how to work) | No system meaning (what the work must mean). Unstructured prose. |
| **Skills / System Prompts** | Reusable prompting patterns, task instructions, agent behaviors | Ephemeral execution guidance. They consume meaning but do not canonically define system validity. |
| **OpenAPI / JSON Schema** | Interface structure with precision | Structure, not intent. No "why" or "what not." |
| **Test Suite** | Expected behavior | Behavior, not meaning. Tests verify *what the system does*, not *what it's for*. |
| **Compliance Docs** | Regulatory constraints | Disconnected from code. Enforced by audit, not CI. |

MEANING.yaml creates a single artifact that combines the goal-setting of PRDs, the trade-off documentation of ADRs, the constraint specificity of compliance docs, and the machine-legibility of schemas — while living in the repo alongside code.

The contribution is not new ideas. It is new **integration**.

That does **not** mean MEANING.yaml replaces those source artifacts.

Treat it as the **minimum canonical subset** of intent you want humans, agents, and CI to share:

- PRDs still carry narrative, user value, roadmap, and stakeholder context
- ADRs and RFCs still carry technical history and alternatives
- OpenAPI and schemas still carry interface shape
- MEANING.yaml carries the constraints, non-goals, and trade-offs worth making machine-consumable and reviewable

If you copy everything into MEANING.yaml, it becomes another stale document.
If you keep only what must be shared and checked, it becomes useful.

---

## The Nine Steps

### Step 1 — Define the Primary Goal

Write one precise sentence.

**Template:**

> Enable [who] to [do what] such that [observable outcome].

**Example:**

> Enable subscribers to pause billing such that no charges occur during pause and billing resumes only upon explicit user action.

If the outcome cannot be observed or measured, rewrite it.

---

### Step 2 — Declare Non-Goals

Non-goals prevent drift. **Minimum: 5.**

Ask:
- What adjacent functionality might someone assume exists?
- What are we explicitly not solving?
- What will another system handle?

**Examples:**
- Does not support prorated billing in v1.
- Does not modify subscription plan tiers.
- Does not expose pause APIs publicly.
- Does not process refunds.
- Does not auto-resume subscriptions.

**If someone could accidentally build it, it belongs here.**

Non-goals are scope boundaries, not roadmap items. They declare what the system is *not*, which is as important as what it is. A system without declared non-goals will drift toward doing everything poorly.

---

### Step 3 — Identify Invariants (Hard Constraints)

These are non-negotiable boundaries.

Ask:
- What would create legal exposure?
- What would cause financial loss?
- What would break user trust immediately?
- What assumptions are currently undocumented?

Each invariant must be: **testable, measurable, and binary.**

**Good:**
> Subscriber must never be charged after cancellation.

**Bad:**
> Subscriber should not usually be charged after cancellation.

If violation would be considered a bug or incident, enforcement = `block`.

---

### Step 4 — Define Operational Constraints

These define performance or reliability boundaries.

**Examples:**
- P95 latency must remain under 500ms.
- OTP valid for 10 minutes.
- Maximum retry attempts = 3.

If violation is not existential but still important, enforcement = `warn`.

---

### Step 5 — Declare Trade-Offs

Every system sacrifices something. Document:
- What was chosen
- What was rejected
- Why
- When to revisit

**Example:**
```yaml
trade_offs:
  chosen:
    approach: "Eventual consistency"
    rationale: "Lower latency and reduced distributed complexity"
  rejected:
    - alternative: "Strong consistency"
      reason: "Increased coupling and 200ms latency overhead"
      revisit_condition: "Transaction volume exceeds 10K/day"
```

Undocumented trade-offs will be rediscovered and relitigated.

---

### Step 6 — Assign Ownership

Every constraint must have a role owner. Use roles, not individuals.

**Examples:** `payments-team`, `security`, `compliance`, `platform-engineering`, `product`

If no one owns it, it will decay.

---

### Step 7 — Define Enforcement Level

Each constraint must specify:
- **block** — violation halts merge or deployment
- **warn** — violation requires acknowledgment and revisit date
- **observe** — violation logged for review

**Guideline:**

| Condition | Enforcement |
|-----------|------------|
| Illegal or creates legal exposure | block |
| Financially harmful | block |
| Trust-destroying | block |
| Performance degradation | warn |
| Exploratory or trend-tracking | observe |

---

### Step 8 — Define Drift Policy

Specify:
- Review cadence (monthly, quarterly, post-incident)
- Exception process
- Required drift record fields

Do not rely on cadence alone. The practical pattern is:

- **event-driven review** when meaning changes
- **scheduled review** as a backstop

Good event triggers:

- a new constraint or non-goal is introduced
- an incident reveals an unstated assumption
- a PR intentionally crosses a declared boundary
- an architecture decision changes what a constraint depends on
- an agent or reviewer returns `insufficient_context`

**Drift record fields:**
- `drift_id`
- `constraint_id`
- `observed_divergence`
- `impact_assessment`
- `decision` (fix | update_meaning | exception)
- `owner`
- `date`
- `expiry`

**If drift handling is undefined, authority becomes advisory.**

---

### Step 9 — Capture Provenance

Include:
- Source summary (where did this information come from?)
- Assumptions (what was inferred, not stated?)
- Clarifications needed (what remains ambiguous?)

If something was inferred, label it explicitly. Unmarked assumptions become silent failures.

---

## Constraint ID Format

```
C-<DOMAIN>-<SHORTNAME>-<NNN>
```

Where DOMAIN is one of: `FIN`, `SEC`, `COMPLIANCE`, `DATA`, `UX`, `PERF`, `REL`, `ARCH`, `OPS`

**Example:** `C-FIN-NO-DUP-CHARGE-001`

IDs must be stable across versions. They are referenced by agents, tests, PR descriptions, and drift reports.

---

## The Canonical YAML Schema

```yaml
system: [system-name-kebab-case]
version: 1.0.0
status: draft | active | deprecated
owner: [owner-role]
last_reviewed: [YYYY-MM-DD]

goal:
  primary: "[precise goal statement]"
  success_criteria:
    - "[observable outcome 1]"
    - "[observable outcome 2]"
  non_goals:
    - "[explicit exclusion 1]"
    - "[explicit exclusion 2]"
    - "[explicit exclusion 3]"
    - "[explicit exclusion 4]"
    - "[explicit exclusion 5]"

constraints:
  - id: C-<DOMAIN>-<SHORTNAME>-001
    description: "[testable condition]"
    category: business | operational | architectural | security | data
    enforcement: block | warn | observe
    owner: "[owner-role]"
    rationale: "[why this exists]"
    source: declared | assumed
    confidence: high | medium | low

trade_offs:
  chosen:
    approach: "[selected approach]"
    rationale: "[why selected]"
  rejected:
    - alternative: "[alternative]"
      reason: "[why rejected]"
      revisit_condition: "[when to revisit]"
  known_risks:
    - risk: "[risk]"
      mitigation: "[mitigation]"

interfaces:
  consumes:
    - "[dependency]"
  provides:
    - "[capability / API / event]"

evolution:
  current_focus: "[what this version optimizes for]"
  future_considerations:
    - "[likely extension]"

drift_policy:
  review_cadence: "[monthly | quarterly | after incidents]"
  enforcement_rules:
    block: "Violation must not merge without remediation or approved drift record"
    warn: "Acknowledgement required with owner and revisit date"
    observe: "Logged for trend analysis; reviewed periodically"
  drift_record_fields:
    - drift_id
    - constraint_id
    - observed_divergence
    - impact_assessment
    - decision
    - owner
    - date
    - expiry

provenance:
  source_summary: "[1-3 sentence summary of input]"
  assumptions:
    - "[assumption]"
  clarifications_needed:
    - "[question]"
```

---

## Checklists

### Before Finalizing (Human Checklist)

- [ ] Is the primary goal precise and observable?
- [ ] Are at least five non-goals listed?
- [ ] Are all invariants testable and binary?
- [ ] Does each constraint have an enforcement level and owner?
- [ ] Are trade-offs declared with rationale?
- [ ] Is drift policy defined?
- [ ] Is provenance captured (what was assumed vs. declared)?

### Before Using With Agents (AI Checklist)

- [ ] All constraints categorized?
- [ ] Enforcement level assigned to every constraint?
- [ ] Owner specified for every constraint?
- [ ] Constraint IDs stable and referenceable?
- [ ] Assumptions explicitly marked?
- [ ] Vague language removed?
- [ ] Numbers concrete or marked TBD?

---

## The Meaning Gate in Delivery Pipelines

Implementation doesn't require sophisticated tooling. Start simple and add enforcement incrementally.

### Stage 1: Social Enforcement (~1 week to establish)

PR checklists include confirmation that MEANING.yaml was updated if scope or constraints changed. Agents produce drift reports as PR comments. Reviewers check for constraint coverage.

This requires no tooling — just discipline and a modified PR template.

### Stage 2: Soft Gates (~week 2-4)

CI runs schema validation of MEANING.yaml structure. Drift heuristic checks run automatically. Failures produce warnings but do not block merges. Teams build muscle memory around the workflow.

```bash
npx @semantic-authority/cli validate  # Schema check
npx @semantic-authority/cli drift     # Drift heuristic
```

### Stage 3: Hard Gates (~week 4+)

Block-level constraints become actual merge or deploy gates. A PR that violates a block-level constraint cannot merge until the violation is resolved or an exception is formally documented.

Exceptions require a Drift Record with an owner, rationale, and expiry date.

Teams that try to implement hard gates immediately often abandon the framework because it feels like bureaucracy. Teams that build the habit first find that hard gates feel natural by the time they're introduced.

---

## Where MEANING.yaml Should Live

The canonical meaning artifact must be **version-controlled alongside the code it governs**. This is non-negotiable. If meaning and implementation can drift apart without detection, the framework provides no value.

**Repository root** is the simplest approach. A `MEANING.yaml` at the repository root makes the artifact discoverable and signals its importance. This works well for monolithic applications and small services.

**Per-service or per-domain directories** work better for larger systems. Each bounded context or service maintains its own meaning artifact. A top-level artifact can reference these and declare system-wide constraints that apply across services.

**Monorepo patterns** require slightly more structure. A `meanings/` directory at the root contains artifacts for each major system or domain. Package-level meaning artifacts reference the appropriate domain artifact.

**What to avoid:** Storing meaning artifacts in wikis, Notion, Google Docs, or other systems disconnected from the codebase.

---

## Sizing Guide

A MEANING.yaml for a typical feature should be **20 to 50 lines**. The goal is not comprehensive documentation. The goal is explicit, machine-legible declaration of what matters most.

| System Size | Constraints | Non-Goals | Typical YAML Size |
|-------------|------------|-----------|-------------------|
| Single feature | 3-5 | 5 | 20-30 lines |
| Microservice | 5-10 | 5-8 | 40-60 lines |
| Platform / monolith | 10-20 | 10-15 | 80-120 lines |

If your MEANING.yaml exceeds 150 lines, you're probably governing too much in one artifact. Split by domain.

---

## FAQ

### Won't MEANING.yaml just rot like all our other documentation?

It might. Documentation rot is an incentive problem, not a format problem. The framework mitigates this by keeping artifacts in the repository, changing them in the same PRs as code, and enforcing them in CI — creating tighter coupling than wiki-based documentation. But tighter coupling isn't immunity. If your organization has repeatedly failed to maintain living documentation, address those underlying incentive problems first.

### We already have PRDs, ADRs, and RFCs. Isn't this just another artifact?

Yes. It adds an artifact; it doesn't eliminate existing ones. PRDs still serve narrative purposes. ADRs still capture detailed rationale. MEANING.yaml extracts and structures a specific subset — goals, constraints, trade-offs — that current artifacts handle poorly. The bet is that governance value exceeds maintenance cost. For small teams with strong shared context, that bet may not pay off.

### Current AI agents don't consume structured constraints reliably. Isn't this premature?

Partially. Current agents are improving but remain limited — they hallucinate compliance and ignore non-goals. However, the framework provides value for human coordination independent of agent capabilities: canonical references, onboarding documentation, review checklists, audit trails. The agent use case is additive. If agents plateau, the framework is still useful but less transformative.

### Won't this become bureaucratic gate-keeping?

It can. Every governance mechanism can be weaponized. The framework includes mitigations (enforcement levels, exception mechanisms, explicit ownership), but these can also be subverted. If your organization has adversarial relationships between teams, fix the culture first.

### When should we explicitly NOT adopt this?

When documentation initiatives consistently fail due to maintenance neglect. When your team is small with low turnover and strong implicit understanding. When you're in early exploration and meaning is genuinely uncertain. When you cannot allocate explicit time for governance activities. The framework is a tool suited for some contexts and poorly suited for others.

### How is this different from spec-driven development?

They solve different problems and are complementary. Spec-driven development (OpenAPI, Protobuf, JSON Schema) defines **interface shape** — what fields exist, what types they have, what endpoints accept and return. MEANING.yaml defines **validity boundaries** — what must never happen, what the system is not for, and what trade-offs were made. An OpenAPI spec can tell you the `/invoices` endpoint returns an `InvoiceResponse` object. It cannot tell you that the system deliberately excludes multi-currency, that approval thresholds are a SOX requirement, or that optimistic locking was chosen over pessimistic locking. A well-governed system has both: specs for interface correctness, MEANING.yaml for semantic correctness.

### Is this consultant-ware?

It can be implemented simply or elaborately. The core — a structured artifact declaring goals, constraints, and trade-offs, version-controlled with code — requires no consultants. If you couldn't implement a useful version in a day, you're over-engineering. If someone is selling you an expensive implementation, be skeptical.

---

## A Realistic Assessment

MEANING.yaml adds the most value for:
- Teams with AI agents in the development loop
- Systems with significant regulatory or safety constraints
- Mature products with high turnover or distributed decision-making
- Multi-team or multi-service architectures

It adds less value for:
- Very early-stage exploration where meaning is genuinely uncertain
- Small teams with low turnover and strong shared context
- Disposable prototypes or experiments
- Organizations that cannot allocate governance time

If implementing Semantic Authority feels like bureaucracy, you're over-engineering it. The artifact for a typical feature should be twenty to fifty lines. The goal is not comprehensive documentation. The goal is explicit, machine-legible declaration of what matters most.
