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
  assert.equal(sv.matchedTerm, "överklagas");
});

test("matches at word start only and ignores case", () => {
  // Profiling needs a group or protected-ground cue since the precision round.
  const flags = findFlags(splitPassages("PROFILING by ethnic group is used. Remodel the office."));
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
    assert.deepEqual(Object.keys(f).sort(), ["category", "id", "matchedTerm", "passageIndex", "ranges", "rule", "source"]);
    assert.equal(f.source, "taxonomy");
  }
  const reviewer = analyse("A scorecard is used.", [{ term: "scorecard", category: "transparency" }]).flags;
  for (const f of reviewer) for (const k of Object.keys(f)) assert.ok(!/score$|verdict|severity/i.test(k), k);
});

test("analysePages keeps page numbers and runs passage numbers on", () => {
  const { analysePages } = require("./engine.js");
  const r = analysePages([
    { page: 1, text: "Intro paragraph.\n\nThe vendor runs an algorithm." },
    { page: 2, text: "Automated profiling of applicants by age group." }
  ]);
  assert.deepEqual(r.passages.map((p) => [p.index, p.page]), [[1, 1], [2, 1], [3, 2]]);
  const onPage2 = r.flags.filter((f) => f.passageIndex === 3);
  assert.ok(onPage2.length > 0);
});

test("highlight ranges cover the whole English word, not only the pattern stem", () => {
  const text = "The board is prioritising cases with a scoring model.";
  const flags = findFlags(splitPassages(text), [
    { id: "t", patterns: { en: ["prioritis"] } }
  ]);
  assert.equal(flags.length, 1);
  const [s, e] = flags[0].ranges[0];
  assert.equal(text.slice(s, e), "prioritising");
  assert.equal(flags[0].matchedTerm, "prioritising");
  assert.ok(flags[0].rule.includes('"prioritis"'));
});

test("highlight ranges cover the whole Swedish inflected word with åäö", () => {
  const text = "Beslutet kan överklagas till förvaltningsrätten.";
  const flags = findFlags(splitPassages(text), [
    { id: "t", patterns: { sv: ["överklag", "förvaltningsrätt"] } }
  ]);
  assert.deepEqual(flags.map((f) => f.matchedTerm), ["överklagas", "förvaltningsrätten"]);
  for (const f of flags) {
    const [s, e] = f.ranges[0];
    assert.equal(text.slice(s, e), f.matchedTerm);
  }
});

test("a pattern ending in a space or punctuation is not extended into the next word", () => {
  const { extendToWordEnd } = require("./engine.js");
  assert.equal(extendToWordEnd("risk score here", 5), 5);
  assert.equal(extendToWordEnd("risk score here", 3), 4);
});

// Reviewer-defined rules
const E = require("./engine.js");

test("engine applies reviewer-defined rules and marks them", () => {
  const rules = [{ term: "eligibility score", category: "discrimination", question: "Who set the threshold?" }];
  const r = E.analyse("The eligibility scores are computed weekly.", rules);
  const f = r.flags.find((x) => x.source === "reviewer");
  assert.ok(f);
  assert.equal(f.matchedTerm, "eligibility scores");
  assert.equal(f.category, "discrimination");
  assert.equal(f.question, "Who set the threshold?");
  assert.match(f.rule, /^reviewer-added\/discrimination: "eligibility score"/);
  assert.ok(r.flags.filter((x) => x.source !== "reviewer").every((x) => x.source === "taxonomy"));
});

test("reviewer rules are validated and de-duplicated", () => {
  const rules = E.normaliseRules([
    { term: "  X-ray ", category: "privacy" },
    { term: "x-ray", category: "privacy" },
    { term: "", category: "privacy" },
    { term: "foo", category: "no-such-category" },
    null
  ]);
  assert.deepEqual(rules, [{ term: "X-ray", category: "privacy", question: "" }]);
});

test("rule packs round-trip and reject malformed input", () => {
  const pack = E.rulePack([{ term: "scorecard", category: "transparency", question: "Is it published?" }]);
  assert.equal(pack.format, "risk-lens-rule-pack");
  assert.deepEqual(E.parseRulePack(JSON.parse(JSON.stringify(pack))), pack.rules);
  assert.throws(() => E.parseRulePack({ nope: 1 }));
});

test("compareVersions sorts flags into appeared, disappeared and persisted", () => {
  const a = E.analyse("The agency uses an algorithm to rank applications.\n\nThere is no appeal.");
  const b = E.analyse("The agency uses an algorithm to rank all applications.\n\nData is kept with a retention period of one year.");
  const c = E.compareVersions(a, b);
  assert.ok(c.persisted.some((x) => x.b.matchedTerm === "algorithm"));
  assert.ok(c.disappeared.some((x) => x.a.matchedTerm === "appeal"));
  assert.ok(c.appeared.some((x) => x.b.matchedTerm === "retention"));
  assert.equal(c.persisted.length + c.appeared.length, b.flags.length);
  assert.equal(c.persisted.length + c.disappeared.length, a.flags.length);
});

test("compareVersions does not pair the same rule across unrelated passages", () => {
  const a = E.analyse("Officers monitor the queue in the north office every morning.");
  const b = E.analyse("Completely different wording: we monitor nothing about anyone.");
  const c = E.compareVersions(a, b);
  assert.equal(c.persisted.length, 0);
});

test("explainFlag gives rule, context, category and related absence checks", () => {
  const r = E.analyse("Short intro. The tool uses an algorithm to decide. More text follows here.");
  const f = r.flags.find((x) => x.matchedTerm === "algorithm");
  const x = E.explainFlag(f, r);
  assert.equal(x.pattern, "algorithm");
  assert.equal(x.context.match, "algorithm");
  assert.ok(x.context.before.endsWith("uses an "));
  assert.equal(x.category.id, "transparency");
  assert.ok(x.category.question.length > 0);
  assert.ok(x.relatedAbsenceChecks.length >= 1);
  assert.equal(x.relatedAbsenceChecks[0].status, "not found in this text");
});

test("Swedish inflections of automatiserad are matched", () => {
  for (const s of ["Beslutet fattas automatiserat.", "Automatiserade beslut används.", "Ärendet automatiseras och beslutet fattas utan handläggare."]) {
    const cats = findFlags(splitPassages(s)).map((f) => f.category);
    assert.ok(cats.includes("transparency") && cats.includes("human-oversight"), s);
  }
});

test("a bare mention of automation, profiling or GDPR is context, not a flag", () => {
  const cats = findFlags(splitPassages("Ärendehanteringen automatiseras. The GDPR covers profiling.")).map((f) => f.category);
  for (const c of ["transparency", "human-oversight", "discrimination", "privacy"]) assert.ok(!cats.includes(c), c);
  const rule = findFlags(splitPassages("Profiling may disadvantage an ethnic group.")).find((f) => f.category === "discrimination").rule;
  assert.match(rule, /context cue "ethnic"/);
});

test("a negated term is not flagged, a later negation does not hide it", () => {
  assert.ok(!findFlags(splitPassages("Beslutet fattas inte automatiserat.")).some((f) => f.category === "transparency"));
  // "not fully automated" means partly automated: the hedge keeps the flag.
  assert.ok(findFlags(splitPassages("The decision is not fully automated by any algorithm.")).some((f) => f.rule.includes('"fully automated"')));
  assert.ok(findFlags(splitPassages("An algorithm is used, which is not ideal.")).some((f) => f.rule.includes('"algorithm"')));
  assert.ok(findFlags(splitPassages("It runs without human review.")).some((f) => f.rule.includes('"without human"')));
  // A negated safeguard is still a reason to look closer.
  assert.ok(findFlags(splitPassages("There is no appeal.")).some((f) => f.category === "contestability"));
  assert.ok(findFlags(splitPassages("Ingen handläggare granskar, beslutet kan inte överklagas.")).some((f) => f.category === "contestability"));
});

test("a hedge after the negation keeps the flag (partial automation is still automation)", () => {
  const cats = (s) => findFlags(splitPassages(s)).map((f) => f.category);
  const a = cats("Beslut fattas inte alltid automatiserat.");
  assert.ok(a.includes("transparency") && a.includes("human-oversight"), a.join());
  assert.ok(cats("Beslutet fattas inte helt automatiserat, men ofta.").length > 0);
  assert.ok(cats("Decisions are no longer fully automated except in simple cases.").length > 0);
});

test("\"no\" before a number or a dot is an abbreviation, not a negation", () => {
  assert.ok(findFlags(splitPassages("Regulation no 2016 algorithm")).some((f) => f.rule.includes('"algorithm"')));
  assert.ok(findFlags(splitPassages("Regulation No. 5 algorithm")).some((f) => f.rule.includes('"algorithm"')));
});

test("negated safeguards stay flagged after the hedge fix", () => {
  const has = (s, c) => findFlags(splitPassages(s)).some((f) => f.category === c);
  assert.ok(has("There is no human review.", "human-oversight"));
  assert.ok(has("Det sker utan mänsklig granskning.", "human-oversight"));
  assert.ok(has("There is no appeal.", "contestability"));
  assert.ok(has("Beslutet kan inte överklagas.", "contestability"));
  // A plain negation still hides the risk term.
  assert.ok(!has("Beslutet fattas inte automatiserat.", "transparency"));
});
