# Agent Example: Same Request, Different Meaning

This is a small illustration of the value proposition.

It is not a benchmark and not a transcript from a production deployment. Its purpose is to show the behavioral difference between:

- an agent acting on a request with no explicit semantic contract
- an agent acting with `MEANING.yaml`-derived context

---

## Scenario

Product request:

> "Add support for multi-currency invoices so the finance team can upload EUR and GBP invoices this sprint."

Relevant `MEANING.yaml` non-goal in the invoice-processor example:

```yaml
non_goals:
  - "Does not support multi-currency invoices in v1 — all amounts in USD"
```

---

## Without MEANING.yaml Context

Typical agent behavior:

```text
I’ll update the invoice schema to add `currency`, `exchange_rate`, and
`converted_amount_usd`, then patch the import path and search filters so
EUR and GBP invoices can be stored and reported.
```

What happened:

- the agent interpreted the request as permission to widen system scope
- it turned a non-goal into a goal
- nothing in the prompt forced it to pause and ask whether the boundary had changed

---

## With MEANING.yaml Context

Typical agent behavior:

```text
MEANING.yaml declares multi-currency support as a non-goal in v1.

I should not implement this directly without a meaning update.

Options:
1. Draft a MEANING.yaml revision proposal to promote multi-currency from
   non-goal to scoped work
2. Implement a narrower change that preserves USD-only handling
3. Escalate for product / architecture review before changing the data model
```

What changed:

- the agent still understands the user request
- but it no longer treats the request as sufficient authorization to widen scope
- it converts silent scope drift into an explicit governance decision

---

## Why This Matters

The point is not that `MEANING.yaml` makes the model smarter.

The point is that it gives the model a durable boundary it can cite:

- what the system is for
- what it is not for
- which constraints are important enough to stop on

That is the practical contract:

- agents may help draft meaning
- humans ratify meaning
- agents execute within meaning
