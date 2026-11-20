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

  // Return one flag per passage, category and matched term. Each flag keeps
  // the rule that fired and the character ranges, so it can be traced.
  function findFlags(passages, taxonomy = taxonomyApi.TAXONOMY) {
    const flags = [];
    for (const passage of passages) {
      for (const category of taxonomy) {
        for (const lang of Object.keys(category.patterns)) {
          for (const pattern of category.patterns[lang]) {
            const re = patternToRegExp(pattern);
            const ranges = [];
            let m;
            while ((m = re.exec(passage.text)) !== null) {
              ranges.push([m.index, extendToWordEnd(passage.text, m.index + m[0].length)]);
            }
            if (!ranges.length) continue;
            flags.push({
              id: `p${passage.index}-${category.id}-${lang}-${pattern}`.replace(/\s+/g, "_"),
              passageIndex: passage.index,
              category: category.id,
              matchedTerm: passage.text.slice(ranges[0][0], ranges[0][1]),
              rule: `${category.id}/${lang}: "${pattern}" (word start, highlighted to word end, any case)`,
              ranges
            });
          }
        }
      }
    }
    return flags;
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

  function analyse(text) {
    const passages = splitPassages(text);
    return { passages, flags: findFlags(passages), absences: findAbsences(passages) };
  }

  // Analyse a paged document (for example text extracted from a PDF). Each
  // page is split on its own, so every passage keeps the page it came from.
  // Passage numbers run on across pages.
  function analysePages(pages) {
    const passages = [];
    for (const pg of pages || []) {
      for (const p of splitPassages(pg.text)) {
        passages.push({ index: passages.length + 1, page: pg.page, text: p.text });
      }
    }
    return { passages, flags: findFlags(passages), absences: findAbsences(passages) };
  }

  const api = { extendToWordEnd, splitPassages, findFlags, findAbsences, analyse, analysePages, patternToRegExp };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RiskLensEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
