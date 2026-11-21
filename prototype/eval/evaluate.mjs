// Evaluate the matching engine against the hand-annotated gold set.
// Run with: npm run eval   (or: node prototype/eval/evaluate.mjs [gold|heldout] [--json])
// "gold" (default) is the tuning set; "heldout" is the blind-labelled set of
// documents the engine was never tuned on (see heldout.json).
// No dependencies. The unit of evaluation is (passage, category): the engine
// "predicts" a category for a passage when at least one taxonomy pattern of
// that category fires in it. Reviewer-added rules are not used.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const engine = require(join(here, "..", "engine.js"));
const { TAXONOMY } = require(join(here, "..", "taxonomy.js"));

// test2 is the frozen final test set: scored once after the precision round, never tuned on.
export const SETS = { gold: "gold.json", heldout: "heldout.json", test2: "test2.json" };
export function loadSet(name = "gold") {
  if (!SETS[name]) throw new Error(`unknown set "${name}", use one of: ${Object.keys(SETS).join(", ")}`);
  return JSON.parse(readFileSync(join(here, SETS[name]), "utf8"));
}

export function evaluate(gold = loadSet("gold")) {
  const cats = TAXONOMY.map((c) => c.id);
  const stats = Object.fromEntries(cats.map((c) => [c, { tp: 0, fp: 0, fn: 0 }]));
  const falsePositives = [];
  const falseNegatives = [];
  for (const p of gold.passages) {
    const flags = engine.findFlags([{ index: 1, text: p.text }]);
    const predicted = new Map();
    for (const f of flags) {
      if (!predicted.has(f.category)) predicted.set(f.category, []);
      predicted.get(f.category).push(`"${f.matchedTerm}" (rule ${f.rule.split(" (")[0]})`);
    }
    const expected = new Map(p.labels.map((l) => [l.category, l.reason]));
    const where = `${p.sample} #${p.index}`;
    for (const c of cats) {
      const pr = predicted.has(c), ex = expected.has(c);
      if (pr && ex) stats[c].tp++;
      else if (pr) { stats[c].fp++; falsePositives.push({ where, category: c, fired: predicted.get(c), text: p.text }); }
      else if (ex) { stats[c].fn++; falseNegatives.push({ where, category: c, reason: expected.get(c), text: p.text }); }
    }
  }
  const ratio = (a, b) => (b ? a / b : null);
  const f1 = (p, r) => (p && r ? (2 * p * r) / (p + r) : p === null || r === null ? null : 0);
  const perCategory = cats.map((c) => {
    const { tp, fp, fn } = stats[c];
    const precision = ratio(tp, tp + fp), recall = ratio(tp, tp + fn);
    return { category: c, support: tp + fn, tp, fp, fn, precision, recall, f1: f1(precision, recall) };
  });
  const T = perCategory.reduce((a, s) => ({ tp: a.tp + s.tp, fp: a.fp + s.fp, fn: a.fn + s.fn }), { tp: 0, fp: 0, fn: 0 });
  const precision = ratio(T.tp, T.tp + T.fp), recall = ratio(T.tp, T.tp + T.fn);
  return {
    passages: gold.passages.length,
    overall: { ...T, support: T.tp + T.fn, precision, recall, f1: f1(precision, recall) },
    perCategory, falsePositives, falseNegatives
  };
}

const pct = (x) => (x === null ? "  n/a" : (x * 100).toFixed(0).padStart(4) + "%");

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const setName = process.argv.slice(2).find((a) => !a.startsWith("--")) || "gold";
  const r = evaluate(loadSet(setName));
  if (process.argv.includes("--json")) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
  console.log(`Set: ${setName}. Passages: ${r.passages}. Unit: (passage, category). Single AI annotator, see gold.json.\n`);
  console.log("category          support   TP  FP  FN  precision  recall     F1");
  for (const s of [...r.perCategory, { category: "OVERALL (micro)", ...r.overall }]) {
    console.log(`${s.category.padEnd(17)} ${String(s.support).padStart(7)} ${String(s.tp).padStart(4)} ${String(s.fp).padStart(3)} ${String(s.fn).padStart(3)}      ${pct(s.precision)}   ${pct(s.recall)}  ${pct(s.f1)}`);
  }
  console.log(`\nFalse positives (${r.falsePositives.length}): a pattern fired, the annotator says the category does not apply`);
  for (const e of r.falsePositives) console.log(`  - ${e.where} [${e.category}] fired: ${e.fired.join("; ")}\n      "${e.text.slice(0, 110)}${e.text.length > 110 ? "..." : ""}"`);
  console.log(`\nFalse negatives (${r.falseNegatives.length}): the category applies, no pattern fired`);
  for (const e of r.falseNegatives) console.log(`  - ${e.where} [${e.category}] should trigger because: ${e.reason}\n      "${e.text.slice(0, 110)}${e.text.length > 110 ? "..." : ""}"`);
}
