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
    const wrap = el("div", { class: "flag", "data-decision": review.decision });
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
        ` matched "${f.matchedTerm}"`),
      el("code", {}, f.rule),
      fs,
      el("label", { for: noteId }, "Review note"),
      note
    );
    return wrap;
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
      const group = el("details", { class: "group", open: "" },
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
    result = pages ? Engine.analysePages(pages) : Engine.analyse(text);
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
        passage: result.passages[f.passageIndex - 1].text,
        decision: reviews[f.id]?.decision || "not reviewed",
        note: reviews[f.id]?.note || ""
      })),
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
      lines.push(`### Passage ${f.passageIndex}${f.page ? `, page ${f.page}` : ""}: ${f.category} ("${f.matchedTerm}")`, "",
        `- Rule: \`${f.rule}\``, `- Decision: ${f.decision}`, `- Note: ${f.note || "(none)"}`, "",
        ...f.passage.split("\n").map((l) => `> ${l}`), "");
    }
    lines.push("## Not found in this text", "");
    if (!log.notFoundInThisText.length) lines.push("(none)");
    for (const a of log.notFoundInThisText) lines.push(`- ${a.label}. ${a.question} Rule: \`${a.rule}\``);
    return lines.join("\n") + "\n";
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
  $("export-md").addEventListener("click", () => result && download(`review-log-${stamp()}.md`, "text/markdown", toMarkdown(buildLog())));
  restore();
})();
