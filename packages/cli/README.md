# `@semantic-authority/cli`

The `meaning` CLI scaffolds, validates, and converts `MEANING.yaml` into agent-readable context.

## Install

Published package:

```bash
npx @semantic-authority/cli init
```

Local source checkout:

```bash
cd packages/cli
npm install
npm run build
node dist/index.js --help
```

## Commands

Create a starter `MEANING.yaml` plus `.claude/meaning-context.md`:

```bash
meaning init
```

Validate an artifact:

```bash
meaning validate --file ./MEANING.yaml
```

Fail on warnings as well:

```bash
meaning validate --file ./MEANING.yaml --strict
```

Generate agent context from an existing artifact:

```bash
meaning context --file ./MEANING.yaml --output ./.claude/meaning-context.md
```

Review the current diff against declared constraints:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
meaning review --base origin/main
meaning review --staged --format json
meaning review --base origin/main --sarif-output meaning-review.sarif
```

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
