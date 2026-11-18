// Run with: node --test prototype/
const test = require("node:test");
const assert = require("node:assert/strict");
const { splitPassages, findFlags, findAbsences, analyse } = require("./engine.js");

test("splits paragraphs into numbered passages", () => {
  const p = splitPassages("First paragraph.\r\n\r\nSecond\nparagraph.\n\n\n");
  assert.equal(p.length, 2);
  assert.deepEqual(p[1], { index: 2, text: "Second paragraph." });
});

test("splits very long paragraphs into sentences", () => {
  const long = Array.from({ length: 20 }, (_, i) => `Sentence number ${i} is here.`).join(" ");
  const p = splitPassages(long, 100);
  assert.ok(p.length > 1);
  assert.ok(p.every((x) => x.text.length <= 100));
});

test("flags English and Swedish terms with passage, category and rule", () => {
  const flags = findFlags(splitPassages("The agency uses an automated decision.\n\nBeslutet kan överklagas."));
  const auto = flags.find((f) => f.rule.includes('"automated decision"'));
  assert.equal(auto.passageIndex, 1);
  assert.equal(auto.category, "transparency");
  assert.equal(auto.matchedTerm, "automated decision");
  const sv = flags.find((f) => f.category === "contestability");
  assert.equal(sv.passageIndex, 2);
  assert.equal(sv.matchedTerm, "överklag");
});

test("matches at word start only and ignores case", () => {
  const flags = findFlags(splitPassages("PROFILING is used. Remodel the office."));
  assert.ok(flags.some((f) => f.matchedTerm === "PROFILING"));
  assert.ok(!flags.some((f) => f.rule.includes('"model"')), "'model' inside 'Remodel' must not match");
});

test("reports absence as 'not found in this text', not as a finding", () => {
  const abs = findAbsences(splitPassages("The system assigns a risk score."));
  const ids = abs.map((a) => a.id);
  assert.ok(ids.includes("absence-contestability"));
  assert.ok(ids.includes("absence-human-oversight"));
  assert.ok(abs.every((a) => a.status === "not found in this text" && a.type === "absence"));
});

test("no absence note when the topic is mentioned", () => {
  const abs = findAbsences(splitPassages("A caseworker reviews each case. Decisions can be appealed."));
  const ids = abs.map((a) => a.id);
  assert.ok(!ids.includes("absence-contestability"));
  assert.ok(!ids.includes("absence-human-oversight"));
});

test("empty input returns no passages and no flags", () => {
  const r = analyse("   ");
  assert.equal(r.passages.length, 0);
  assert.equal(r.flags.length, 0);
});

test("flags never contain a score or a verdict", () => {
  const { flags } = analyse("The model uses personal data and a risk score.");
  for (const f of flags) {
    assert.deepEqual(Object.keys(f).sort(), ["category", "id", "matchedTerm", "passageIndex", "ranges", "rule"]);
  }
});
