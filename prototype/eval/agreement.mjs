// Inter-annotator agreement for the three-annotator sets.
// Run with: npm run agreement   (or: node prototype/eval/agreement.mjs [test4])
// Without an argument it reads the test2+test3 round in annotations/; with a
// round name it reads annotations/<round>/.
// Reads prototype/eval/annotations/ann-*.json and reports Fleiss' kappa per
// category, the share of passages where all annotators agree, and how many
// passages the majority labels. No dependencies.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "annotations");
export const CATEGORIES = ["transparency", "accountability", "discrimination", "privacy", "contestability", "human-oversight", "security", "misuse"];

// Fleiss' kappa for one yes/no category: counts[i] = annotators who said yes on item i.
export function fleiss(counts, n) {
  const N = counts.length;
  if (!N) return NaN;
  const pYes = counts.reduce((a, k) => a + k, 0) / (N * n);
  const pBar = counts.reduce((a, k) => a + (k * (k - 1) + (n - k) * (n - k - 1)) / (n * (n - 1)), 0) / N;
  const pE = pYes ** 2 + (1 - pYes) ** 2;
  return pE === 1 ? NaN : (pBar - pE) / (1 - pE);
}

export function agreement(round = "") {
  const where = round ? join(dir, round) : dir;
  const files = readdirSync(where).filter((f) => /^ann-.*\.json$/.test(f)).sort();
  const anns = files.map((f) => JSON.parse(readFileSync(join(where, f), "utf8")).labels);
  const n = anns.length;
  const ids = [...new Set(anns.flatMap((a) => Object.keys(a)))].sort();
  const rows = [];
  const pooled = [];
  for (const c of CATEGORIES) {
    const counts = ids.map((id) => anns.filter((a) => (a[id] || []).includes(c)).length);
    pooled.push(...counts);
    rows.push({ category: c, kappa: fleiss(counts, n), unanimous: counts.filter((k) => k === 0 || k === n).length / ids.length, majorityYes: counts.filter((k) => k * 2 > n).length });
  }
  return { annotators: n, passages: ids.length, rows, pooledKappa: fleiss(pooled, n) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = agreement(process.argv[2] || "");
  console.log(`Annotators: ${r.annotators}. Passages: ${r.passages}.\n`);
  console.log("category          kappa  unanimous  majority yes");
  for (const x of r.rows) console.log(`${x.category.padEnd(16)}${x.kappa.toFixed(2).padStart(7)}${(Math.round(x.unanimous * 100) + "%").padStart(11)}${String(x.majorityYes).padStart(14)}`);
  console.log(`${"ALL (pooled)".padEnd(16)}${r.pooledKappa.toFixed(2).padStart(7)}`);
}
