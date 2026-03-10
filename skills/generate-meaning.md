---
description: Generate a MEANING.yaml from a BRD, PRD, or requirements document. Use when creating a new Semantic Authority artifact from existing product documentation.
---

# Generate MEANING.yaml

You are generating a Semantic Authority MEANING.yaml file from a source document. Follow these instructions exactly.

## Step 1: Locate the Source

If the user provided a file path, read it. If the user pasted content directly, use that. If neither, ask: "What document should I generate the MEANING.yaml from? Provide a file path or paste the content."

## Step 2: Analyze the Source

Read the entire document and extract:

1. **System identity** — What is this system called? Who owns it?
2. **Primary goal** — What is the one-sentence purpose? Use the template: "Enable [who] to [do what] such that [observable outcome]."
3. **Success criteria** — What observable outcomes define success?
4. **Non-goals** — What is explicitly excluded? What adjacent features might someone assume exist? Minimum 5.
5. **Hard constraints** — What would cause legal, financial, or trust harm if violated? These get `enforcement: block`.
6. **Operational constraints** — Performance budgets, SLAs, limits. These get `enforcement: warn`.
7. **Trade-offs** — What was chosen vs. rejected, and why?
8. **Assumptions** — What did you infer that was not directly stated?
9. **Gaps** — What is ambiguous or missing?

## Step 3: Generate the YAML

Write a valid MEANING.yaml file with this exact structure:

```yaml
system: [kebab-case-name]
version: 1.0.0
status: draft
owner: [team-or-role]
last_reviewed: [today YYYY-MM-DD]

goal:
  primary: >
    [One sentence]
  success_criteria:
    - "[Measurable outcome]"
  non_goals:
    - "[Exclusion — minimum 5]"

constraints:
  - id: C-[DOMAIN]-[SHORTNAME]-[NNN]
    description: "[Testable binary condition]"
    category: [business | operational | architectural | security | data]
    enforcement: [block | warn | observe]
    owner: "[team]"
    rationale: "[Why]"
    source: [declared | assumed]
    confidence: [high | medium | low]

trade_offs:
  chosen:
    approach: "[Selected]"
    rationale: "[Why]"
  rejected:
    - alternative: "[Considered]"
      reason: "[Why rejected]"
      revisit_condition: "[When to reconsider]"

drift_policy:
  review_cadence: monthly
  enforcement_rules:
    block: "Violation must not merge without remediation or approved drift record"
    warn: "Acknowledgement required with owner and revisit date"
    observe: "Logged for trend analysis; reviewed periodically"

provenance:
  source_summary: "[1-2 sentences about the input]"
  assumptions:
    - "[What you inferred]"
  clarifications_needed:
    - "[What was ambiguous]"
```

## Constraint ID Rules

Format: `C-<DOMAIN>-<SHORTNAME>-<NNN>`

Valid domains: FIN, SEC, COMPLIANCE, DATA, UX, PERF, REL, ARCH, OPS

- SHORTNAME: uppercase letters, hyphens, numbers (e.g., NO-DOUBLE-PAY, AUDIT-TRAIL)
- NNN: three-digit number starting at 001

## Source vs. Assumed

- `source: declared` — the document explicitly states this
- `source: assumed` — you inferred this from context or common practice

Be honest. Unmarked assumptions become silent failures.

## Step 4: Validate

After writing the file, run:

```bash
npx @semantic-authority/cli validate --file MEANING.yaml
```

Fix any schema errors. Then present a summary to the user:

- Total constraints by enforcement level
- Count of declared vs. assumed sources
- Number of clarifications needed
- Reminder that this is a DRAFT requiring human review

## Rules

- Do NOT invent requirements. Extract only what the document states or strongly implies.
- Do NOT include implementation details unless they are explicit constraints.
- Mark everything you inferred as `source: assumed` with appropriate confidence.
- When in doubt, add to `clarifications_needed` rather than guessing.
- Non-goals minimum is 5. Think: "What could someone accidentally build?"
- Constraints must be testable and binary. Not "should be fast" but "P95 under 500ms."
