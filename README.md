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
      - uses: semantic-authority/meaning-action@v1
        with:
          validate: true
          gate: true
```

---

## What's in MEANING.yaml?

```yaml
system: hotel-booking-service
version: 1.0.0
status: active
owner: platform-team
last_reviewed: 2026-03-09

goal:
  primary: >
    Enable B2B clients to offer hotel search with composable perks
    to their premium members through API or embedded UI.
  success_criteria:
    - "B2B client can onboard, configure pricing, and search hotels within 1 hour"
    - "Hotel search returns results with matched perks in under 2 seconds"
  non_goals:
    - "Does not handle payment processing directly — delegates to Stripe"
    - "Does not support B2C direct consumer signups in v1"
    - "Does not provide flight search or booking"
    - "Does not manage loyalty points or frequent flyer programs"
    - "Does not support offline or call-center booking flows"

constraints:
  - id: C-FIN-PAYMENT-CONFIRMED-001
    description: "Booking must never be marked confirmed without a verified payment webhook"
    category: business
    enforcement: block
    owner: payments-team
    rationale: "Financial and legal exposure if bookings confirm without payment"
    source: declared
    confidence: high

  - id: C-SEC-NO-CARD-STORAGE-002
    description: "System must never store raw credit card data including CVV"
    category: security
    enforcement: block
    owner: security
    rationale: "PCI-DSS compliance requirement"
    source: declared
    confidence: high

  - id: C-PERF-SEARCH-P95-003
    description: "Hotel search P95 latency must remain under 2000ms"
    category: operational
    enforcement: warn
    owner: platform-team
    rationale: "User experience threshold for search responsiveness"
    source: declared
    confidence: medium

trade_offs:
  chosen:
    approach: "Eventual consistency for perk inventory counts"
    rationale: "Reduces booking latency; exact counts not needed at search time"
  rejected:
    - alternative: "Strong consistency with distributed locks"
      reason: "200ms latency overhead per search result unacceptable"
      revisit_condition: "If overselling perks exceeds 2% of redemptions"

drift_policy:
  review_cadence: "monthly"
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

---

## How Different Roles Use This

**Product Managers** author and update MEANING.yaml — writing goals, non-goals, and trade-offs. They review drift reports to understand where the system is diverging from intent. No code or CLI required; it's just YAML.

**Architects & Tech Leads** author constraints and enforcement levels. They run `meaning validate` during design reviews. They review cross-system meaning coherence when constraints in one service affect another.

**Engineers** read MEANING.yaml before writing code. They cite constraint IDs in PR descriptions. They see drift reports as automated PR comments and respond to flagged constraints.

**AI Agents** (Claude Code, Cursor, Copilot) receive auto-generated context from `meaning context`. They know the system's goals, respect its non-goals, honor its constraints by ID, and understand its trade-offs before writing a single line of code.

**CI Pipelines** run the tool automatically on every PR. Schema validation catches broken artifacts. Drift detection flags potentially affected constraints. Gates block merges when block-level constraints may be violated.

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
    └── hotel-booking/     ← Worked example
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

Built by [Samson Aligba](https://samsonaligba.com)
