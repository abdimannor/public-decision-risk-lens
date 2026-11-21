# Experiment: a small learned model next to the rules

Question: can a small learned model, trained on the 140 labelled passages, flag the eight categories better than the hand-written rules, or help them? Answer, in short: **no**. The model alone is far worse than the rules, adding the rule decision as a feature does not beat the rules, and a union of rules and model buys recall at a large cost in precision. The model is **not shipped**; the tool still uses only the rules.

Reproduce: `npm run model:cv` (about 25 seconds, no dependencies). Full numbers: `prototype/model/cv-results.json`.

## Method

- **Data.** All labelled passages on main: gold.json (54), heldout.json (30), test2.json (26), test3.json (30). 140 passages from 25 documents, 92 Swedish and 48 English. Unit of evaluation: (passage, category), 189 positive labels, as in `prototype/eval/evaluate.mjs`. Gold has no language field; its documents were mapped by hand (förvaltningslag Swedish, AI Act and the fictional home-care text English).
- **Features** (`prototype/model/train.mjs`). Lowercased word unigrams and bigrams plus character 4-grams inside words (with word-boundary marks, so "_bes" means a word starting with "bes"). The 4-grams are meant to catch Swedish compounds and inflections without a language-specific stemmer. Binary presence, L2-normalised per passage; vocabulary built from the training passages only, features seen in at least two training passages.
- **Model.** One L2-regularised logistic regression per category, plain full-batch gradient descent from zero weights, 150 epochs, learning rate 2, L2 0.001. Class weighting: positives and negatives each carry half the total weight, so rare categories (security 7 labels, misuse 8) are not ignored. Deterministic: no random initialisation; the only random step (grouping documents into inner folds) uses a fixed seed.
- **Variants.** *Rules*: the current engine. *Model*: n-gram features only. *Model + rule feature*: the same plus the engine's own decision for that category as one extra binary feature. *Union*: a passage is flagged when the rules or the model flag it.
- **Evaluation that respects documents.** Leave-one-document-out cross-validation: 25 folds, each passage scored by a model that never saw any passage from its own document. The decision threshold per category is chosen inside the training folds only: a grouped inner cross-validation (4 folds of training documents) gives out-of-fold probabilities, and the threshold (0.05 to 0.95) with the best F1 on those is used on the held-out document.

## Results (leave-one-document-out, all 140 passages)

Precision / recall / F1 per category.

| Category | Support | Rules | Model | Model + rule feature | Union |
|---|---|---|---|---|---|
| transparency | 40 | 59% / 75% / 66% | 37% / 65% / 47% | 59% / 75% / 66% | 41% / 88% / 56% |
| accountability | 20 | 50% / 50% / 50% | 15% / 95% / 25% | 48% / 50% / 49% | 15% / 100% / 26% |
| discrimination | 28 | 79% / 82% / 81% | 23% / 75% / 36% | 79% / 82% / 81% | 26% / 93% / 41% |
| privacy | 26 | 58% / 69% / 63% | 46% / 65% / 54% | 58% / 69% / 63% | 44% / 88% / 59% |
| contestability | 26 | 76% / 85% / 80% | 26% / 62% / 36% | 73% / 85% / 79% | 32% / 92% / 48% |
| human-oversight | 34 | 63% / 76% / 69% | 43% / 53% / 47% | 66% / 74% / 69% | 45% / 88% / 60% |
| security | 7 | 56% / 71% / 63% | 5% / 86% / 9% | 56% / 71% / 63% | 6% / 100% / 11% |
| misuse | 8 | 29% / 25% / 27% | 7% / 50% / 12% | 3% / 25% / 6% | 10% / 75% / 17% |
| **micro** | 189 | **63% / 72% / 67%** | 21% / 67% / 32% | 50% / 71% / 59% | 25% / 90% / 39% |

Micro precision / recall / F1 by slice:

| Slice | Passages | Rules | Model | Model + rule feature | Union |
|---|---|---|---|---|---|
| All | 140 | 63% / 72% / 67% | 21% / 67% / 32% | 50% / 71% / 59% | 25% / 90% / 39% |
| Swedish | 92 | 59% / 65% / 62% | 19% / 65% / 29% | 42% / 65% / 51% | 22% / 89% / 36% |
| English | 48 | 68% / 81% / 74% | 24% / 70% / 36% | 62% / 80% / 70% | 29% / 92% / 44% |
| test3 passages only | 30 | 48% / 63% / 54% | 20% / 70% / 31% | 43% / 65% / 51% | 22% / 83% / 34% |

A note on fairness: the rules were tuned on gold, heldout and test2, so "rules" on all 140 passages is flattering to the rules. The test3 row is the one where neither side has seen the documents; the rules still win there (54% against 31% and 51% F1).

Sensitivity check, not used to pick anything: 600 epochs at learning rate 4 gave the same picture (micro F1: model 33%, model + rule feature 60%, union 41%, rules 67%).

## What the model learned

Largest weights when trained on all 140 passages, in plain words ("starts with", "contains" refer to character 4-grams inside words):

- **transparency**: words containing "under" and "rätt" (underrättelse, notice) and "transp" (transparency, transparens). Leans against "beslut" (decision) and "göra".
- **accountability**: the Swedish words "vem" (who) and "vilka som" (which people), as in "who is responsible". Leans against English "-tion" words.
- **discrimination**: words starting with "dis", containing "rimi" (discrimination), plus English plural and "-ial" endings. Leans against "beslut".
- **privacy**: "person" (personal data, personuppgifter), "uppgift", "data". This is the one category where the model is competitive on Swedish (F1 74% against 69%) and on test3 (82% against 74%).
- **contestability**: "motiv" (motivering, reasons), "klag" (överklaga, appeal). Close to what the rules already use.
- **human-oversight**: "human", "system".
- **security** and **misuse**: fragments with no clear meaning ("-ade", "-del", "may", "other"): with 7 and 8 positive labels the model memorises documents rather than concepts.
- In the "model + rule feature" variant, the rule decision gets the largest weight in every category (2.1 to 4.3, against below 1.1 for any n-gram), so that variant mostly copies the rules and the n-grams add noise.

A pattern across categories: "beslut" (decision) is a strong negative cue almost everywhere. That is a document effect, not a concept: förvaltningslag passages talk about decisions constantly and many carry no label. With 25 documents, such document-level vocabulary dominates.

## Honest reading

- With 140 passages from 25 documents and 189 labels spread over eight categories, a bag-of-n-grams model does not have enough examples to learn what a concern looks like, as opposed to what a particular document looks like. Leave-one-document-out exposes that: as soon as the document is unseen, precision collapses (21%), because class weighting and F1-chosen thresholds push the model to flag broadly.
- Adding the rule decision as a feature gives a model that leans on the rules and loses 13 points of precision against them. A union raises recall from 72% to 90% but more than triples the false alarms (81 to 524), which for a reviewer tool is worse, not better.
- The ship criterion (a variant beating rules alone on micro F1 by at least 5 points in leave-one-document-out CV) is not met by any variant. Step 4 (weights file and UI switch) was therefore skipped: shipping a model that is 35 points of F1 behind the rules, even as an opt-in, would add flags a reviewer has to dismiss.
- The single promising signal is privacy in Swedish, where vocabulary ("personuppgifter") carries the concept. That is better served by a rule pattern than by a model.
- What could change this: many more labelled documents (hundreds, not 25), or a pretrained multilingual sentence encoder, which would bring a runtime dependency and a large file the static app does not have today. Both are outside this experiment.
