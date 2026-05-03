# Mental Model & Audiences

Semantic Authority works best when it is **layered**, not when everyone is forced through the same interface. This page is the one-pager for "what is this thing, and which part is for me?"

---

## Who Creates Meaning, Who Consumes It

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

The artifact has one source of truth (`MEANING.yaml`) and three consumption modes (humans reading, agents loading projected context, CI gating PRs against declared constraints).

---

## Useful To Every Role

The same repo should offer different kinds of value to different audiences:

| Audience | What They Need | Where They Start |
|-------|------|-----|
| **PMs / non-technical operators** | A way to make goals, non-goals, trade-offs, and assumptions explicit | [GUIDE.md](../GUIDE.md), [docs/GENERATE_MEANING_PROMPT.md](./GENERATE_MEANING_PROMPT.md) |
| **Engineers / architects** | A canonical semantic contract that can be validated, reviewed, and discussed in PRs | [README.md](../README.md), [packages/cli/README.md](../packages/cli/README.md), [docs/REVIEW.md](./REVIEW.md), [examples/invoice-processor/SCENARIOS.md](../examples/invoice-processor/SCENARIOS.md) |
| **Agents** | A machine-consumable source of truth and a generated execution context | [AGENTS.md](../AGENTS.md), `meaning context`, `.claude/meaning-context.md` |
| **Leads / the organization** | Lower drift, clearer ownership, and a shared vocabulary for what the system is allowed to mean | `MEANING.yaml`, `meaning review` outputs, drift policy, PR discussions |

That is the intended shape of the project:

- not just a PM artifact
- not just a dev tool
- not just an agent prompt file

It is a shared semantic layer with different projections for each part of the team.

---

## How Each Role Uses It

**Product Managers** author and update `MEANING.yaml` — writing goals, non-goals, and trade-offs. They review `meaning review` outputs to understand where the system is diverging from intent. With an existing BRD/PRD, the [generation prompt](./GENERATE_MEANING_PROMPT.md) creates a draft via any LLM, or the `skills/generate-meaning.md` Claude Code skill generates one in-IDE.

**Architects & Tech Leads** author constraints and enforcement levels. They run `meaning validate` during design reviews. They review cross-system meaning coherence when constraints in one service affect another.

**Engineers** read `MEANING.yaml` before writing code. They can run `meaning review` locally from source today; once npm is published the same workflow becomes a drop-in `npx` experience. The GitHub Action already works from this repo with inline PR annotations citing the constraint IDs their diff puts at risk. They can also run `meaning drift` as the same engine framed explicitly as semantic drift detection.

**AI Agents** (Claude Code today; Cursor and Copilot emitters on the v0.3.0 roadmap) receive auto-generated context from `meaning context`. They know the system's goals, respect its non-goals, honor its constraints by ID, and understand its trade-offs before writing a single line of code.

**CI Pipelines** can already use the GitHub Action in external repos today. npm publication remains a convenience step for local CLI distribution, not a blocker for CI adoption.

---

## Keeping It Fresh

A monthly review cadence alone is not enough. `MEANING.yaml` stays useful when review is triggered by events, not just calendars.

Update or revisit it when:

- a new `block`-level invariant appears
- an incident reveals an unstated assumption
- `meaning review` returns `insufficient_context`
- a team intentionally crosses a declared non-goal
- a release changes system boundaries or trade-offs
- an ADR materially changes architecture that a constraint depends on

The best cadence is usually **event-driven review** for meaningful change, with **periodic review** as a backstop.
