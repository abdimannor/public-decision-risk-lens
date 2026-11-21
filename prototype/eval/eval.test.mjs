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
const BASELINE = { recall: 0.72, precision: 0.82 };

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
