// Fails if the engine gets worse on the gold set than the recorded baseline.
// Raise the numbers when an engine change improves them; never lower them
// without explaining why in the pull request.
import test from "node:test";
import assert from "node:assert/strict";
import { evaluate } from "./evaluate.mjs";

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
