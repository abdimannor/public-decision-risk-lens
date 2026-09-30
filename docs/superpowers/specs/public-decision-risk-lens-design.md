---
title: Public Decision Risk Lens design
status: approved for review
---

# Public Decision Risk Lens

## Purpose

Public Decision Risk Lens is a public, README-first project concept for a future AI-assisted review tool. It is intended to help public-sector teams identify and discuss institutional risks in documents before an AI-supported or automated process is implemented.

The project is a decision-support concept. It does not make decisions about individuals, score citizens, determine eligibility, infer protected characteristics, or replace professional, legal, or democratic judgment.

## Repository scope

Repository name: `public-decision-risk-lens`

Visibility: public

Initial contents:

```text
public-decision-risk-lens/
├── README.md
└── LICENSE
```

The initial deliverable contains no executable code, datasets, images, or external visual assets. The project will use a CC BY 4.0 licence for the written concept.

## README structure

The README will contain the following sections:

1. `# Public Decision Risk Lens`
2. `## Summary`
3. `## Background`
4. `## How is it used?`
5. `## Data sources and AI methods`
6. `## Challenges`
7. `## What next?`
8. `## Acknowledgments`

The Summary will contain a brief two-to-three-sentence description and the exact phrase **Building AI course project**.

## Intended workflow

1. A reviewer selects a public policy, procurement specification, impact assessment, guideline, or decision template.
2. The proposed tool identifies passages that may concern transparency, accountability, discrimination, privacy, contestability, human oversight, security, or misuse.
3. Every flag is linked to the document passage that prompted it and to the relevant risk category.
4. A human reviewer accepts, rejects, or contextualises the flag and produces an auditable review note.

## Data and AI methods

An eventual prototype would draw on public Swedish and EU policy documents, official guidance, procurement documents, and published algorithmic-impact assessments.

The initial technical approach would favour source-linked information retrieval and transparent pattern matching. A later prototype could evaluate supervised classification or retrieval-augmented language models only if it preserves source references, confidence indicators, review logs, and mandatory human validation.

## Safeguards and boundaries

The project will make these limits explicit:

- It cannot establish that a policy or system is lawful, fair, or legitimate.
- It can miss risks, create false positives, or misunderstand context.
- Public documents can omit operational practices, datasets, and informal routines that affect real outcomes.
- Institutional risk cannot be reduced to a keyword list or model score.
- Human expertise, legal review, affected groups’ perspectives, and democratic accountability remain necessary.

## Development path

1. Build a small source-linked prototype for public documents.
2. Develop a transparent risk taxonomy with subject-matter experts.
3. Create an expert-labelled evaluation set governed by clear documentation.
4. Evaluate usefulness, false-positive rates, and reviewer agreement.
5. Pilot only in a low-risk advisory context, never as a replacement for public authority or individual due process.

## Verification criteria

Before publication, verify that:

- README includes every required course section and the exact required phrase.
- The project consistently distinguishes the current concept from a future prototype.
- It makes no unsupported performance, legal, or fairness claims.
- Markdown renders cleanly.
- The repository is public and has a valid CC BY 4.0 licence.
- The README contains no external code, datasets, images, or personal information.

## Acknowledgments

The README will acknowledge that no external code, datasets, or visual assets are used in the initial project concept. It will not name institutions beyond the required course phrase.
