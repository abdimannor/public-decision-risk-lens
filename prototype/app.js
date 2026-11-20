// Public Decision Risk Lens: page logic. All processing stays in the browser.
(function () {
  const { TAXONOMY } = window.RiskLensTaxonomy;
  const Engine = window.RiskLensEngine;
  const $ = (id) => document.getElementById(id);
  const DECISIONS = [
    ["accept", "Accept"],
    ["reject", "Reject"],
    ["contextualise", "Contextualise"]
  ];

  let result = null;
  let reviews = {}; // flag id -> { decision, note }
  let sourceName = "pasted text";
  let pages = null; // [{ page, text }] when the document came from a PDF
  const STORE_KEY = "risk-lens-review-v1";
  const RULES_KEY = "risk-lens-rules-v1";
  let rules = loadRules(); // reviewer-defined rules: [{ term, category, question }]

  function loadRules() {
    try { return Engine.normaliseRules(JSON.parse(localStorage.getItem(RULES_KEY) || "[]")); } catch (e) { return []; }
  }
  function saveRules() {
    try { localStorage.setItem(RULES_KEY, JSON.stringify(rules)); } catch (e) { /* storage may be unavailable */ }
  }
  const catLabel = (id) => (TAXONOMY.find((c) => c.id === id) || {}).label || id;

  // Saves the document, reviewer and decisions in this browser only (localStorage).
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        text: $("doc").value, pages, sourceName, reviewer: $("reviewer").value, reviews
      }));
    } catch (e) { /* storage may be unavailable, e.g. private mode */ }
  }

  function restore() {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch (e) { saved = null; }
    if (!saved || !saved.text) return;
    $("doc").value = saved.text;
    sourceName = saved.sourceName || "pasted text";
    pages = Array.isArray(saved.pages) ? saved.pages : null;
    $("reviewer").value = saved.reviewer || "";
    analyse(saved.reviews || {});
  }

  function clearReview() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    result = null;
    reviews = {};
    sourceName = "pasted text";
    pages = null;
    $("doc").value = "";
    $("reviewer").value = "";
    $("file").value = "";
    $("workspace").hidden = true;
    $("riskmap-section").hidden = true;
    $("clear").hidden = true;
    $("status").textContent = "Review cleared. Nothing is stored in this browser.";
  }

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const c of children) if (c != null) node.append(c);
    return node;
  }

  function mergeRanges(ranges) {
    const sorted = ranges.slice().sort((a, b) => a[0] - b[0]);
    const out = [];
    for (const r of sorted) {
      const last = out[out.length - 1];
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
      else out.push([r[0], r[1]]);
    }
    return out;
  }

  function renderPassages() {
    const list = $("passages");
    list.replaceChildren();
    for (const p of result.passages) {
      const flags = result.flags.filter((f) => f.passageIndex === p.index);
      const li = el("li", { id: `passage-${p.index}`, value: String(p.index), tabindex: "-1" });
      if (p.page) li.dataset.page = String(p.page);
      if (flags.length) li.classList.add("flagged");
      let pos = 0;
      for (const [s, e] of mergeRanges(flags.flatMap((f) => f.ranges))) {
        li.append(p.text.slice(pos, s), el("mark", {}, p.text.slice(s, e)));
        pos = e;
      }
      li.append(p.text.slice(pos));
      list.append(li);
    }
  }

  function goToPassage(index) {
    document.querySelectorAll(".passages li.active").forEach((n) => n.classList.remove("active"));
    const li = $(`passage-${index}`);
    if (!li) return;
    li.classList.add("active");
    li.scrollIntoView({ block: "center" });
    li.focus({ preventScroll: true });
  }

  // Risk map: one column per passage, one row per category. Lit cells show
  // where trigger terms cluster. It counts matches; it does not weigh them.
  function renderRiskMap() {
    const box = $("riskmap");
    box.replaceChildren();
    const n = result.passages.length;
    const legend = el("ul", { class: "rm-legend" });
    const grid = el("div", { class: "rm-grid", style: `--cols:${n}` });
    for (const cat of TAXONOMY) {
      const hits = new Set(result.flags.filter((f) => f.category === cat.id).map((f) => f.passageIndex));
      const count = result.flags.filter((f) => f.category === cat.id).length;
      legend.append(el("li", { class: "rm-key", "data-cat": cat.id, "data-count": String(count) },
        el("span", { class: "sw", "aria-hidden": "true" }), cat.label, " ", el("b", {}, String(count))));
      const row = el("div", { class: "rm-row", "data-cat": cat.id, role: "group", "aria-label": `${cat.label}: ${count} flags` });
      row.append(el("span", { class: "rm-label" }, cat.label));
      const cells = el("div", { class: "rm-cells" });
      for (const p of result.passages) {
        if (hits.has(p.index)) {
          cells.append(el("button", {
            type: "button", class: "rm-cell on", title: `${cat.label}: ${passageLabel(p.index)}`,
            "aria-label": `${cat.label} in ${passageLabel(p.index)}`, onclick: () => goToPassage(p.index)
          }));
        } else cells.append(el("span", { class: "rm-cell", "aria-hidden": "true" }));
      }
      row.append(cells);
      grid.append(row);
    }
    const pageTicks = el("div", { class: "rm-pages", "aria-hidden": "true" });
    let lastPage = null;
    for (const p of result.passages) {
      pageTicks.append(el("span", { class: p.page && p.page !== lastPage ? "tick" : "" }, p.page && p.page !== lastPage ? `p${p.page}` : ""));
      lastPage = p.page || lastPage;
    }
    if (lastPage) grid.append(el("div", { class: "rm-row" }, el("span", { class: "rm-label" }, "Page"), pageTicks));
    box.append(legend, grid);
  }

  function renderAbsences() {
    const box = $("absences");
    box.replaceChildren();
    if (!result.absences.length) return;
    box.append(el("h3", {}, "Not found in this text"));
    box.append(el("p", { class: "hint" }, "These topics are not mentioned in the text you analysed. They may be covered in other documents. This is a prompt to check, not a finding."));
    for (const a of result.absences) {
      box.append(el("div", { class: "absence" }, el("strong", {}, a.label), a.question, el("br"), el("code", {}, a.rule)));
    }
  }

  function renderFlag(f) {
    const review = reviews[f.id] || (reviews[f.id] = { decision: "", note: "" });
    const wrap = el("div", { class: "flag", "data-decision": review.decision, "data-source": f.source || "taxonomy" });
    const name = `d-${f.id}`;
    const fs = el("fieldset", {}, el("legend", {}, "Reviewer decision"));
    for (const [value, label] of DECISIONS) {
      const input = el("input", { type: "radio", name, value });
      if (review.decision === value) input.checked = true;
      input.addEventListener("change", () => {
        review.decision = value;
        wrap.dataset.decision = value;
        updateStatus();
        save();
      });
      fs.append(el("label", {}, input, label));
    }
    const noteId = `n-${f.id}`;
    const note = el("textarea", { id: noteId, rows: "2" });
    note.value = review.note;
    note.addEventListener("input", () => { review.note = note.value; save(); });
    wrap.append(
      el("div", { class: "meta" },
        el("button", { type: "button", class: "linkbtn", onclick: () => goToPassage(f.passageIndex) }, passageLabel(f.passageIndex)),
        ` matched "${f.matchedTerm}"`,
        f.source === "reviewer" ? el("span", { class: "badge" }, "Reviewer-added") : null),
      el("code", {}, f.rule),
      f.question ? el("p", { class: "rq" }, "Your question: ", el("em", {}, f.question)) : null,
      renderWhy(f),
      fs,
      el("label", { for: noteId }, "Review note"),
      note
    );
    return wrap;
  }

  // "Why this flag?": the exact rule, the matched span in context, the
  // category description and question, and the related absence checks.
  function renderWhy(f) {
    const x = Engine.explainFlag(f, result);
    const d = el("details", { class: "why" }, el("summary", {}, "Why this flag?"));
    const dl = el("dl", {},
      el("dt", {}, "Rule"), el("dd", {}, el("code", {}, x.rule),
        x.source === "reviewer" ? " Added by a reviewer in this browser, not part of the built-in taxonomy." : " From the built-in draft taxonomy."),
      el("dt", {}, "Pattern"), el("dd", {}, `"${x.pattern}" matched at the start of a word, any case, ${x.matchCount} time${x.matchCount === 1 ? "" : "s"} in this passage.`),
      el("dt", {}, "In context"), el("dd", { class: "ctx" }, x.context.before, el("mark", {}, x.context.match), x.context.after),
      el("dt", {}, x.category.label || "Category"), el("dd", {}, x.category.description, " ", el("em", {}, x.category.question)));
    if (x.reviewerQuestion) dl.append(el("dt", {}, "Reviewer question"), el("dd", {}, x.reviewerQuestion));
    dl.append(el("dt", {}, "Related absence checks"), el("dd", {}, x.relatedAbsenceChecks.length
      ? el("ul", {}, ...x.relatedAbsenceChecks.map((c) => el("li", {}, el("strong", {}, c.label), `: ${c.status}. Looks for ${c.patterns.map((p) => `"${p}"`).join(", ")}.`)))
      : "None for this category."));
    d.append(dl, el("p", { class: "hint" }, "A match means the passage may deserve a closer look. It is not a finding."));
    return d;
  }

  function pageOf(index) {
    return result.passages[index - 1]?.page || null;
  }

  function passageLabel(index) {
    const page = pageOf(index);
    return page ? `Passage ${index}, page ${page}` : `Passage ${index}`;
  }

  function renderFlags() {
    const box = $("flag-groups");
    box.replaceChildren();
    if (!result.flags.length) {
      box.append(el("p", {}, "No trigger terms were found. That does not mean the document is free of risk."));
      return;
    }
    for (const cat of TAXONOMY) {
      const flags = result.flags.filter((f) => f.category === cat.id);
      if (!flags.length) continue;
      const group = el("details", { class: "group", open: "", "data-cat": cat.id },
        el("summary", {}, `${cat.label} (${flags.length})`),
        el("p", { class: "q" }, cat.description, " ", el("em", {}, cat.question)));
      flags.forEach((f) => group.append(renderFlag(f)));
      box.append(group);
    }
  }

  function updateStatus() {
    if (!result) return;
    const done = Object.values(reviews).filter((r) => r.decision).length;
    $("status").textContent = `${result.passages.length} passages, ${result.flags.length} flags, ${result.absences.length} topics not found. Reviewed ${done} of ${result.flags.length} flags.`;
  }

  function analyse(savedReviews) {
    const text = $("doc").value;
    if (!text.trim()) {
      $("status").textContent = "Paste or load a document first.";
      return;
    }
    result = pages ? Engine.analysePages(pages, rules) : Engine.analyse(text, rules);
    reviews = savedReviews && typeof savedReviews === "object" && !(savedReviews instanceof Event) ? savedReviews : {};
    renderPassages();
    renderRiskMap();
    renderAbsences();
    renderFlags();
    $("workspace").hidden = false;
    $("riskmap-section").hidden = false;
    $("clear").hidden = false;
    updateStatus();
    save();
  }

  function buildLog() {
    const category = Object.fromEntries(TAXONOMY.map((c) => [c.id, c.label]));
    return {
      tool: "Public Decision Risk Lens prototype",
      notice: "Advisory discussion aid. Pattern matching can miss risks and produce false positives. Not a verdict.",
      exportedAt: new Date().toISOString(),
      source: sourceName,
      reviewer: $("reviewer").value.trim() || null,
      flags: result.flags.map((f) => ({
        id: f.id,
        passageIndex: f.passageIndex,
        page: pageOf(f.passageIndex),
        category: category[f.category],
        matchedTerm: f.matchedTerm,
        rule: f.rule,
        ruleSource: f.source === "reviewer" ? "reviewer-added" : "taxonomy",
        reviewerQuestion: f.question || undefined,
        passage: result.passages[f.passageIndex - 1].text,
        decision: reviews[f.id]?.decision || "not reviewed",
        note: reviews[f.id]?.note || ""
      })),
      reviewerRules: rules.map((r) => ({ ...r, category: catLabel(r.category) })),
      notFoundInThisText: result.absences.map((a) => ({ label: a.label, question: a.question, rule: a.rule }))
    };
  }

  function toMarkdown(log) {
    const lines = [
      "# Review log: Public Decision Risk Lens prototype", "",
      `> ${log.notice}`, "",
      `- Exported: ${log.exportedAt}`, `- Source: ${log.source}`, `- Reviewer: ${log.reviewer || "not given"}`, "",
      "## Flags", ""
    ];
    for (const f of log.flags) {
      lines.push(`### Passage ${f.passageIndex}${f.page ? `, page ${f.page}` : ""}: ${f.category} ("${f.matchedTerm}")${f.ruleSource === "reviewer-added" ? " [reviewer-added rule]" : ""}`, "",
        `- Rule: \`${f.rule}\``, ...(f.reviewerQuestion ? [`- Reviewer question: ${f.reviewerQuestion}`] : []), `- Decision: ${f.decision}`, `- Note: ${f.note || "(none)"}`, "",
        ...f.passage.split("\n").map((l) => `> ${l}`), "");
    }
    lines.push("## Reviewer-added rules", "");
    if (!log.reviewerRules.length) lines.push("(none)");
    for (const r of log.reviewerRules) lines.push(`- "${r.term}" (${r.category})${r.question ? `: ${r.question}` : ""}`);
    lines.push("", "## Not found in this text", "");
    if (!log.notFoundInThisText.length) lines.push("(none)");
    for (const a of log.notFoundInThisText) lines.push(`- ${a.label}. ${a.question} Rule: \`${a.rule}\``);
    return lines.join("\n") + "\n";
  }

  // Printable report (A4). Built from the same log as the exports, so the
  // printed document never says more than the review log does.
  function buildReport() {
    const log = buildLog();
    const box = $("report");
    box.replaceChildren();
    const counts = TAXONOMY.map((c) => [c, log.flags.filter((f) => f.category === c.label).length]).filter(([, n]) => n);
    const decided = log.flags.filter((f) => f.decision !== "not reviewed").length;
    box.append(
      el("header", { class: "r-head" },
        el("p", { class: "r-kicker" }, "Public Decision Risk Lens prototype"),
        el("h1", {}, "Review report"),
        el("p", { class: "r-notice" }, el("strong", {}, "Advisory discussion aid. "), log.notice.replace(/^Advisory discussion aid\. /, ""), " It does not decide anything and does not assess people."),
        el("dl", { class: "r-meta" },
          el("dt", {}, "Source"), el("dd", {}, log.source),
          el("dt", {}, "Reviewer"), el("dd", {}, log.reviewer || "not given"),
          el("dt", {}, "Generated"), el("dd", {}, new Date(log.exportedAt).toLocaleString()),
          el("dt", {}, "Reviewed"), el("dd", {}, `${decided} of ${log.flags.length} flags`))),
      el("h2", {}, "Flags by category"),
      el("ul", { class: "r-counts" }, ...counts.map(([c, n]) => el("li", { "data-cat": c.id }, el("span", { class: "sw" }), `${c.label}: ${n}`))));
    if (!counts.length) box.append(el("p", {}, "No trigger terms were found. That does not mean the document is free of risk."));
    box.append(el("h2", {}, "Flags and decisions"));
    for (const f of log.flags) {
      const cat = TAXONOMY.find((c) => c.label === f.category);
      box.append(el("article", { class: "r-flag", "data-cat": cat ? cat.id : "" },
        el("h3", {}, `Passage ${f.passageIndex}${f.page ? `, page ${f.page}` : ""}: ${f.category}`, f.ruleSource === "reviewer-added" ? el("span", { class: "badge" }, "Reviewer-added") : null),
        el("p", { class: "r-line" }, `Matched "${f.matchedTerm}". Decision: `, el("strong", {}, f.decision), f.note ? `. Note: ${f.note}` : ""),
        el("blockquote", {}, f.passage),
        el("p", { class: "r-rule" }, f.rule)));
    }
    if (log.reviewerRules.length) {
      box.append(el("h2", {}, "Reviewer-added rules"),
        el("ul", {}, ...log.reviewerRules.map((r) => el("li", {}, `"${r.term}" (${r.category})`, r.question ? `: ${r.question}` : ""))));
    }
    box.append(el("h2", {}, "Not found in this text"));
    if (!log.notFoundInThisText.length) box.append(el("p", {}, "(none)"));
    else box.append(el("ul", {}, ...log.notFoundInThisText.map((x) => el("li", {}, el("strong", {}, x.label), ". ", x.question))));
    box.append(el("p", { class: "r-foot" }, "Pattern matching can miss risks and produce false positives. Every flag needs a human reviewer. Building AI course project."));
  }

  function download(name, type, content) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = el("a", { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function stamp() {
    return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  }

  $("analyse").addEventListener("click", () => analyse());
  $("clear").addEventListener("click", clearReview);
  $("reviewer").addEventListener("input", save);
  $("load-sample").addEventListener("click", () => {
    $("doc").value = window.RiskLensSample.text;
    sourceName = window.RiskLensSample.title;
    analyse();
  });
  $("doc").addEventListener("input", () => { sourceName = "pasted text"; pages = null; });
  $("file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    try {
      if (isPdf) {
        $("status").textContent = `Reading ${file.name} in this browser...`;
        pages = await readPdf(file);
        $("doc").value = pages.map((p) => p.text).join("\n\n");
        if (!$("doc").value.trim()) {
          pages = null;
          $("status").textContent = "No text layer was found in this PDF. Scanned PDFs need OCR first; this tool does not do OCR.";
          return;
        }
      } else {
        pages = null;
        $("doc").value = await file.text();
      }
      sourceName = file.name;
      analyse();
    } catch (err) {
      pages = null;
      $("status").textContent = `Could not read ${file.name}: ${err.message || err}`;
    }
  });

  // PDF text extraction with the vendored pdf.js. Lines are rebuilt from the
  // text items; a vertical gap larger than about one and a half lines starts a
  // new paragraph, so passages stay close to the visible layout.
  let pdfjsPromise = null;
  function loadPdfjs() {
    if (!pdfjsPromise) {
      const base = new URL("vendor/pdfjs/", document.baseURI);
      pdfjsPromise = import(new URL("pdf.min.mjs", base).href).then((lib) => {
        lib.GlobalWorkerOptions.workerSrc = new URL("pdf.worker.min.mjs", base).href;
        return lib;
      });
    }
    return pdfjsPromise;
  }

  async function readPdf(file) {
    const lib = await loadPdfjs();
    const task = lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false });
    const doc = await task.promise;
    const out = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      let text = "";
      let lastY = null;
      let lastH = 0;
      for (const item of content.items) {
        if (typeof item.str !== "string") continue;
        const y = item.transform[5];
        const h = item.height || lastH || 10;
        if (lastY !== null && Math.abs(lastY - y) > h * 1.6 && !text.endsWith("\n\n")) text = text.replace(/\s*$/, "") + "\n\n";
        else if (lastY !== null && Math.abs(lastY - y) > h * 0.5 && !/\s$/.test(text)) text += "\n";
        text += item.str;
        if (item.hasEOL && !/\s$/.test(text)) text += "\n";
        lastY = y;
        lastH = h;
      }
      out.push({ page: n, text: text.trim() });
    }
    await task.destroy();
    return out;
  }
  $("export-json").addEventListener("click", () => result && download(`review-log-${stamp()}.json`, "application/json", JSON.stringify(buildLog(), null, 2)));
  $("print-report").addEventListener("click", () => { if (!result) return; buildReport(); window.print(); });
  window.addEventListener("beforeprint", () => result && buildReport());
  $("export-md").addEventListener("click", () => result && download(`review-log-${stamp()}.md`, "text/markdown", toMarkdown(buildLog())));

  // Reviewer-defined rules panel.
  for (const c of TAXONOMY) $("rule-cat").append(el("option", { value: c.id }, c.label));
  function renderRules() {
    const list = $("rule-list");
    list.replaceChildren();
    if (!rules.length) { list.append(el("li", { class: "empty" }, "No rules of your own yet.")); return; }
    rules.forEach((r, i) => list.append(el("li", { "data-cat": r.category },
      el("span", { class: "sw", "aria-hidden": "true" }), el("strong", {}, `"${r.term}"`), ` ${catLabel(r.category)}`,
      r.question ? el("span", { class: "rq" }, ` ${r.question}`) : null,
      el("button", { type: "button", class: "linkbtn", "aria-label": `Remove rule "${r.term}"`, onclick: () => { rules.splice(i, 1); rulesChanged(`Removed "${r.term}".`); } }, "Remove"))));
  }
  function rulesChanged(msg) {
    saveRules();
    renderRules();
    $("rules-status").textContent = `${msg} ${rules.length} rule${rules.length === 1 ? "" : "s"} of your own.`;
    if (result) analyse(reviews);
  }
  $("rule-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const added = Engine.normaliseRules([...rules, { term: $("rule-term").value, category: $("rule-cat").value, question: $("rule-q").value }]);
    if (added.length === rules.length) { $("rules-status").textContent = "That rule is empty or already in the list."; return; }
    rules = added;
    $("rule-term").value = ""; $("rule-q").value = "";
    rulesChanged(`Added "${rules[rules.length - 1].term}".`);
  });
  $("rules-export").addEventListener("click", () => download(`risk-lens-rules-${stamp()}.json`, "application/json", JSON.stringify(Engine.rulePack(rules), null, 2)));
  $("rules-import").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const incoming = Engine.parseRulePack(JSON.parse(await file.text()));
      const before = rules.length;
      rules = Engine.normaliseRules([...rules, ...incoming]);
      rulesChanged(`Imported ${rules.length - before} new rule${rules.length - before === 1 ? "" : "s"} from ${file.name}.`);
    } catch (err) {
      $("rules-status").textContent = `Could not import ${file.name}: ${err.message || err}`;
    }
    e.target.value = "";
  });
  renderRules();

  // Compare two versions.
  for (const v of ["a", "b"]) {
    $(`ver-${v}-file`).addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (file) $(`ver-${v}`).value = await file.text();
    });
  }
  $("compare-use-doc").addEventListener("click", () => { $("ver-a").value = $("doc").value; });
  $("compare-run").addEventListener("click", () => {
    const ta = $("ver-a").value, tb = $("ver-b").value;
    const out = $("compare-out");
    out.replaceChildren();
    if (!ta.trim() || !tb.trim()) { $("compare-status").textContent = "Add text for both versions first."; return; }
    const A = Engine.analyse(ta, rules), B = Engine.analyse(tb, rules);
    const c = Engine.compareVersions(A, B);
    $("compare-status").textContent = `${c.appeared.length} appear, ${c.disappeared.length} disappear, ${c.persisted.length} persist.`;
    const item = (f, res, tag) => el("li", { "data-cat": f.category },
      el("span", { class: "sw", "aria-hidden": "true" }),
      el("strong", {}, `${catLabel(f.category)}: "${f.matchedTerm}"`), ` ${tag} passage ${f.passageIndex}`,
      f.source === "reviewer" ? el("span", { class: "badge" }, "Reviewer-added") : null,
      el("blockquote", {}, res.passages[f.passageIndex - 1].text));
    const group = (cls, title, note, items) => el("div", { class: `cmp-group ${cls}` },
      el("h3", {}, `${title} (${items.length})`), el("p", { class: "hint" }, note),
      items.length ? el("ul", {}, ...items) : el("p", {}, "(none)"));
    out.append(
      group("appeared", "Appear in B", "Rules that fire in the revised text with no similar passage in A.", c.appeared.map((x) => item(x.b, B, "in B,"))),
      group("disappeared", "Disappear from A", "Rules that fired in A with no similar passage in B. Check whether the concern was addressed or only reworded.", c.disappeared.map((x) => item(x.a, A, "in A,"))),
      group("persisted", "Persist", "Same rule, similar passage in both versions.", c.persisted.map((x) => {
        const li = item(x.b, B, `in B (A passage ${x.a.passageIndex}, ${Math.round(x.similarity * 100)}% shared words),`);
        return li;
      })));
  });

  restore();
})();
