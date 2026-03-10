# How AI Agents Consume MEANING.yaml

A practical guide for engineers building with AI coding agents.

---

## The Key Rule

> Agents may execute within declared meaning.
> They may not invent meaning.

**Meaning is the boundary.**

Agents that operate without explicit meaning boundaries will make reasonable-sounding decisions that violate unstated constraints. They will optimize for the wrong things. They will drift. They will be confidently wrong.

The solution is not better prompts. The solution is a single, authoritative source of meaning that all agents consume.

---

## What Agents Must Consume

### Required: The MEANING.yaml

Goals, non-goals, constraints (with enforcement levels), and trade-offs. Must include version and constraint IDs for precise reference.

### Optional but Useful: Interface Specs

API schemas, database schemas, user-facing copy requirements, logging and audit requirements. These help agents understand the implementation surface.

### Required if They Exist: Drift Records

Known deviations, temporary exceptions, and context for why the system is currently in a particular state. An agent implementing a feature needs to know if there's an active exception that affects its work.

### What Agents Should NOT Rely On

PRD prose, Slack history, meeting notes, or tribal memory. These are useful for human context but unreliable for agent consumption. **If it matters, it must be in the MEANING.yaml.**

---

## How Agents Get the Context

The `meaning context` command generates a `.claude/meaning-context.md` file from your MEANING.yaml. This file translates structured YAML into prose instructions that any LLM agent can consume.

```bash
npx @semantic-authority/cli context
```

The generated file looks like:

```markdown
## System Meaning (auto-generated — do not edit manually)
## Source: MEANING.yaml v1.0.0 | Last reviewed: 2026-03-09

### This System's Purpose
Enable finance teams to submit, approve, and track invoices
with automated compliance checks and audit trails.

### BLOCK-Level Constraints (must never violate)
- **C-FIN-NO-DOUBLE-PAY-001**: An invoice must never be paid
  twice for the same vendor and invoice number
- **C-SEC-PII-REDACT-002**: System must never expose vendor
  bank account numbers in API responses or logs

### WARN-Level Constraints (flag if affected)
- **C-PERF-SEARCH-P95-004**: Invoice search P95 latency must
  remain under 500ms

### This System Does NOT
- Handle payment execution (delegates to bank integration)
- Support expense report or reimbursement workflows in v1
- Provide tax calculation or filing
- Manage vendor onboarding or KYC
- Support multi-currency invoices in v1

### Trade-Offs You Should Know
- We chose optimistic locking for concurrent invoice approvals
  over pessimistic locking. Revisit if approval conflicts
  exceed 1% of total approvals.

### When You Write Code
- Cite constraint IDs in PR descriptions and code comments
- Do not widen scope beyond declared non-goals
- If you cannot cite a relevant constraint, the MEANING.yaml
  may be incomplete — flag this for human review
```

**For Claude Code:** Append this to your CLAUDE.md or place it in `.claude/meaning-context.md` (Claude Code auto-loads files in `.claude/`).

**For Cursor:** Add to `.cursorrules` or the project's context configuration.

**For other agents:** Include the generated file in whatever context injection mechanism the agent supports.

---

## Agent Operating Modes

### Mode A: Execution (Default)

The agent implements features that satisfy constraints.

**Responsibilities:**
- Cite which constraint(s) it is honoring by ID
- Do not widen scope beyond declared non-goals
- If implementation requires violating a constraint, stop and surface the conflict to a human

**Output:** Code changes, tests, and a constraint coverage note.

**Example PR description from an agent in execution mode:**
```
Implements bulk invoice import via CSV upload.

Constraints honored:
- C-FIN-NO-DOUBLE-PAY-001: Deduplication check on (vendor_id, invoice_number) before insert
- C-PERF-SEARCH-P95-004: Import runs async; no impact on search latency
- C-SEC-PII-REDACT-002: Bank fields stripped from import confirmation response

Non-goals respected:
- Did not add OCR/document scanning
- Did not add multi-currency support
```

If an agent cannot cite relevant constraints, that's a signal that the MEANING.yaml is incomplete.

---

### Mode B: Drift Detection (Review)

The agent compares implementation to canonical meaning. It identifies mismatches and classifies severity using enforcement levels.

**Responsibilities:**
- Compare code changes against declared constraints
- Classify mismatches: block (must fix), warn (acknowledge), observe (note)
- Surface block-level mismatches immediately

**Output:** Structured drift report with suggested fix or suggested meaning update.

**Example drift report:**
```
## Drift Report — PR #247

| Constraint | Status | Action |
|------------|--------|--------|
| C-FIN-NO-DOUBLE-PAY-001 | VIOLATION | block — PR adds payment path that skips duplicate check |
| C-SEC-PII-REDACT-002 | OK | Not affected |
| C-PERF-SEARCH-P95-004 | DRIFT | warn — New join adds ~200ms to invoice search |

Recommendation: Fix C-FIN violation before merge. Acknowledge C-PERF drift with owner and revisit date.
```

---

### Mode C: Meaning Revision (Human-Led)

The agent proposes updates to the MEANING.yaml based on observed patterns, new requirements, or detected gaps.

**Responsibilities:**
- Include trade-off analysis and impact assessment
- **Must not self-approve changes** — propose only
- Flag for human review

**Output:** Proposed patch to MEANING.yaml with rationale text and risk assessment.

```yaml
# Proposed addition to constraints:
- id: C-FIN-LATE-FEE-CALC-007
  description: "Late payment fee must never exceed the original invoice amount"
  category: business
  enforcement: block
  owner: finance-engineering
  rationale: "Uncapped late fees create legal exposure and vendor disputes"
  source: assumed  # Inferred from observed bug pattern
  confidence: medium

# Rationale: Two incidents this quarter where compounding late fees
# exceeded the invoice total. This constraint was implicit but not declared.
# Recommend promoting to block-level enforcement.
```

**Humans adjudicate. Agents propose.**

---

## Multi-Agent Systems

Multi-agent systems fail when each agent carries a different understanding of truth. Without coordination, agents produce conflicting outputs, make incompatible assumptions, and amplify drift rather than correct it.

**The fix is architectural:** A single source of meaning (MEANING.yaml) that all agents consume.

### Coordination Rules

- All agents reference the same MEANING.yaml
- All agents cite constraint IDs rather than reinterpreting prose
- All agents output structured diffs that can be compared and reconciled
- Humans adjudicate conflicts. Agents propose.

### Recommended Multi-Agent Roles

| Agent Role | Function | Output |
|---|---|---|
| **Builder Agent** | Writes code and tests, citing constraint IDs and non-goals | Code changes + constraint coverage note |
| **Verifier Agent** | Checks implementation against constraints and success criteria | Structured drift report |
| **Spec Steward** (optional) | Proposes meaning updates based on observed drift patterns | Proposed MEANING.yaml patch for human review |

The Spec Steward cannot merge its own proposals — it only drafts. This prevents agents from silently evolving the system's meaning.

---

## Relationship to CLAUDE.md / AGENT.md

CLAUDE.md and MEANING.yaml serve **different purposes** and are **both necessary.**

| | CLAUDE.md / AGENT.md | MEANING.yaml |
|---|---|---|
| **Contains** | Operational context: how to work in this repo | Semantic boundaries: what the system must mean |
| **Describes** | Tool usage, conventions, code style, test commands | Goals, non-goals, constraints, trade-offs |
| **Scope** | Agent-specific (different agents might have different files) | System-canonical (one source of truth for all actors) |
| **Durability** | Updated when tooling changes | Updated when meaning changes |

**Prompts consume meaning. They do not define it.**

The `meaning context` command generates the bridge — translating structured MEANING.yaml into prose that gets injected into CLAUDE.md or equivalent agent context files.

---

## Micro-Examples

### Block-Level Drift

**Constraint:** `C-FIN-NO-OVERDRAFT-001` — Enforcement: `block`

**Observed:** Recurring payments deduct even when balance is insufficient, triggering overdraft for users who have not opted in.

**Handling:** Verifier Agent flags as BLOCK. CI fails merge. Human decides: fix the code (most likely), revise the meaning (rare — requires explicit approval), or create a temporary exception with expiry (possible but dangerous).

**Outcome:** Either implementation becomes compliant, or meaning artifact changes and the diff is reviewable. That's governance.

### Warn-Level Drift

**Constraint:** `C-PERF-RESPONSE-P95-002` — Enforcement: `warn`

**Observed:** New feature adds a third-party API call. P95 response time is now 280ms (budget was 200ms).

**Handling:** Verifier Agent flags as WARN. CI passes but surfaces warning. PR includes acknowledgement: "Accepted: response time degradation is temporary. Async refactor planned for next sprint. Owner: @alice. Revisit by: 2026-04-15."

**Outcome:** The trade-off is visible. The decision is documented. Future maintainers know it was intentional, not accidental. If the revisit date passes without resolution, the warning escalates.
