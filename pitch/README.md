# Semantic Authority Pitch Materials

This folder contains the public-facing collateral for presenting Semantic Authority as an open-source product.

## Canonical Sources

- `Semantic_Authority_Pitch_Deck.md`
  Human-readable slide outline for the deck narrative.
- `Semantic_Authority_Executive_Brief.md`
  One-page executive summary for operators and decision-makers.
- `build-deck.cjs`
  Generates a `.pptx` deck from the current narrative.
- `build-brief.cjs`
  Generates a `.docx` executive brief from the current narrative.

## Build Outputs

Generated files are written to `pitch/out/` and are intentionally ignored by git.

## Usage

```bash
cd pitch
npm install
npm run build
```

That will generate:

- `out/Semantic_Authority_Pitch_Deck.pptx`
- `out/Semantic_Authority_Executive_Brief.docx`

## Messaging Guardrails

The pitch should stay aligned with the public product story:

- Semantic Authority makes system meaning explicit, machine-legible, and enforceable.
- `MEANING.yaml` is the core artifact.
- The CLI and GitHub Action are the first release surfaces.
- The product is part of the AI Native PM Stack, but this folder pitches Semantic Authority directly.
