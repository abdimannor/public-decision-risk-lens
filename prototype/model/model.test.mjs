// Checks for the learned-model experiment (prototype/model/train.mjs).
// The model is not shipped; these tests keep the experiment reproducible.
import test from "node:test";
import assert from "node:assert/strict";
import { featureStrings, prepare, loadAll, buildVocab, vectorise, fit, predict, CATS } from "./train.mjs";

test("features: word unigrams, bigrams and character 4-grams within words", () => {
  const f = featureStrings("Beslutet överklagas");
  assert.ok(f.includes("w:beslutet"));
  assert.ok(f.includes("b:beslutet överklagas"));
  assert.ok(f.includes("c:_bes") && f.includes("c:tet_") && f.includes("c:klag"));
  assert.ok(!f.some((x) => x.startsWith("c:") && x.includes(" ")), "character n-grams never cross words");
});

test("training is deterministic and prediction uses the trained weights", () => {
  const rows = prepare(loadAll().filter((p) => p.set === "gold"));
  const run = () => {
    const vocab = buildVocab(rows.map((r) => r.feats));
    const X = rows.map((r) => vectorise(r.feats, vocab));
    const m = fit(X, rows.map((r) => r.y), rows.map((r) => r.rule), vocab.names.length, { epochs: 20 });
    return { m, X };
  };
  const a = run(), b = run();
  for (let k = 0; k < CATS.length; k++) assert.deepEqual([...a.m.W[k]], [...b.m.W[k]]);
  const p = predict(a.m, a.X[0]);
  let z = a.m.b[0];
  for (const j of a.X[0].idx) z += a.m.W[0][j] * a.X[0].val;
  assert.ok(Math.abs(p[0] - 1 / (1 + Math.exp(-z))) < 1e-12);
});
