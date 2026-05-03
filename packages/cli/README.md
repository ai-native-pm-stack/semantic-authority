# `@semantic-authority/cli`

The `meaning` CLI scaffolds, validates, detects drift against code changes, and converts `MEANING.yaml` into agent-readable context.

## Install

Local source checkout:

```bash
cd packages/cli
npm install
npm run build
node dist/index.js --help
```

Published package (after npm release):

```bash
npx @semantic-authority/cli init
```

## Commands

Create a starter `MEANING.yaml` plus `.claude/meaning-context.md`:

```bash
node dist/index.js init
```

Validate an artifact:

```bash
node dist/index.js validate --file ./MEANING.yaml
```

Fail on warnings as well:

```bash
node dist/index.js validate --file ./MEANING.yaml --strict
```

Generate agent context from an existing artifact:

```bash
node dist/index.js context --file ./MEANING.yaml --output ./.claude/meaning-context.md
```

Review the current diff against declared constraints:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-proj-...
node dist/index.js review --base origin/main
node dist/index.js drift --base origin/main
node dist/index.js review --provider openai --model gpt-5.4-mini --base origin/main
node dist/index.js review --staged --format json
node dist/index.js review --base origin/main --sarif-output meaning-review.sarif
node dist/index.js review --cache-dir .meaning-cache/review
node dist/index.js review --no-cache
```

`review` and `drift` share the same engine today:

- `review` is the PR / CI framing
- `drift` is the semantic-governance framing

Review results are cached locally by `(diff_hash, meaning_hash, model_id, provider)` under `.meaning-cache/review` by default. Use `--no-cache` to force a fresh judge call, or `--cache-dir` to relocate the cache.

## Smoke Test

From this package directory:

```bash
npm install
npm test
node dist/index.js validate --file ../../examples/invoice-processor/MEANING.yaml
node dist/index.js context --file ../../examples/invoice-processor/MEANING.yaml --output /tmp/meaning-context.md
node dist/index.js init --non-interactive --dir /tmp/meaning-smoke
```

The automated suite covers:

- validating the worked example
- rejecting duplicate constraint IDs
- enforcing `--strict` warnings as failures
- generating agent context output
- scaffolding a usable artifact with `init --non-interactive`
- provider inference and OpenAI response parsing for review mode

## Roadmap

- publish `@semantic-authority/cli` to npm so the same commands can run via `npx @semantic-authority/cli ...`
