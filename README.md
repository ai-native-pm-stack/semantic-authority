# Semantic Authority

**Make system meaning explicit, machine-legible, and enforceable.**

CLAUDE.md tells agents *how to work*. **MEANING.yaml tells them *what the work must mean*.**

---

## The Problem

AI has made execution cheap. Agents generate code, write tests, and ship features faster than any human team. But speed without shared understanding produces **fast drift** — systems that evolve rapidly toward incoherence.

When a constraint is unstated, an agent doesn't ask for clarification. It picks a plausible interpretation and executes. **Silence is interpreted as permission.**

The bottleneck has moved. It is no longer "can we build this?" It is **"do we agree on what this should mean?"**

---

## The Mental Model

```
              WHO CREATES MEANING?
                     │
              ┌──────┴──────┐
              │   Humans    │
              │  (PM, Arch, │
              │   Eng Lead) │
              └──────┬──────┘
                     │
               writes / updates
                     │
                     ▼
             ┌───────────────┐
             │ MEANING.yaml  │  ◄── The Artifact
             │               │      (lives in your repo root)
             │ • goals       │
             │ • non-goals   │
             │ • constraints │
             │ • trade-offs  │
             │ • drift policy│
             └───────┬───────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │  Devs    │ │ AI Agents│ │    CI    │
  │          │ │ (Claude, │ │ Pipeline │
  │ Read it  │ │  Cursor) │ │          │
  │ before   │ │ Consume  │ │ Enforce  │
  │ coding   │ │ it as    │ │ it as    │
  │          │ │ context  │ │ gates    │
  └──────────┘ └──────────┘ └──────────┘
```

**Three layers:**

| Layer | What | Who |
|-------|------|-----|
| **Education** | Docs teach why this matters and how to write MEANING.yaml | Everyone |
| **Artifact** | MEANING.yaml declares what the system means | PM, Architect, Tech Lead (authors); Devs + Agents (consumers) |
| **Enforcement** | CLI + GitHub Action validate, detect drift, gate merges | CI (automated); Devs (see drift reports in PRs) |

---

## Quickstart

### 1. Create a MEANING.yaml

```bash
npx @semantic-authority/cli init
```

Interactive wizard asks: system name, primary goal, non-goals, first constraints. Generates `MEANING.yaml` at your repo root and `.claude/meaning-context.md` for agent consumption.

If the npm package is not published yet, use the local source instructions in [`packages/cli/README.md`](./packages/cli/README.md).

### 2. Validate it

```bash
npx @semantic-authority/cli validate
```

Checks schema, constraint ID format, minimum non-goals, enforcement levels.

### 3. Generate agent context

```bash
npx @semantic-authority/cli context
```

Converts MEANING.yaml into a `.claude/meaning-context.md` that Claude Code, Cursor, or any LLM agent can consume. Append to your CLAUDE.md or load as a skill.

### 4. Add CI enforcement

```yaml
# .github/workflows/meaning.yml
name: Meaning Gate
on: [pull_request]
jobs:
  meaning:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Use @main until the first release tag exists, then pin to @v1.
      - uses: ai-native-pm-stack/semantic-authority/action@main
        with:
          validate: true
          gate: true
```

---

## What's in MEANING.yaml?

```yaml
system: invoice-processor
version: 1.0.0
status: active
owner: finance-engineering
last_reviewed: 2026-03-09

goal:
  primary: >
    Enable finance teams to submit, approve, and track invoices
    with automated compliance checks and audit trails.
  success_criteria:
    - "Invoice submitted to fully approved in under 48 hours for standard amounts"
    - "Zero duplicate payments for the same vendor and invoice number"
  non_goals:
    - "Does not handle payment execution — delegates to bank integration"
    - "Does not support expense report or reimbursement workflows in v1"
    - "Does not provide tax calculation or filing"
    - "Does not manage vendor onboarding or KYC"
    - "Does not support multi-currency invoices in v1 — all amounts in USD"

constraints:
  - id: C-FIN-NO-DOUBLE-PAY-001
    description: "An invoice must never be paid twice for the same vendor and invoice number"
    category: business
    enforcement: block
    owner: finance-engineering
    rationale: "Duplicate payments cause direct financial loss"
    source: declared
    confidence: high

  - id: C-SEC-PII-REDACT-002
    description: "System must never expose vendor bank account numbers in API responses or logs"
    category: security
    enforcement: block
    owner: security
    rationale: "Bank account numbers are sensitive financial PII"
    source: declared
    confidence: high

  - id: C-PERF-SEARCH-P95-004
    description: "Invoice search P95 latency must remain under 500ms"
    category: operational
    enforcement: warn
    owner: finance-engineering
    rationale: "Slow search blocks month-end reconciliation"
    source: declared
    confidence: medium

trade_offs:
  chosen:
    approach: "Optimistic locking for concurrent invoice approvals"
    rationale: "Approval conflicts are rare; avoids blocking the common path"
  rejected:
    - alternative: "Pessimistic locking with row-level locks"
      reason: "Adds 50-100ms latency and deadlock risk under load"
      revisit_condition: "If approval conflicts exceed 1% of total approvals"

drift_policy:
  review_cadence: monthly
  enforcement_rules:
    block: "Violation must not merge without remediation or an approved drift record"
    warn: "Acknowledgement required with owner and revisit date"
    observe: "Logged for trend analysis; reviewed monthly"
```

---

## Docs

| Document | Audience | What It Covers |
|----------|----------|----------------|
| [MANIFESTO.md](./MANIFESTO.md) | Everyone | Why Semantic Authority exists — the philosophical anchor |
| [GUIDE.md](./GUIDE.md) | PMs, Architects, Tech Leads | How to write a MEANING.yaml — step-by-step, checklists, FAQ |
| [AGENTS.md](./AGENTS.md) | Engineers, Agent builders | How AI agents consume MEANING.yaml — operating modes, multi-agent coordination |
| [docs/GENERATE_MEANING_PROMPT.md](./docs/GENERATE_MEANING_PROMPT.md) | PMs, anyone with a BRD/PRD | LLM prompt template to generate a draft MEANING.yaml from existing product docs |
| [packages/cli/README.md](./packages/cli/README.md) | Engineers, maintainers | CLI install, commands, and smoke-test path |
| [action/README.md](./action/README.md) | Engineers, DevOps | GitHub Action usage and release-state notes |

---

## How Different Roles Use This

**Product Managers** author and update MEANING.yaml — writing goals, non-goals, and trade-offs. They review drift reports to understand where the system is diverging from intent. Have an existing BRD/PRD? Use the [generation prompt](./docs/GENERATE_MEANING_PROMPT.md) to create a draft MEANING.yaml with any LLM, or use the Claude Code skill (`skills/generate-meaning.md`) to generate one directly in your IDE.

**Architects & Tech Leads** author constraints and enforcement levels. They run `meaning validate` during design reviews. They review cross-system meaning coherence when constraints in one service affect another.

**Engineers** read MEANING.yaml before writing code. They cite constraint IDs in PR descriptions. They see drift reports as automated PR comments and respond to flagged constraints.

**AI Agents** (Claude Code, Cursor, Copilot) receive auto-generated context from `meaning context`. They know the system's goals, respect its non-goals, honor its constraints by ID, and understand its trade-offs before writing a single line of code.

**CI Pipelines** run the tool automatically on every PR. Schema validation catches broken artifacts. Drift detection flags potentially affected constraints. Gates block merges when block-level constraints may be violated.

---

## What Ships vs. What's Generated

The `.claude/` directory is **not** part of this package. It is a generated **output** in your project.

| File | Where It Lives | Who Creates It | Committed? |
|------|---------------|----------------|------------|
| `MEANING.yaml` | **Your repo root** | You (human) | ✅ Yes — this is your source of truth |
| `.claude/meaning-context.md` | **Your repo** `.claude/` | `meaning context` (auto-generated) | ❌ No — regenerate from MEANING.yaml anytime |
| `@semantic-authority/cli` | **npm registry** | This project | N/A — installed as dependency or run via npx |

**Flow:** You write `MEANING.yaml` → CLI reads it → generates `.claude/meaning-context.md` → Claude Code auto-loads it.

Add `.claude/meaning-context.md` to your project's `.gitignore`. It's a build artifact, not a source file.

---

## Repo Structure

```
semantic-authority/
├── README.md              ← You are here
├── MANIFESTO.md           ← Why (1 page)
├── GUIDE.md               ← How to write MEANING.yaml
├── AGENTS.md              ← How agents consume it
├── LICENSE
│
├── docs/
│   └── GENERATE_MEANING_PROMPT.md  ← LLM prompt to generate from BRD/PRD
│
├── skills/
│   └── generate-meaning.md         ← Claude Code skill for generation
│
├── packages/cli/          ← The `meaning` CLI
│   ├── package.json
│   ├── src/
│   │   ├── commands/      ← init, validate, context
│   │   └── schema/        ← JSON Schema for MEANING.yaml
│   └── tests/
│
├── action/                ← GitHub Action wrapper
│   └── action.yml
│
└── examples/
    └── invoice-processor/ ← Worked example
        └── MEANING.yaml
```

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

## License

MIT License — Copyright 2026 Samson Aligba

---

Maintained as part of the AI Native PM Stack.
