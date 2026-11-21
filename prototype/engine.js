// Public Decision Risk Lens: matching engine.
//
// Pure functions only: no network, no storage, no scoring. The engine splits a
// document into numbered passages, looks for the visible trigger patterns from
// the taxonomy and returns flags that a human reviewer must assess.

(function (root) {
  const taxonomyApi =
    typeof module !== "undefined" && module.exports
      ? require("./taxonomy.js")
      : root.RiskLensTaxonomy;

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // A pattern matches at the start of a word (letters or digits before it are
  // not allowed), case-insensitively, so "överklag" matches "överklagande".
  function patternToRegExp(pattern) {
    return new RegExp("(?<![\\p{L}\\p{N}])" + escapeRegExp(pattern), "giu");
  }

  // Split text into numbered passages. Paragraphs are separated by blank
  // lines. Very long paragraphs are split into sentences so flags stay
  // close to the text that prompted them.
  function splitPassages(text, maxLength = 600) {
    const normalised = String(text || "").replace(/\r\n?/g, "\n");
    const paragraphs = normalised
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
      .filter(Boolean);
    const passages = [];
    for (const para of paragraphs) {
      if (para.length <= maxLength) {
        passages.push(para);
        continue;
      }
      const sentences = para.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [para];
      let current = "";
      for (const s of sentences) {
        if (current && (current + s).length > maxLength) {
          passages.push(current.trim());
          current = "";
        }
        current += s;
      }
      if (current.trim()) passages.push(current.trim());
    }
    return passages.map((text, index) => ({ index: index + 1, text }));
  }

  // A pattern only has to match the start of a word, so the raw match can stop
  // inside a word ("prioritis" in "prioritising"). Extend the range to the end
  // of that word (Unicode letters, marks and digits, so "överklag" covers
  // "överklagas") so highlights and the reported term are whole words.
  const WORD_CHAR = /[\p{L}\p{M}\p{N}]/u;
  function extendToWordEnd(text, end) {
    if (end === 0 || !WORD_CHAR.test(text[end - 1])) return end;
    while (end < text.length && WORD_CHAR.test(text[end])) end++;
    return end;
  }

  // Negation: "inte automatiserat", "aldrig profilering", "not automated".
  // A match is skipped when a negating word stands right before it, or with
  // at most one word in between. Only the words before the match count, so a
  // later "not" in the sentence has no effect. Patterns that themselves start
  // with a negation ("without human") or a hedge ("fully automated") are
  // never skipped. ("utan" is not a negator here: "utan mänsklig granskning"
  // describes a missing safeguard and stays flagged.)
  // A hedge or limiter between the negator and the term keeps the flag:
  // "inte alltid automatiserat", "inte helt automatiserat", "not fully
  // automated", "no longer fully automated" all describe automation that
  // still happens, so they must not be hidden. "no" followed by a number or
  // a dot ("No. 5", "no 2016") is an abbreviation, not a negation.
  // Negation only removes terms that describe a risky practice (automation,
  // profiling, data sharing...). A negated SAFEGUARD is itself a warning
  // sign ("there is no appeal", "no human review"), so contestability,
  // accountability and the human-oversight safeguard terms are never skipped.
  const SAFEGUARD_CATEGORIES = new Set(["contestability", "accountability", "human-oversight"]);
  const RISK_TERM_IN_SAFEGUARD = /automat/i;
  const HEDGE = "alltid|helt|bara|enbart|endast|längre|nödvändigtvis|always|only|just|fully|entirely|solely|longer|necessarily";
  const NEGATION = new RegExp(
    "(?:^|[^\\p{L}\\p{N}])(?:inte|ej|icke|aldrig|not|never|no)" +
    "(?:\\s+(?!(?:" + HEDGE + ")(?![\\p{L}\\p{N}-]))(?![\\p{N}])[\\p{L}\\p{N}-]+)?\\s+$",
    "iu"
  );
  const NEGATED_PATTERN = /^(?:without|utan|no|not|inte|ej)\b/i;
  const HEDGED_PATTERN = new RegExp("^(?:" + HEDGE + ")(?![\\p{L}\\p{N}-])", "iu");
  function isNegated(text, start, pattern, category) {
    if (NEGATED_PATTERN.test(pattern) || HEDGED_PATTERN.test(pattern)) return false;
    if (SAFEGUARD_CATEGORIES.has(category) && !RISK_TERM_IN_SAFEGUARD.test(pattern)) return false;
    return NEGATION.test(text.slice(Math.max(0, start - 40), start));
  }

  // Every [start, end] range where a pattern matches, extended to word end.
  // Negated occurrences are left out (see isNegated).
  function matchRanges(text, pattern, category) {
    const re = patternToRegExp(pattern);
    const ranges = [];
    let m;
    while ((m = re.exec(text)) !== null) {
      if (isNegated(text, m.index, pattern, category)) continue;
      ranges.push([m.index, extendToWordEnd(text, m.index + m[0].length)]);
    }
    return ranges;
  }

  // Context gates. Some terms only name a topic ("automated decision",
  // "profiling", "GDPR") and say nothing about a risk on their own. A
  // category can list such terms under gated.terms; they only raise a flag
  // when one of gated.cues (a word that points at the actual concern, e.g.
  // explanation for transparency, a protected ground for discrimination)
  // appears in the same passage. Returns "" for ungated terms, the cue that
  // was found for gated terms, or null when the gate stays closed.
  function contextCue(text, category, pattern) {
    const gate = category.gated;
    if (!gate || !gate.terms.includes(pattern)) return "";
    for (const c of gate.cues) if (patternToRegExp(c).test(text)) return c;
    return null;
  }

  // Return one flag per passage, category and matched term. Each flag keeps
  // the rule that fired and the character ranges, so it can be traced.
  function findFlags(passages, taxonomy = taxonomyApi.TAXONOMY, extraRules = []) {
    const flags = [];
    const rules = normaliseRules(extraRules, taxonomy);
    for (const passage of passages) {
      for (const category of taxonomy) {
        for (const lang of Object.keys(category.patterns)) {
          for (const pattern of category.patterns[lang]) {
            const ranges = matchRanges(passage.text, pattern, category.id);
            if (!ranges.length) continue;
            const cue = contextCue(passage.text, category, pattern);
            if (cue === null) continue;
            flags.push({
              id: `p${passage.index}-${category.id}-${lang}-${pattern}`.replace(/\s+/g, "_"),
              passageIndex: passage.index,
              category: category.id,
              matchedTerm: passage.text.slice(ranges[0][0], ranges[0][1]),
              rule: `${category.id}/${lang}: "${pattern}" (word start, highlighted to word end, any case)` +
                (cue ? `, with context cue "${cue}" in the same passage` : ""),
              ranges
            });
          }
        }
      }
      // Reviewer-defined rules run after the taxonomy and are marked as such
      // in the flag and its rule text, so a log never mixes them up.
      for (const r of rules) {
        const ranges = matchRanges(passage.text, r.term, r.category);
        if (!ranges.length) continue;
        flags.push({
          id: `p${passage.index}-${r.category}-reviewer-${r.term}`.replace(/\s+/g, "_"),
          passageIndex: passage.index,
          category: r.category,
          matchedTerm: passage.text.slice(ranges[0][0], ranges[0][1]),
          rule: `reviewer-added/${r.category}: "${r.term}" (word start, highlighted to word end, any case)`,
          source: "reviewer",
          pattern: r.term,
          question: r.question,
          ranges
        });
      }
    }
    for (const f of flags) if (!f.source) f.source = "taxonomy";
    return flags;
  }

  // Validate reviewer-defined rules (from the panel or an imported rule pack).
  // Keeps only rules with a non-empty term and a known category; trims text
  // and drops duplicates. Returns plain { term, category, question } objects.
  function normaliseRules(rules, taxonomy = taxonomyApi.TAXONOMY) {
    const known = new Set(taxonomy.map((c) => c.id));
    const seen = new Set();
    const out = [];
    for (const r of Array.isArray(rules) ? rules : []) {
      if (!r || typeof r !== "object") continue;
      const term = String(r.term || "").trim().slice(0, 120);
      const category = String(r.category || "").trim();
      if (!term || !known.has(category)) continue;
      const key = category + "|" + term.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ term, category, question: String(r.question || "").trim().slice(0, 400) });
    }
    return out;
  }

  // Read a rule pack (parsed JSON). Accepts { rules: [...] } or a bare array.
  function parseRulePack(data, taxonomy = taxonomyApi.TAXONOMY) {
    const list = Array.isArray(data) ? data : data && Array.isArray(data.rules) ? data.rules : null;
    if (!list) throw new Error("A rule pack needs a \"rules\" list.");
    return normaliseRules(list, taxonomy);
  }

  function rulePack(rules) {
    return {
      format: "risk-lens-rule-pack",
      version: 1,
      notice: "Reviewer-defined patterns. A match is a prompt for human review, never a finding.",
      rules: normaliseRules(rules)
    };
  }

  // Word-set similarity (Jaccard) between two passages, 0 to 1.
  function tokens(text) {
    return new Set(String(text).toLowerCase().match(/[\p{L}\p{N}]+/gu) || []);
  }
  function similarity(a, b) {
    const A = tokens(a), B = tokens(b);
    if (!A.size && !B.size) return 1;
    let inter = 0;
    for (const t of A) if (B.has(t)) inter++;
    return inter / (A.size + B.size - inter);
  }

  // Compare the flags of two analysed versions of a document. A flag in B
  // "persists" when the same rule fired in A on a passage whose words are at
  // least `threshold` similar; otherwise it "appears". A-flags with no
  // partner "disappear". This describes wording only, not whether a concern
  // was resolved: a reviewer has to read both passages.
  function ruleKey(f) {
    return f.rule;
  }
  function compareVersions(a, b, threshold = 0.5) {
    const used = new Set();
    const persisted = [];
    const appeared = [];
    for (const fb of b.flags) {
      const pb = b.passages[fb.passageIndex - 1].text;
      let best = null;
      let bestScore = -1;
      a.flags.forEach((fa, i) => {
        if (used.has(i) || ruleKey(fa) !== ruleKey(fb)) return;
        const score = similarity(a.passages[fa.passageIndex - 1].text, pb);
        if (score > bestScore) { best = i; bestScore = score; }
      });
      if (best !== null && bestScore >= threshold) {
        used.add(best);
        persisted.push({ a: a.flags[best], b: fb, similarity: Math.round(bestScore * 100) / 100 });
      } else appeared.push({ b: fb });
    }
    const disappeared = a.flags.filter((_, i) => !used.has(i)).map((fa) => ({ a: fa }));
    return { appeared, disappeared, persisted, threshold };
  }

  // Everything needed to answer "why was this flagged?": the rule, the
  // matched span with surrounding words, the category text and the absence
  // checks for the same category (and whether each was found).
  function explainFlag(flag, result, taxonomy = taxonomyApi.TAXONOMY, checks = taxonomyApi.ABSENCE_CHECKS, radius = 80) {
    const passage = result.passages[flag.passageIndex - 1];
    const [s, e] = flag.ranges[0];
    const start = Math.max(0, s - radius);
    const end = Math.min(passage.text.length, e + radius);
    const cat = taxonomy.find((c) => c.id === flag.category) || {};
    const missing = new Set((result.absences || []).map((x) => x.id));
    return {
      rule: flag.rule,
      source: flag.source || "taxonomy",
      pattern: flag.pattern || (flag.rule.match(/: "(.*)" \(/) || [])[1] || flag.matchedTerm,
      context: {
        before: (start > 0 ? "..." : "") + passage.text.slice(start, s),
        match: passage.text.slice(s, e),
        after: passage.text.slice(e, end) + (end < passage.text.length ? "..." : "")
      },
      matchCount: flag.ranges.length,
      category: { id: cat.id, label: cat.label, description: cat.description, question: cat.question },
      reviewerQuestion: flag.question || "",
      relatedAbsenceChecks: checks.filter((c) => c.category === flag.category).map((c) => ({
        id: c.id, label: c.label, question: c.question,
        status: missing.has(c.id) ? "not found in this text" : "a related term appears in this text",
        patterns: c.patterns.slice()
      }))
    };
  }

  // Document-level checks for topics that never appear in the text. These are
  // labelled "not found in this text" and are not findings about the policy.
  function findAbsences(passages, checks = taxonomyApi.ABSENCE_CHECKS) {
    const fullText = passages.map((p) => p.text).join("\n");
    return checks
      .filter((check) => !check.patterns.some((p) => patternToRegExp(p).test(fullText)))
      .map((check) => ({
        id: check.id,
        type: "absence",
        category: check.category,
        label: check.label,
        question: check.question,
        status: "not found in this text",
        rule: `absence/${check.category}: none of ${check.patterns.map((p) => `"${p}"`).join(", ")}`
      }));
  }

  function analyse(text, extraRules = []) {
    const passages = splitPassages(text);
    return { passages, flags: findFlags(passages, undefined, extraRules), absences: findAbsences(passages) };
  }

  // Analyse a paged document (for example text extracted from a PDF). Each
  // page is split on its own, so every passage keeps the page it came from.
  // Passage numbers run on across pages.
  function analysePages(pages, extraRules = []) {
    const passages = [];
    for (const pg of pages || []) {
      for (const p of splitPassages(pg.text)) {
        passages.push({ index: passages.length + 1, page: pg.page, text: p.text });
      }
    }
    return { passages, flags: findFlags(passages, undefined, extraRules), absences: findAbsences(passages) };
  }

  const api = {
    extendToWordEnd, isNegated, splitPassages, findFlags, findAbsences, analyse, analysePages, patternToRegExp,
    normaliseRules, parseRulePack, rulePack, similarity, compareVersions, explainFlag
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RiskLensEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
