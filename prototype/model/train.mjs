// A small learned model next to the rules: one L2-regularised logistic
// regression per category on word unigrams, bigrams and character 4-grams
// within words. No dependencies, deterministic (fixed seed, fixed epochs).
//
// Run: node prototype/model/train.mjs          (leave-one-document-out CV,
//      writes prototype/model/cv-results.json)
// Unit of evaluation is (passage, category), as in prototype/eval/evaluate.mjs.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const engine = require(join(here, "..", "engine.js"));
const { TAXONOMY } = require(join(here, "..", "taxonomy.js"));
export const CATS = TAXONOMY.map((c) => c.id);
export const SETS = ["gold", "heldout", "test2", "test3"];

export const CONFIG = { epochs: 150, lr: 2.0, l2: 1e-3, minDf: 2, innerFolds: 4, seed: 20261121 };

// ---------- data ----------
const GOLD_LANG = { "sv-forvaltningslag": "sv", "eu-ai-act": "en", "fictional-home-care": "en" };
export function loadAll() {
  const out = [];
  for (const s of SETS) {
    const d = JSON.parse(readFileSync(join(here, "..", "eval", `${s}.json`), "utf8"));
    for (const p of d.passages) {
      out.push({
        set: s, doc: `${s}/${p.sample}`, index: p.index, lang: p.lang || GOLD_LANG[p.sample] || "en", text: p.text,
        labels: new Set(p.labels.map((l) => l.category))
      });
    }
  }
  return out;
}

export function ruleDecisions(text) {
  const flags = engine.findFlags([{ index: 1, text }]);
  const got = new Set(flags.map((f) => f.category));
  return CATS.map((c) => (got.has(c) ? 1 : 0));
}

// ---------- features ----------
export function tokens(text) {
  return (text.toLowerCase().normalize("NFC").match(/[\p{L}\p{N}]+/gu) || []);
}
export function featureStrings(text) {
  const w = tokens(text);
  const f = new Set();
  for (let i = 0; i < w.length; i++) {
    f.add("w:" + w[i]);
    if (i + 1 < w.length) f.add("b:" + w[i] + " " + w[i + 1]);
    const t = "_" + w[i] + "_";
    for (let j = 0; j + 4 <= t.length; j++) f.add("c:" + t.slice(j, j + 4));
  }
  return [...f];
}

// Build a vocabulary from training passages only (document frequency >= minDf).
export function buildVocab(featLists, minDf = CONFIG.minDf) {
  const df = new Map();
  for (const fl of featLists) for (const f of fl) df.set(f, (df.get(f) || 0) + 1);
  const names = [...df.keys()].filter((k) => df.get(k) >= minDf).sort();
  return { names, index: new Map(names.map((n, i) => [n, i])) };
}

// Sparse vector: binary presence, L2-normalised. The rule decision (if used)
// is appended as an extra unnormalised binary feature, per category.
export function vectorise(fl, vocab) {
  const idx = [];
  for (const f of fl) { const i = vocab.index.get(f); if (i !== undefined) idx.push(i); }
  idx.sort((a, b) => a - b);
  return { idx: Int32Array.from(idx), val: idx.length ? 1 / Math.sqrt(idx.length) : 0 };
}

// ---------- logistic regression, plain full-batch gradient descent ----------
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
// X: sparse rows, Y: array of 0/1 per category, R: rule decisions per row (or null).
export function train(X, Y, nFeat, { useRule = false, epochs = CONFIG.epochs, lr = CONFIG.lr, l2 = CONFIG.l2 } = {}) {
  const K = CATS.length, n = X.length;
  const W = Array.from({ length: K }, () => new Float64Array(nFeat));
  const b = new Float64Array(K), r = new Float64Array(K);
  // class weights: positives and negatives each carry half the total weight
  const wPos = new Float64Array(K), wNeg = new Float64Array(K);
  for (let k = 0; k < K; k++) {
    const pos = Y.reduce((a, y) => a + y[k], 0);
    wPos[k] = pos ? n / (2 * pos) : 0; wNeg[k] = n - pos ? n / (2 * (n - pos)) : 0;
  }
  const G = Array.from({ length: K }, () => new Float64Array(nFeat));
  for (let e = 0; e < epochs; e++) {
    for (let k = 0; k < K; k++) G[k].fill(0);
    const gb = new Float64Array(K), gr = new Float64Array(K);
    for (let i = 0; i < n; i++) {
      const { idx, val } = X[i];
      for (let k = 0; k < K; k++) {
        const Wk = W[k];
        let z = b[k];
        for (let j = 0; j < idx.length; j++) z += Wk[idx[j]] * val;
        if (useRule) z += r[k] * R_[i][k];
        const y = Y[i][k];
        const g = (sigmoid(z) - y) * (y ? wPos[k] : wNeg[k]) / n;
        const Gk = G[k], gv = g * val;
        for (let j = 0; j < idx.length; j++) Gk[idx[j]] += gv;
        gb[k] += g;
        if (useRule) gr[k] += g * R_[i][k];
      }
    }
    for (let k = 0; k < K; k++) {
      const Wk = W[k], Gk = G[k];
      for (let j = 0; j < nFeat; j++) Wk[j] -= lr * (Gk[j] + l2 * Wk[j]);
      b[k] -= lr * gb[k];
      if (useRule) r[k] -= lr * (gr[k] + l2 * r[k]);
    }
  }
  return { W, b, r: useRule ? r : null };
}
let R_ = null; // rule decisions of the current training rows (set by fit)
export function fit(X, Y, R, nFeat, opts) { R_ = R; return train(X, Y, nFeat, opts); }

export function predict(model, x, rule) {
  return CATS.map((_, k) => {
    let z = model.b[k];
    for (let j = 0; j < x.idx.length; j++) z += model.W[k][x.idx[j]] * x.val;
    if (model.r && rule) z += model.r[k] * rule[k];
    return sigmoid(z);
  });
}

// ---------- evaluation helpers ----------
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const GRID = Array.from({ length: 19 }, (_, i) => 0.05 + i * 0.05);
function bestThreshold(probs, ys) {
  let best = 0.5, bestF = -1;
  for (const t of GRID) {
    let tp = 0, fp = 0, fn = 0;
    for (let i = 0; i < probs.length; i++) { const p = probs[i] >= t; if (p && ys[i]) tp++; else if (p) fp++; else if (ys[i]) fn++; }
    const f = tp ? (2 * tp) / (2 * tp + fp + fn) : 0;
    if (f > bestF + 1e-12) { bestF = f; best = t; }
  }
  return best;
}
export function score(rows, predKey) {
  const per = CATS.map((c, k) => {
    let tp = 0, fp = 0, fn = 0;
    for (const r of rows) { const p = r[predKey][k], y = r.y[k]; if (p && y) tp++; else if (p) fp++; else if (y) fn++; }
    return { category: c, support: tp + fn, tp, fp, fn, ...prf(tp, fp, fn) };
  });
  const T = per.reduce((a, s) => ({ tp: a.tp + s.tp, fp: a.fp + s.fp, fn: a.fn + s.fn }), { tp: 0, fp: 0, fn: 0 });
  return { micro: { ...T, support: T.tp + T.fn, ...prf(T.tp, T.fp, T.fn) }, perCategory: per };
}
function prf(tp, fp, fn) {
  const precision = tp + fp ? tp / (tp + fp) : null, recall = tp + fn ? tp / (tp + fn) : null;
  const f1 = tp + fp + fn ? (2 * tp) / (2 * tp + fp + fn) : null;
  return { precision, recall, f1 };
}

// Train one variant on the given training rows and choose per-category
// thresholds with grouped inner CV over the training documents only.
function trainWithThresholds(train_, useRule, rand) {
  const docs = [...new Set(train_.map((r) => r.doc))];
  // deterministic shuffle of documents into inner folds
  const order = docs.map((d) => [rand(), d]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const foldOf = new Map(order.map((d, i) => [d, i % CONFIG.innerFolds]));
  const innerProbs = CATS.map(() => []), innerYs = CATS.map(() => []);
  for (let f = 0; f < CONFIG.innerFolds; f++) {
    const tr = train_.filter((r) => foldOf.get(r.doc) !== f), te = train_.filter((r) => foldOf.get(r.doc) === f);
    if (!te.length) continue;
    const vocab = buildVocab(tr.map((r) => r.feats));
    const m = fit(tr.map((r) => vectorise(r.feats, vocab)), tr.map((r) => r.y), tr.map((r) => r.rule), vocab.names.length, { useRule });
    for (const r of te) { const p = predict(m, vectorise(r.feats, vocab), r.rule); CATS.forEach((_, k) => { innerProbs[k].push(p[k]); innerYs[k].push(r.y[k]); }); }
  }
  const thresholds = CATS.map((_, k) => bestThreshold(innerProbs[k], innerYs[k]));
  const vocab = buildVocab(train_.map((r) => r.feats));
  const model = fit(train_.map((r) => vectorise(r.feats, vocab)), train_.map((r) => r.y), train_.map((r) => r.rule), vocab.names.length, { useRule });
  return { model, vocab, thresholds };
}

export function prepare(all = loadAll()) {
  return all.map((p) => ({ ...p, feats: featureStrings(p.text), rule: ruleDecisions(p.text), y: CATS.map((c) => (p.labels.has(c) ? 1 : 0)) }));
}

export function crossValidate(rows = prepare()) {
  const rand = mulberry32(CONFIG.seed);
  const docs = [...new Set(rows.map((r) => r.doc))];
  const thresholdsSeen = { model: [], both: [] };
  for (const d of docs) {
    const tr = rows.filter((r) => r.doc !== d), te = rows.filter((r) => r.doc === d);
    for (const [variant, useRule] of [["model", false], ["both", true]]) {
      const { model, vocab, thresholds } = trainWithThresholds(tr, useRule, rand);
      thresholdsSeen[variant].push(thresholds);
      for (const r of te) {
        const p = predict(model, vectorise(r.feats, vocab), r.rule);
        r[variant + "Prob"] = p;
        r[variant] = p.map((x, k) => (x >= thresholds[k] ? 1 : 0));
      }
    }
  }
  for (const r of rows) r.union = r.rule.map((x, k) => (x || r.model[k] ? 1 : 0));
  const variants = { rules: "rule", model: "model", both: "both", union: "union" };
  const slice = (pred) => Object.fromEntries(Object.entries(variants).map(([name, key]) => [name, score(rows.filter(pred), key)]));
  return {
    rows,
    results: {
      all: slice(() => true),
      sv: slice((r) => r.lang === "sv"),
      en: slice((r) => r.lang === "en"),
      test3Only: slice((r) => r.set === "test3")
    },
    docs: docs.length,
    thresholdsSeen
  };
}

// Final model on all passages (used only if a variant clearly beats the rules).
export function trainFinal(rows = prepare(), useRule = false) {
  return trainWithThresholds(rows, useRule, mulberry32(CONFIG.seed));
}

export function topFeatures(model, vocab, k, n = 8) {
  const w = [...model.W[k]].map((x, i) => [x, vocab.names[i]]);
  w.sort((a, b) => b[0] - a[0]);
  return { positive: w.slice(0, n).map(([x, f]) => [f, +x.toFixed(3)]), negative: w.slice(-n).reverse().map(([x, f]) => [f, +x.toFixed(3)]) };
}

const pct = (x) => (x === null ? " n/a" : (x * 100).toFixed(0).padStart(3) + "%");
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const t0 = Date.now();
  const rows = prepare();
  const cv = crossValidate(rows);
  // what the model learned: train on all passages once (model variant) for inspection only
  const fin = trainFinal(rows, false);
  const finBoth = trainFinal(rows, true);
  const learned = Object.fromEntries(CATS.map((c, k) => [c, topFeatures(fin.model, fin.vocab, k)]));
  const ruleWeight = Object.fromEntries(CATS.map((c, k) => [c, +finBoth.model.r[k].toFixed(3)]));
  const out = {
    description: "Leave-one-document-out cross-validation: every passage is scored by a model that never saw any passage from its document. Thresholds chosen per category by grouped inner CV on the training documents only. Unit: (passage, category).",
    config: CONFIG, passages: rows.length, documents: cv.docs,
    languages: { sv: rows.filter((r) => r.lang === "sv").length, en: rows.filter((r) => r.lang === "en").length },
    results: cv.results,
    learnedTopFeatures: learned,
    ruleFeatureWeightInBoth: ruleWeight,
    finalThresholds: { model: fin.thresholds, both: finBoth.thresholds }
  };
  writeFileSync(join(here, "cv-results.json"), JSON.stringify(out, null, 1) + "\n");
  for (const [sl, res] of Object.entries(cv.results)) {
    console.log(`\n[${sl}] micro P / R / F1`);
    for (const [v, s] of Object.entries(res)) console.log(`  ${v.padEnd(6)} ${pct(s.micro.precision)} ${pct(s.micro.recall)} ${pct(s.micro.f1)}  (tp ${s.micro.tp} fp ${s.micro.fp} fn ${s.micro.fn})`);
  }
  console.log(`\n${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
