// Public Decision Risk Lens: page logic. All processing stays in the browser.
(function () {
  const { TAXONOMY } = window.RiskLensTaxonomy;
  const Engine = window.RiskLensEngine;
  const I18N = window.RiskLensI18n;
  const t = I18N.t;
  const L = (c) => I18N.cat(c);
  const $ = (id) => document.getElementById(id);
  const DECISIONS = ["accept", "reject", "contextualise"];
  const decisionText = (d) => (d && DECISIONS.includes(d) ? t(d).toLowerCase() : t("notReviewed"));

  let result = null;
  let reviews = {}; // flag id -> { decision, note }
  let sourceName = null; // null means pasted text, shown in the current language
  let pages = null; // [{ page, text }] when the document came from a PDF
  let sampleId = null; // "fictional", "sv" or "eu" when a built-in sample is loaded
  const STORE_KEY = "risk-lens-review-v1";
  const RULES_KEY = "risk-lens-rules-v1";
  let rules = loadRules(); // reviewer-defined rules: [{ term, category, question }]

  function loadRules() {
    try { return Engine.normaliseRules(JSON.parse(localStorage.getItem(RULES_KEY) || "[]")); } catch (e) { return []; }
  }
  function saveRules() {
    try { localStorage.setItem(RULES_KEY, JSON.stringify(rules)); } catch (e) { /* storage may be unavailable */ }
  }
  const catLabel = (id) => L(TAXONOMY.find((c) => c.id === id)).label || id;
  const srcName = () => sourceName || t("pastedText");

  // Source record for a built-in sample. Real samples carry their full
  // citation; the fictional one says plainly that it is fictional.
  function sampleMeta() {
    if (sampleId === "fictional") return { kind: "fictional", title: window.RiskLensSample.title, note: t("srcFictional") };
    const s = sampleId && window.RiskLensRealSamples && window.RiskLensRealSamples[sampleId];
    if (!s) return null;
    return { kind: "real", title: s.title, issuer: s.issuer, date: s.date, docNumber: s.docNumber, url: s.url, retrieved: s.retrieved, licence: s.licence, note: t("srcVerbatim") };
  }
  const META_FIELDS = [["title", "srcTitle"], ["issuer", "srcIssuer"], ["date", "srcDate"], ["docNumber", "srcNumber"], ["url", "srcUrl"], ["retrieved", "srcRetrieved"], ["licence", "srcLicence"]];
  function metaList(m) {
    const dl = el("dl", { class: "meta-list" });
    for (const [k, label] of META_FIELDS) {
      if (!m[k]) continue;
      dl.append(el("dt", {}, t(label)), el("dd", {}, k === "url" ? el("a", { href: m[k], rel: "noopener" }, m[k]) : m[k]));
    }
    return dl;
  }
  function renderSourceMeta() {
    const box = $("source-meta");
    const m = sampleMeta();
    box.hidden = !m;
    box.replaceChildren();
    if (!m) return;
    box.append(el("h3", {}, t("srcMetaH")), metaList(m), el("p", { class: "hint" }, m.note));
  }

  // Saves the document, reviewer and decisions in this browser only (localStorage).
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        text: $("doc").value, pages, sourceName, sampleId, reviewer: $("reviewer").value, reviews
      }));
    } catch (e) { /* storage may be unavailable, e.g. private mode */ }
  }

  function restore() {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch (e) { saved = null; }
    if (!saved || !saved.text) return;
    $("doc").value = saved.text;
    sourceName = saved.sourceName && saved.sourceName !== "pasted text" ? saved.sourceName : null;
    pages = Array.isArray(saved.pages) ? saved.pages : null;
    sampleId = ["fictional", "sv", "eu"].includes(saved.sampleId) ? saved.sampleId : null;
    renderSourceMeta();
    $("reviewer").value = saved.reviewer || "";
    analyse(saved.reviews || {});
  }

  function clearReview() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    result = null;
    reviews = {};
    sourceName = null;
    pages = null;
    sampleId = null;
    renderSourceMeta();
    $("doc").value = "";
    $("reviewer").value = "";
    $("file").value = "";
    $("workspace").hidden = true;
    renderProgress();
    $("riskmap-section").hidden = true;
    $("clear").hidden = true;
    $("status").textContent = t("cleared");
  }

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
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
    for (const cat of TAXONOMY.map(L)) {
      const hits = new Set(result.flags.filter((f) => f.category === cat.id).map((f) => f.passageIndex));
      const count = result.flags.filter((f) => f.category === cat.id).length;
      legend.append(el("li", { class: "rm-key", "data-cat": cat.id, "data-count": String(count) },
        el("span", { class: "sw", "aria-hidden": "true" }), cat.label, " ", el("b", {}, String(count))));
      const row = el("div", { class: "rm-row", "data-cat": cat.id, role: "group", "aria-label": t("flagsAria", { cat: cat.label, n: count }) });
      row.append(el("span", { class: "rm-label" }, cat.label));
      const cells = el("div", { class: "rm-cells" });
      for (const p of result.passages) {
        if (hits.has(p.index)) {
          cells.append(el("button", {
            type: "button", class: "rm-cell on", title: `${cat.label}: ${passageLabel(p.index)}`,
            "aria-label": t("cellIn", { cat: cat.label, where: passageLabel(p.index) }), onclick: () => goToPassage(p.index)
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
    if (lastPage) grid.append(el("div", { class: "rm-row" }, el("span", { class: "rm-label" }, t("page")), pageTicks));
    box.append(legend, grid);
  }

  function renderAbsences() {
    const box = $("absences");
    box.replaceChildren();
    if (!result.absences.length) return;
    box.append(el("h3", {}, t("notFoundH")));
    box.append(el("p", { class: "hint" }, t("notFoundHint")));
    for (const a of result.absences.map(I18N.check)) {
      box.append(el("div", { class: "absence" }, el("strong", {}, a.label), a.question, el("br"), el("code", {}, a.rule)));
    }
  }

  function renderFlag(f) {
    const review = reviews[f.id] || (reviews[f.id] = { decision: "", note: "" });
    const wrap = el("div", { class: "flag", id: `flag-${f.id}`, tabindex: "-1", "data-flag": f.id, "data-decision": review.decision, "data-source": f.source || "taxonomy" });
    const name = `d-${f.id}`;
    const fs = el("fieldset", {}, el("legend", {}, t("decisionLegend")));
    for (const value of DECISIONS) {
      const label = t(value);
      const input = el("input", { type: "radio", name, value });
      if (review.decision === value) input.checked = true;
      input.addEventListener("change", () => {
        review.decision = value;
        wrap.dataset.decision = value;
        updateStatus();
        renderProgress();
        save();
      });
      fs.append(el("label", {}, input, label));
    }
    const noteId = `n-${f.id}`;
    const note = el("textarea", { id: noteId, rows: "2" });
    note.value = review.note;
    note.addEventListener("input", () => { review.note = note.value; save(); });
    wrap.append(...[
      el("div", { class: "meta" },
        el("button", { type: "button", class: "linkbtn", onclick: () => goToPassage(f.passageIndex) }, passageLabel(f.passageIndex)),
        t("matched", { term: f.matchedTerm }),
        f.source === "reviewer" ? el("span", { class: "badge" }, t("reviewerAdded")) : null),
      el("code", {}, f.rule),
      f.question ? el("p", { class: "rq" }, t("yourQuestion"), el("em", {}, f.question)) : null,
      renderWhy(f),
      fs,
      el("label", { for: noteId }, t("reviewNote")),
      note
    ].filter((c) => c != null));
    return wrap;
  }

  // "Why this flag?": the exact rule, the matched span in context, the
  // category description and question, and the related absence checks.
  function renderWhy(f) {
    const x = Engine.explainFlag(f, result);
    const d = el("details", { class: "why" }, el("summary", {}, t("why")));
    const dl = el("dl", {},
      el("dt", {}, t("rule")), el("dd", {}, el("code", {}, x.rule),
        x.source === "reviewer" ? t("ruleReviewer") : t("ruleTaxonomy")),
      el("dt", {}, t("pattern")), el("dd", {}, t("patternText", { p: x.pattern, n: x.matchCount, s: x.matchCount === 1 ? "" : (I18N.lang === "sv" ? "er" : "s") })),
      el("dt", {}, t("inContext")), el("dd", { class: "ctx" }, x.context.before, el("mark", {}, x.context.match), x.context.after),
      el("dt", {}, L(x.category).label || t("category")), el("dd", {}, L(x.category).description, " ", el("em", {}, L(x.category).question)));
    if (x.reviewerQuestion) dl.append(el("dt", {}, t("reviewerQuestion")), el("dd", {}, x.reviewerQuestion));
    dl.append(el("dt", {}, t("relatedChecks")), el("dd", {}, x.relatedAbsenceChecks.length
      ? el("ul", {}, ...x.relatedAbsenceChecks.map((c) => el("li", {}, el("strong", {}, I18N.check(c).label),
        t("checkLine", { status: c.status === "not found in this text" ? t("statusMissing") : t("statusPresent"), patterns: c.patterns.map((p) => `"${p}"`).join(", ") }))))
      : t("noneForCat")));
    d.append(dl, el("p", { class: "hint" }, t("whyHint")));
    return d;
  }

  function pageOf(index) {
    return result.passages[index - 1]?.page || null;
  }

  function passageLabel(index) {
    const page = pageOf(index);
    return page ? t("passagePage", { i: index, p: page }) : t("passage", { i: index });
  }

  function renderFlags() {
    const box = $("flag-groups");
    box.replaceChildren();
    if (!result.flags.length) {
      box.append(el("p", {}, t("noFlags")));
      return;
    }
    for (const cat of TAXONOMY.map(L)) {
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
    $("status").textContent = t("status", { p: result.passages.length, f: result.flags.length, a: result.absences.length, d: done });
  }

  function analyse(savedReviews) {
    const text = $("doc").value;
    if (!text.trim()) {
      $("status").textContent = t("pasteFirst");
      return;
    }
    result = pages ? Engine.analysePages(pages, rules) : Engine.analyse(text, rules);
    reviews = savedReviews && typeof savedReviews === "object" && !(savedReviews instanceof Event) ? savedReviews : {};
    renderPassages();
    renderRiskMap();
    renderAbsences();
    renderFlags();
    renderProgress();
    $("workspace").hidden = false;
    $("riskmap-section").hidden = false;
    $("clear").hidden = false;
    updateStatus();
    save();
  }

  function buildLog() {
    const category = Object.fromEntries(TAXONOMY.map((c) => [c.id, L(c).label]));
    return {
      tool: t("toolName"),
      language: I18N.lang,
      notice: t("notice"),
      exportedAt: new Date().toISOString(),
      source: srcName(),
      sourceDetails: sampleMeta() || undefined,
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
      notFoundInThisText: result.absences.map(I18N.check).map((a) => ({ label: a.label, question: a.question, rule: a.rule }))
    };
  }

  function toMarkdown(log) {
    const lines = [
      t("mdTitle"), "",
      `> ${log.notice}`, "",
      `- ${t("exported")}: ${log.exportedAt}`, `- ${t("source")}: ${log.source}`, `- ${t("reviewer")}: ${log.reviewer || t("notGiven")}`, "",
      ...(log.sourceDetails ? [`## ${t("srcMetaH")}`, "", ...META_FIELDS.filter(([k]) => log.sourceDetails[k]).map(([k, label]) => `- ${t(label)}: ${log.sourceDetails[k]}`), "", log.sourceDetails.note, ""] : []),
      `## ${t("flagsH")}`, ""
    ];
    for (const f of log.flags) {
      lines.push(`### ${f.page ? t("passagePage", { i: f.passageIndex, p: f.page }) : t("passage", { i: f.passageIndex })}: ${f.category} ("${f.matchedTerm}")${f.ruleSource === "reviewer-added" ? ` [${t("reviewerRule")}]` : ""}`, "",
        `- ${t("rule")}: \`${f.rule}\``, ...(f.reviewerQuestion ? [`- ${t("reviewerQuestion")}: ${f.reviewerQuestion}`] : []), `- ${t("decision")}: ${decisionText(f.decision)}`, `- ${t("note")}: ${f.note || t("noneP")}`, "",
        ...f.passage.split("\n").map((l) => `> ${l}`), "");
    }
    lines.push(`## ${t("rulesAddedH")}`, "");
    if (!log.reviewerRules.length) lines.push(t("noneP"));
    for (const r of log.reviewerRules) lines.push(`- "${r.term}" (${r.category})${r.question ? `: ${r.question}` : ""}`);
    lines.push("", `## ${t("notFoundH")}`, "");
    if (!log.notFoundInThisText.length) lines.push(t("noneP"));
    for (const a of log.notFoundInThisText) lines.push(`- ${a.label}. ${a.question} ${t("rule")}: \`${a.rule}\``);
    return lines.join("\n") + "\n";
  }

  // Printable report (A4). Built from the same log as the exports, so the
  // printed document never says more than the review log does.
  function buildReport() {
    const log = buildLog();
    const box = $("report");
    box.replaceChildren();
    const counts = TAXONOMY.map(L).map((c) => [c, log.flags.filter((f) => f.category === c.label).length]).filter(([, n]) => n);
    const decided = log.flags.filter((f) => f.decision !== "not reviewed").length;
    box.append(
      el("header", { class: "r-head" },
        el("p", { class: "r-kicker" }, t("toolName")),
        el("h1", {}, t("reportH")),
        el("p", { class: "r-notice" }, el("strong", {}, log.notice.split(". ")[0] + ". "), log.notice.split(". ").slice(1).join(". "), t("reportNoticeTail")),
        el("dl", { class: "r-meta" },
          el("dt", {}, t("source")), el("dd", {}, log.source),
          el("dt", {}, t("reviewer")), el("dd", {}, log.reviewer || t("notGiven")),
          el("dt", {}, t("generated")), el("dd", {}, new Date(log.exportedAt).toLocaleString(I18N.lang === "sv" ? "sv-SE" : undefined)),
          el("dt", {}, t("reviewed")), el("dd", {}, t("reviewedOf", { d: decided, n: log.flags.length })))),
      ...(log.sourceDetails ? [el("h2", {}, t("srcMetaH")), metaList(log.sourceDetails), el("p", { class: "r-rule" }, log.sourceDetails.note)] : []),
      el("h2", {}, t("byCatH")),
      el("ul", { class: "r-counts" }, ...counts.map(([c, n]) => el("li", { "data-cat": c.id }, el("span", { class: "sw" }), `${c.label}: ${n}`))));
    if (!counts.length) box.append(el("p", {}, t("noFlags")));
    box.append(el("h2", {}, t("flagsDecisionsH")));
    for (const f of log.flags) {
      const cat = TAXONOMY.map(L).find((c) => c.label === f.category);
      box.append(el("article", { class: "r-flag", "data-cat": cat ? cat.id : "" },
        el("h3", {}, `${f.page ? t("passagePage", { i: f.passageIndex, p: f.page }) : t("passage", { i: f.passageIndex })}: ${f.category}`, f.ruleSource === "reviewer-added" ? el("span", { class: "badge" }, t("reviewerAdded")) : null),
        el("p", { class: "r-line" }, t("matchedDecision", { term: f.matchedTerm }), el("strong", {}, decisionText(f.decision)), f.note ? `. ${t("note")}: ${f.note}` : ""),
        el("blockquote", {}, f.passage),
        el("p", { class: "r-rule" }, f.rule)));
    }
    if (log.reviewerRules.length) {
      box.append(el("h2", {}, t("rulesAddedH")),
        el("ul", {}, ...log.reviewerRules.map((r) => el("li", {}, `"${r.term}" (${r.category})`, r.question ? `: ${r.question}` : ""))));
    }
    box.append(el("h2", {}, t("notFoundH")));
    if (!log.notFoundInThisText.length) box.append(el("p", {}, t("noneP")));
    else box.append(el("ul", {}, ...log.notFoundInThisText.map((x) => el("li", {}, el("strong", {}, x.label), ". ", x.question))));
    box.append(el("p", { class: "r-foot" }, t("reportFoot")));
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
    const id = $("sample-pick").value;
    const real = window.RiskLensRealSamples && window.RiskLensRealSamples[id];
    const s = real || window.RiskLensSample;
    sampleId = real ? id : "fictional";
    pages = null;
    $("doc").value = s.text;
    sourceName = s.title;
    renderSourceMeta();
    analyse();
  });
  $("doc").addEventListener("input", () => { sourceName = null; pages = null; if (sampleId) { sampleId = null; renderSourceMeta(); } });
  $("file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    try {
      if (isPdf) {
        $("status").textContent = t("readingPdf", { name: file.name });
        pages = await readPdf(file);
        $("doc").value = pages.map((p) => p.text).join("\n\n");
        if (!$("doc").value.trim()) {
          pages = null;
          $("status").textContent = t("noTextLayer");
          return;
        }
      } else {
        pages = null;
        $("doc").value = await file.text();
      }
      sourceName = file.name;
      sampleId = null;
      renderSourceMeta();
      analyse();
    } catch (err) {
      pages = null;
      $("status").textContent = t("couldNotRead", { name: file.name, err: err.message || err });
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
  function renderRuleCats() {
    const sel = $("rule-cat");
    const keep = sel.value;
    sel.replaceChildren(...TAXONOMY.map(L).map((c) => el("option", { value: c.id }, c.label)));
    if (keep) sel.value = keep;
  }
  renderRuleCats();
  function renderRules() {
    const list = $("rule-list");
    list.replaceChildren();
    if (!rules.length) { list.append(el("li", { class: "empty" }, t("noRules"))); return; }
    rules.forEach((r, i) => list.append(el("li", { "data-cat": r.category },
      el("span", { class: "sw", "aria-hidden": "true" }), el("strong", {}, `"${r.term}"`), ` ${catLabel(r.category)}`,
      r.question ? el("span", { class: "rq" }, ` ${r.question}`) : null,
      el("button", { type: "button", class: "linkbtn", "aria-label": t("removeRule", { term: r.term }), onclick: () => { rules.splice(i, 1); rulesChanged(t("removed", { term: r.term })); } }, t("remove")))));
  }
  function rulesChanged(msg) {
    saveRules();
    renderRules();
    $("rules-status").textContent = `${msg} ${t("ruleCount", { n: rules.length, s: rules.length === 1 ? "" : "s" })}`;
    if (result) analyse(reviews);
  }
  $("rule-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const added = Engine.normaliseRules([...rules, { term: $("rule-term").value, category: $("rule-cat").value, question: $("rule-q").value }]);
    if (added.length === rules.length) { $("rules-status").textContent = t("ruleDup"); return; }
    rules = added;
    $("rule-term").value = ""; $("rule-q").value = "";
    rulesChanged(t("added", { term: rules[rules.length - 1].term }));
  });
  $("rules-export").addEventListener("click", () => download(`risk-lens-rules-${stamp()}.json`, "application/json", JSON.stringify(Engine.rulePack(rules), null, 2)));
  $("rules-import").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const incoming = Engine.parseRulePack(JSON.parse(await file.text()));
      const before = rules.length;
      rules = Engine.normaliseRules([...rules, ...incoming]);
      rulesChanged(t("imported", { n: rules.length - before, s: rules.length - before === 1 ? "" : "s", name: file.name }));
    } catch (err) {
      $("rules-status").textContent = t("couldNotImport", { name: file.name, err: err.message || err });
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
    if (!ta.trim() || !tb.trim()) { $("compare-status").textContent = t("bothVersions"); return; }
    const A = Engine.analyse(ta, rules), B = Engine.analyse(tb, rules);
    const c = Engine.compareVersions(A, B);
    $("compare-status").textContent = t("cmpStatus", { a: c.appeared.length, d: c.disappeared.length, p: c.persisted.length });
    const item = (f, res, tag) => el("li", { "data-cat": f.category },
      el("span", { class: "sw", "aria-hidden": "true" }),
      el("strong", {}, `${catLabel(f.category)}: "${f.matchedTerm}"`), ` ${tag}${t("passageWord", { i: f.passageIndex })}`,
      f.source === "reviewer" ? el("span", { class: "badge" }, t("reviewerAdded")) : null,
      el("blockquote", {}, res.passages[f.passageIndex - 1].text));
    const group = (cls, title, note, items) => el("div", { class: `cmp-group ${cls}` },
      el("h3", {}, `${title} (${items.length})`), el("p", { class: "hint" }, note),
      items.length ? el("ul", {}, ...items) : el("p", {}, t("noneP")));
    out.append(
      group("appeared", t("appearH"), t("appearHint"), c.appeared.map((x) => item(x.b, B, t("inB")))),
      group("disappeared", t("disappearH"), t("disappearHint"), c.disappeared.map((x) => item(x.a, A, t("inA")))),
      group("persisted", t("persistH"), t("persistHint"), c.persisted.map((x) => {
        const li = item(x.b, B, t("inBShared", { i: x.a.passageIndex, pct: Math.round(x.similarity * 100) }));
        return li;
      })));
  });

  // Keyboard-first review: j/k move between flags, a/r/c decide, n opens the
  // note, ? shows the shortcuts sheet. Ignored while typing in a text field.
  const flagNodes = () => Array.from(document.querySelectorAll("#flag-groups .flag"));
  function currentFlag() {
    const a = document.activeElement;
    return (a && a.closest && a.closest("#flag-groups .flag")) || document.querySelector("#flag-groups .flag.current");
  }
  function focusFlag(node) {
    if (!node) return;
    document.querySelectorAll("#flag-groups .flag.current").forEach((n) => n.classList.remove("current"));
    node.classList.add("current");
    const group = node.closest("details");
    if (group && !group.open) group.open = true;
    node.focus({ preventScroll: true });
    node.scrollIntoView({ block: "nearest" });
  }
  function moveFlag(step) {
    const list = flagNodes();
    if (!list.length) return;
    const i = list.indexOf(currentFlag());
    focusFlag(list[i < 0 ? (step > 0 ? 0 : list.length - 1) : Math.min(list.length - 1, Math.max(0, i + step))]);
  }
  function decide(value) {
    const node = currentFlag();
    if (!node) return;
    const input = node.querySelector(`input[type="radio"][value="${value}"]`);
    if (!input) return;
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    node.classList.add("current");
  }
  const isTyping = (n) => n && (n.isContentEditable || n.tagName === "TEXTAREA" || n.tagName === "SELECT" ||
    (n.tagName === "INPUT" && !["radio", "checkbox", "button", "submit", "reset", "file"].includes(n.type)));
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Escape" && e.target.tagName === "TEXTAREA" && e.target.closest(".flag")) { e.target.closest(".flag").focus(); return; }
    if (isTyping(e.target) || $("shortcuts").open) return;
    if (e.key === "?") { e.preventDefault(); $("shortcuts").showModal(); return; }
    if (!result || $("workspace").hidden) return;
    const actions = { j: () => moveFlag(1), k: () => moveFlag(-1), a: () => decide("accept"), r: () => decide("reject"), c: () => decide("contextualise"),
      n: () => { const node = currentFlag(); const note = node && node.querySelector("textarea"); if (note) note.focus(); } };
    const fn = actions[e.key];
    if (fn) { e.preventDefault(); fn(); }
  });
  document.addEventListener("focusin", (e) => {
    const node = e.target.closest && e.target.closest("#flag-groups .flag");
    if (!node) return;
    document.querySelectorAll("#flag-groups .flag.current").forEach((n) => n !== node && n.classList.remove("current"));
    node.classList.add("current");
  });

  // Reviewer progress meter: sticky at the top of the review column. Counts
  // decisions, not risk; it says nothing about the document itself.
  function renderProgress() {
    const box = $("progress");
    if (!result) { box.replaceChildren(); return; }
    const total = result.flags.length;
    const isDone = (f) => !!(reviews[f.id] && reviews[f.id].decision);
    const done = result.flags.filter(isDone).length;
    const pct = total ? Math.round((done / total) * 100) : 100;
    const cats = TAXONOMY.map(L).map((c) => {
      const fs = result.flags.filter((f) => f.category === c.id);
      return { c, n: fs.length, d: fs.filter(isDone).length };
    }).filter((x) => x.n);
    box.replaceChildren(
      el("div", { class: "p-top" },
        el("p", { class: "p-count", id: "progress-count" }, t("progress", { d: done, n: total })),
        el("button", { type: "button", id: "next-unreviewed", class: "primary", onclick: nextUnreviewed, disabled: done === total ? "" : null }, t("nextUnreviewed")),
        el("button", { type: "button", class: "linkbtn keys-btn", onclick: () => $("shortcuts").showModal(), "aria-keyshortcuts": "?" }, el("kbd", { "aria-hidden": "true" }, "?"), " ", t("shortcutsBtn"))),
      el("div", { class: "p-bar", role: "progressbar", "aria-labelledby": "progress-count", "aria-valuemin": "0", "aria-valuemax": String(total), "aria-valuenow": String(done) },
        el("span", { style: `--p:${pct}%` })),
      el("ul", { class: "p-cats" }, ...cats.map(({ c, n, d }) => el("li", { "data-cat": c.id, class: d === n ? "done" : "", title: t("catProgress", { cat: c.label, d, n }) },
        el("span", { class: "sw", "aria-hidden": "true" }), el("span", { class: "visually-hidden" }, t("catProgress", { cat: c.label, d, n })),
        el("span", { "aria-hidden": "true" }, `${c.label} ${d}/${n}`)))),
      ...(done === total && total ? [el("p", { class: "p-all" }, t("allReviewed"))] : []));
  }
  function nextUnreviewed() {
    const list = flagNodes();
    const start = list.indexOf(currentFlag());
    const order = list.slice(start + 1).concat(list.slice(0, start + 1));
    const next = order.find((n) => !n.dataset.decision);
    if (next) focusFlag(next);
  }

  // Language switch: Swedish when the browser asks for Swedish, English
  // otherwise; an explicit choice is remembered in this browser.
  function applyLanguage() {
    I18N.applyStatic(document);
    document.querySelectorAll(".lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === I18N.lang)));
    renderRuleCats();
    renderRules();
    renderSourceMeta();
    if (result) {
      const focusedFlag = document.activeElement && document.activeElement.closest && document.activeElement.closest(".flag");
      renderPassages(); renderRiskMap(); renderAbsences(); renderFlags(); renderProgress(); updateStatus();
      if (focusedFlag) { const again = $(focusedFlag.id); if (again) again.focus(); }
    }
    if ($("compare-out").childElementCount) $("compare-run").click();
  }
  // Keep the sticky progress meter just under the sticky banner.
  function syncBannerHeight() {
    const b = document.querySelector(".banner");
    const h = getComputedStyle(b).position === "sticky" ? b.offsetHeight : 0;
    document.documentElement.style.setProperty("--banner-h", `${h + 8}px`);
  }
  window.addEventListener("resize", syncBannerHeight);
  I18N.onChange(syncBannerHeight);
  syncBannerHeight();
  document.querySelectorAll(".lang button").forEach((b) => b.addEventListener("click", () => I18N.setLang(b.dataset.lang)));
  I18N.onChange(applyLanguage);
  applyLanguage();

  restore();
})();
