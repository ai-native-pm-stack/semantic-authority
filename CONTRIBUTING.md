# Contributing

Thanks for helping improve Semantic Authority.

## What This Repo Owns

This repo publishes three public surfaces:

- the `@semantic-authority/cli` package
- the GitHub Action in `action/`
- the docs, examples, and prompt assets that explain how to use `MEANING.yaml`

## Development Setup

```bash
git clone git@github.com:ai-native-pm-stack/semantic-authority.git
cd semantic-authority/packages/cli
npm install
npm test
```

## Before Opening a PR

Run the package checks:

```bash
cd packages/cli
npm test
```

If you touched the pitch tooling:

```bash
cd pitch
npm install
npm run build
```

## Contribution Guidelines

- keep the repo centered on Semantic Authority itself
- prefer explicit examples over vague framework language
- keep `MEANING.yaml` and agent-context behavior aligned
- do not introduce product-strategy or unrelated private materials into this repo
- document any user-facing command, prompt, or workflow change in the relevant README

## Pull Request Checklist

- tests pass
- docs match behavior
- examples still validate
- new generated files are not accidentally committed unless they are intended source artifacts
