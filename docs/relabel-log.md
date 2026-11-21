# Relabel log (annotation guide version 1)

Both development sets (`gold.json`, 54 passages, and `heldout.json`, 30 passages) were re-read against [the annotation guide](annotation-guide.md). Only the passage text and the guide were read; the engine was not run, and the relabelled files were committed before any evaluation. `test2.json` is frozen and was not touched.

Four labels changed, all in `gold.json`, all removals under the bare-mention rule. No label changed in `heldout.json`: its labels already followed the rule (for example the JO and Riksrevisionen passages that only state that handling is automated carry no transparency label for it).

| Set | Passage | Before | After | Rule |
|---|---|---|---|---|
| gold | sv-forvaltningslag #3 (28 §, "eller automatiserat") | transparency, human-oversight | (none) | Bare mention: the passage permits automated decisions but says nothing about informing people or about human review (guide: transparency and human oversight, "does not count") |
| gold | fictional-home-care #3 ("uses a machine learning model") | transparency, discrimination | discrimination | Bare mention: that a model is used is context, not a transparency concern |
| gold | fictional-home-care #4 (training data and inputs) | privacy, discrimination, transparency | privacy, discrimination | A technical description of training data does not address who can see it (transparency, "does not count") |

Count: 4 labels removed (2 in the first row), 0 added. Gold support goes from 51 to 47 labels.

Kept on purpose: fictional-home-care #5 (proprietary model, trade secret: transparency), fictional-home-care #6 (low scores queued automatically with no caseworker: human oversight, an outcome with no human step), EU AI Act passages on overseers' understanding and the right to explanation.
