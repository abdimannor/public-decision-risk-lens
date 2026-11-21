// Fails if the engine gets worse on the gold set than the recorded baseline.
// Raise the numbers when an engine change improves them; never lower them
// without explaining why in the pull request.
import test from "node:test";
import assert from "node:assert/strict";
import { evaluate, loadSet } from "./evaluate.mjs";

// Before the error-analysis fixes: recall 0.51, precision 0.76 (51 labels).
// Recall went from 0.74 to 0.725 when förvaltningslag #13 got the
// accountability label it shares with #11 and #12 (one more miss), not
// because the engine got worse.
// Precision round (context gates, see taxonomy.js): measured recall 0.706
// (36 of 51), precision 0.837. Recall fell from 0.725 by one label (the
// AI Act #4 "AI system" mention no longer flags transparency without a cue);
// tuning and held-out were both used as development data in that round.
// Annotation guide round (docs/annotation-guide.md, docs/relabel-log.md):
// four gold labels removed under the bare-mention rule (support 51 -> 47),
// relabelled blind before any run. Main's engine on the relabelled set:
// precision 0.744 (32 of 43), recall 0.681. With automation/AI mentions as
// a context signal: precision 0.886 (31 of 35), recall 0.660 (31 of 47).
const BASELINE = { recall: 0.65, precision: 0.88 };

test("overall recall on the gold set does not drop below the baseline", () => {
  const r = evaluate();
  assert.ok(r.overall.recall >= BASELINE.recall - 1e-9, `recall ${r.overall.recall.toFixed(3)} < baseline ${BASELINE.recall}`);
});

test("overall precision on the gold set does not drop below the baseline", () => {
  const r = evaluate();
  assert.ok(r.overall.precision >= BASELINE.precision - 1e-9, `precision ${r.overall.precision.toFixed(3)} < baseline ${BASELINE.precision}`);
});

test("every gold passage is still produced by the splitter for its sample", () => {
  const r = evaluate();
  assert.equal(r.passages, 54);
});

// Held-out set: blind-labelled passages from documents the engine was never
// tuned on. Measured on first run (no engine changes): precision 0.44,
// recall 0.72 (41 of 57 labels). The floor below is set under the measured
// value so the test catches a large regression without inviting tuning to it.
test("the held-out evaluation runs on all 30 passages", () => {
  const r = evaluate(loadSet("heldout"));
  assert.equal(r.passages, 30);
  assert.equal(r.overall.support, 57);
  assert.ok(r.overall.recall >= 0.6, `held-out recall ${r.overall.recall.toFixed(3)} < 0.6`);
});

// After the precision round the held-out set was used for development, so it
// is no longer an independent test. Measured: precision 0.653 (47 of 72),
// recall 0.825 (47 of 57). Annotation guide round: no held-out label
// changed; precision 0.701 (47 of 67), recall 0.825 (47 of 57). Adding "why",
// "told", "tell", "varför" and "berätta" as transparency cues (so "applicants are
// not told why" is flagged) added one held-out false alarm: precision 0.691
// (47 of 68). Floors guard the gain; the frozen test set is the
// independent check.
test("held-out (now development) precision and recall stay at the measured level", () => {
  const r = evaluate(loadSet("heldout"));
  assert.ok(r.overall.precision >= 0.69, `held-out precision ${r.overall.precision.toFixed(3)} < 0.69`);
  assert.ok(r.overall.recall >= 0.80, `held-out recall ${r.overall.recall.toFixed(3)} < 0.80`);
});

// Frozen final test set (test2.json): labelled blind on a separate branch and
// scored once after the precision round: precision 0.42 (31 of 73 flags),
// recall 0.72 (31 of 43). It must never be used to tune the engine; this test
// only guards against regressions, with floors just below the measured values.
// Its labels predate docs/annotation-guide.md and stay frozen. After the
// annotation guide round (context signal for bare automation mentions):
// precision 0.48 (30 of 62), recall 0.70 (30 of 43): one true positive lost
// (recall floor lowered from 0.70 to 0.69 for that, see the PR), ten false
// positives removed.
// Three-annotator round: test2 was relabelled by the majority of three
// independent annotators (single-annotator labels kept in
// labels_single_annotator). Against the majority: precision 0.53 (33 of 62),
// recall 0.73 (33 of 45).
test("earlier frozen set, relabelled by three annotators: does not fall below its measurement", () => {
  const r = evaluate(loadSet("test2"));
  assert.equal(r.passages, 26);
  assert.ok(r.overall.precision >= 0.52, `precision ${r.overall.precision}`);
  assert.ok(r.overall.recall >= 0.72, `recall ${r.overall.recall}`);
});

// test3.json: nine new documents, labelled by majority of three independent
// annotators against the guide, scored once: precision 0.48 (25 of 52),
// recall 0.63 (25 of 40). The current honest number. Never tune on it; the
// floors only guard against regressions.
test("new test set (three annotators): does not fall below its one-time measurement", () => {
  const r = evaluate(loadSet("test3"));
  assert.equal(r.passages, 30);
  assert.ok(r.overall.precision >= 0.47, `precision ${r.overall.precision}`);
  assert.ok(r.overall.recall >= 0.62, `recall ${r.overall.recall}`);
});

test("agreement between the three annotators recomputes as reported", async () => {
  const { agreement } = await import("./agreement.mjs");
  const r = agreement();
  assert.equal(r.annotators, 3);
  assert.equal(r.passages, 56);
  assert.ok(Math.abs(r.pooledKappa - 0.93) < 0.01, `pooled kappa ${r.pooledKappa}`);
});
