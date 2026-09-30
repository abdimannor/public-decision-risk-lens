# Public Decision Risk Lens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a public GitHub repository whose README presents Public Decision Risk Lens as a credible, bounded Building AI course project.

**Architecture:** This is a README-first repository. `README.md` is the public project page and describes the concept, intended workflow, data and methods, limits, future development path, and acknowledgments. `LICENSE` applies CC BY 4.0 to the written concept. No executable code, datasets, images, or external visual assets are included.

**Tech Stack:** Git, GitHub, Markdown, CC BY 4.0 licence.

**Spec:** `docs/superpowers/specs/public-decision-risk-lens-design.md`

## Global Constraints

- Repository name: `public-decision-risk-lens`.
- Repository visibility: public.
- README must contain the exact phrase `Building AI course project`.
- README must include `Summary`, `Background`, `How is it used?`, `Data sources and AI methods`, `Challenges`, `What next?`, and `Acknowledgments` headings.
- Do not include executable code, datasets, images, external visual assets, or personal information.
- Do not claim that the concept makes individual decisions, scores citizens, determines eligibility, infers protected characteristics, or replaces professional, legal, or democratic judgment.
- The written concept is licensed under CC BY 4.0.
- Use stable, non-dated filenames.

---

### Task 1: Create the public README

**Files:**
- Create: `README.md`
- Test: temporary content-validation command, not committed

**Interfaces:**
- Consumes: project scope and constraints in `docs/superpowers/specs/public-decision-risk-lens-design.md`
- Produces: a Markdown project page suitable for direct display on GitHub

- [ ] **Step 1: Define the README acceptance checks before writing it**

The validation command must confirm that every required section and the exact course phrase exists, and that no disallowed asset directories or files were added:

```bash
python -c "from pathlib import Path; t=Path('README.md').read_text(encoding='utf-8'); required=['# Public Decision Risk Lens','## Summary','Building AI course project','## Background','## How is it used?','## Data sources and AI methods','## Challenges','## What next?','## Acknowledgments']; missing=[x for x in required if x not in t]; assert not missing, missing; assert not any(Path(p).exists() for p in ['src','data','assets','images']); print('README acceptance checks passed')"
```

- [ ] **Step 2: Run the acceptance check to verify it fails before the README exists**

Run:

```bash
python -c "from pathlib import Path; t=Path('README.md').read_text(encoding='utf-8'); required=['# Public Decision Risk Lens','## Summary','Building AI course project','## Background','## How is it used?','## Data sources and AI methods','## Challenges','## What next?','## Acknowledgments']; missing=[x for x in required if x not in t]; assert not missing, missing"
```

Expected: failure because `README.md` does not yet exist.

- [ ] **Step 3: Write `README.md`**

Write a concise, public-facing project proposal that:

- states that the project is a human-supervised document-review concept;
- lists the intended risk categories: transparency, accountability, discrimination, privacy, contestability, human oversight, security, and misuse;
- limits initial data to public Swedish and EU policy documents, official guidance, procurement documents, and published algorithmic-impact assessments;
- describes a transparent, source-linked information-retrieval and pattern-matching starting point, with any later classifier or language-model work conditioned on human validation and traceable sources;
- identifies limitations and the development path from concept to low-risk pilot;
- uses a minimal acknowledgments statement confirming that the initial concept includes no external code, data, or visual assets.

- [ ] **Step 4: Run the acceptance check to verify the README passes**

Run the Step 1 command.

Expected: `README acceptance checks passed`.

- [ ] **Step 5: Commit the README**

```bash
git add README.md
git commit -m "docs: add project README"
```

### Task 2: Add the CC BY 4.0 licence and verify repository contents

**Files:**
- Create: `LICENSE`
- Test: temporary licence-and-tree validation command, not committed

**Interfaces:**
- Consumes: the project-wide licence and content constraints
- Produces: a repository that clearly licenses the written concept and contains only the intended project materials

- [ ] **Step 1: Define the licence and content acceptance checks before adding the licence**

```bash
python -c "from pathlib import Path; l=Path('LICENSE').read_text(encoding='utf-8'); assert 'Creative Commons Attribution 4.0 International' in l; files=sorted(p.relative_to(Path('.')).as_posix() for p in Path('.').rglob('*') if p.is_file() and '.git' not in p.parts); allowed={'README.md','LICENSE','.gitignore','docs/superpowers/specs/public-decision-risk-lens-design.md','docs/superpowers/plans/public-decision-risk-lens-plan.md'}; unexpected=[p for p in files if p not in allowed]; assert not unexpected, unexpected; print('Licence and repository-content checks passed')"
```

- [ ] **Step 2: Run the acceptance check to verify it fails before `LICENSE` exists**

Run the Step 1 command.

Expected: failure because `LICENSE` does not yet exist.

- [ ] **Step 3: Add the full CC BY 4.0 legal text in `LICENSE`**

Add the standard Creative Commons Attribution 4.0 International licence text without altering its legal terms.

- [ ] **Step 4: Run the licence and content acceptance check**

Run the Step 1 command.

Expected: `Licence and repository-content checks passed`.

- [ ] **Step 5: Commit the licence**

```bash
git add LICENSE
git commit -m "docs: add CC BY 4.0 licence"
```

### Task 3: Create and verify the public GitHub repository

**Files:**
- Modify: Git remote configuration for the local repository
- Verify: GitHub repository metadata and remote README content

**Interfaces:**
- Consumes: the local committed repository and the configured GitHub account
- Produces: a public GitHub repository at `https://github.com/<account>/public-decision-risk-lens`

- [ ] **Step 1: Verify local state before publication**

```bash
git status --short
git log --oneline --max-count=3
```

Expected: clean status and commits for the specification, README, and licence.

- [ ] **Step 2: Create the GitHub repository explicitly as public and push `main`**

Use the authenticated GitHub API or GitHub CLI. Set the repository name to `public-decision-risk-lens`, set visibility explicitly to public, set the description to `A human-supervised concept for reviewing institutional risks in public-sector decision documents.`, and push the `main` branch.

- [ ] **Step 3: Read back the remote repository metadata**

Verify the exact remote repository has:

- name `public-decision-risk-lens`;
- `private: false`;
- default branch `main`;
- the expected description;
- a reachable HTML URL.

- [ ] **Step 4: Read back the remote `README.md` and `LICENSE`**

Verify the remote README contains every required course heading and phrase, and verify the remote licence contains `Creative Commons Attribution 4.0 International`.

- [ ] **Step 5: Report the verified repository URL for course submission**

Provide the exact GitHub URL only after the read-back checks succeed.

## Plan self-review

- **Spec coverage:** Task 1 covers the course-required README, purpose, workflow, data and methods, safeguards, challenges, future development path, and minimal acknowledgments. Task 2 covers the CC BY 4.0 licence and no-assets constraint. Task 3 covers public repository creation, metadata verification, remote-content verification, and the final submission URL.
- **Completeness scan:** no unresolved implementation gaps or deferred work instructions are present.
- **Consistency:** the repository name, required course phrase, stable filenames, README headings, and no-code/no-assets scope match the approved specification.
