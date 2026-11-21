// Public Decision Risk Lens: interface strings in English and Swedish.
// Pattern lists stay in taxonomy.js; they already cover both languages.
// Only the visible wording is translated here.
(function (root) {
  const LANG_KEY = "risk-lens-lang-v1";

  const STR = {
    en: {
      pageTitle: "Public Decision Risk Lens: prototype",
      metaDesc: "Paste a public decision document or open a .txt, .md, .html, .docx or PDF file. Passages that contain trigger terms are highlighted and listed by category for human review.",
      skip: "Skip to flags",
      evalLink: "How well does it work? Measured precision and recall",
      langLabel: "Language",
      bannerLabel: "Advisory notice",
      banner: "<strong>Advisory discussion aid.</strong> This early prototype matches visible words and phrases. It can miss risks and it will produce false positives. It does not decide anything and does not assess people. Every flag needs a human reviewer.",
      tag: "prototype",
      lede: "Paste a public decision document or open a .txt, .md, .html, .docx or PDF file. Files are read in this browser, and PDF passages keep their page number. Passages that contain trigger terms are highlighted and listed by category for human review.",
      inputH: "1. Document", docLabel: "Document text", docPlaceholder: "Paste text here",
      analyse: "Analyse text", loadSample: "Load sample", samplePick: "Sample", sampleFictional: "Fictional example", sampleSv: "Swedish real: Förvaltningslag 28-33 §§", sampleEu: "EU real: AI Act Articles 14 and 86",
      srcMetaH: "Source of this sample", srcTitle: "Title", srcIssuer: "Issued by", srcDate: "Date", srcNumber: "Document number", srcUrl: "Source URL", srcRetrieved: "Retrieved", srcLicence: "Reuse", srcVerbatim: "Verbatim excerpt. Line breaks were reflowed; the words were not changed. Read the full text at the source.", srcFictional: "Fictional text written for this prototype. It does not describe a real authority or decision.", loadFile: "Load .txt or .pdf", clear: "Clear review",
      storageHint: "Your text, decisions and notes are saved in this browser only (local storage) so they survive a reload. Use Clear review to remove them.",
      rulesH: "Your own rules",
      rulesHint: "Add a word or phrase you want to watch for. Your rules run next to the built-in taxonomy, are marked <span class=\"badge\">Reviewer-added</span> in flags, exports and the printed report, and are saved in this browser. Share them as a JSON rule pack.",
      ruleTerm: "Term or phrase", ruleCat: "Category", ruleQ: "Review question (optional)", addRule: "Add rule",
      rulesExport: "Export rule pack", rulesImport: "Import rule pack",
      rmH: "Risk map",
      rmHint: "Where trigger terms appear across the document, by category. Each lit cell is a passage; select it to jump there. Counts are matches, not severity.",
      passagesH: "2. Passages", reviewH: "3. Review", reviewerLabel: "Reviewer (role or initials, optional)",
      exportH: "Export review log",
      exportHint: "The log records each rule that fired, the passage text and your decision. Nothing leaves this browser unless you save the file.",
      exportJson: "Export JSON", exportMd: "Export Markdown", printReport: "Print review report",
      cmpH: "Compare two versions",
      cmpHint: "Paste or load an earlier version A and a revised version B. Flags are paired by rule and by how similar the passage wording is (shared words, at least half). The result shows which flags appear, disappear or persist. A flag that disappears may mean the wording changed, not that a concern was addressed: read both passages.",
      verA: "Version A (earlier)", verB: "Version B (revised)", verAFile: "Load .txt for A", verBFile: "Load .txt for B",
      compareRun: "Compare versions", compareUseDoc: "Use current document as A",
      reportLabel: "Printable review report",
      accept: "Accept", reject: "Reject", contextualise: "Contextualise", notReviewed: "not reviewed",
      pastedText: "pasted text",
      cleared: "Review cleared. Nothing is stored in this browser.",
      page: "Page",
      flagsAria: "{cat}: {n} flags", cellIn: "{cat} in {where}",
      notFoundH: "Not found in this text",
      notFoundHint: "These topics are not mentioned in the text you analysed. They may be covered in other documents. This is a prompt to check, not a finding.",
      decisionLegend: "Reviewer decision", matched: " matched \"{term}\"", reviewerAdded: "Reviewer-added",
      yourQuestion: "Your question: ", reviewNote: "Review note",
      why: "Why this flag?", rule: "Rule",
      ctx_mentions_automation: "Mentions automation", ctxHint: "Context, not a risk flag: the passage mentions automated decision-making or AI. Not counted in progress or summary.",
      ruleReviewer: " Added by a reviewer in this browser, not part of the built-in taxonomy.",
      ruleTaxonomy: " From the built-in draft taxonomy.",
      pattern: "Pattern",
      patternText: "\"{p}\" matched at the start of a word, any case, {n} time{s} in this passage.",
      inContext: "In context", category: "Category", reviewerQuestion: "Reviewer question",
      relatedChecks: "Related absence checks", noneForCat: "None for this category.",
      checkLine: ": {status}. Looks for {patterns}.",
      statusMissing: "not found in this text", statusPresent: "a related term appears in this text",
      whyHint: "A match means the passage may deserve a closer look. It is not a finding.",
      passage: "Passage {i}", passagePage: "Passage {i}, page {p}",
      noFlags: "No trigger terms were found. That does not mean the document is free of risk.",
      status: "{p} passages, {f} flags, {a} topics not found. Reviewed {d} of {f} flags.",
      pasteFirst: "Paste or load a document first.",
      toolName: "Public Decision Risk Lens prototype",
      notice: "Advisory discussion aid. Pattern matching can miss risks and produce false positives. Not a verdict.",
      mdTitle: "# Review log: Public Decision Risk Lens prototype",
      exported: "Exported", source: "Source", reviewer: "Reviewer", notGiven: "not given",
      flagsH: "Flags", reviewerRule: "reviewer-added rule", decision: "Decision", note: "Note", noneP: "(none)",
      rulesAddedH: "Reviewer-added rules",
      reportH: "Review report", reportNoticeTail: " It does not decide anything and does not assess people.",
      generated: "Generated", reviewed: "Reviewed", reviewedOf: "{d} of {n} flags",
      byCatH: "Flags by category", sumH: "Review summary", sumHint: "Counts of matches and your decisions so far. Counts are not severity.", sumDecH: "By decision", sumCatH: "By category and decision", sumCatLine: "{n} flag(s): {a} accepted, {r} rejected, {c} contextualised, {u} not reviewed", sumRulesH: "Reviewer-added rules used", sumNoRules: "No reviewer-added rule matched this text.", sumRuleLine: "\"{term}\" ({cat}): {n} match(es)", flagsDecisionsH: "Flags and decisions",
      matchedDecision: "Matched \"{term}\". Decision: ",
      reportFoot: "Pattern matching can miss risks and produce false positives. Every flag needs a human reviewer. Building AI course project.",
      readingPdf: "Reading {name} in this browser...",
      noTextLayer: "No text layer was found in this PDF. Scanned PDFs need OCR first; this tool does not do OCR.",
      couldNotRead: "Could not read {name}: {err}",
      openFile: "Open a file", fileTypes: ".txt, .md, .html, .docx or .pdf",
      fileHint: "Files are read in this browser. Nothing is uploaded. You can also drop a file on the text area.",
      dropHere: "Drop the file to read it in this browser",
      fileLoaded: "Read {name} in this browser.",
      errUnsupported: "{name} is not a supported file type. Use .txt, .md, .html, .docx or .pdf.",
      errBroken: "{name} could not be read. The file looks damaged or is not what its name says.",
      errEmpty: "{name} contains no readable text.",
      flagMapLabel: "Flag map",
      flagMark: "{cats}: {where}",
      noRules: "No rules of your own yet.", remove: "Remove", removeRule: "Remove rule \"{term}\"",
      removed: "Removed \"{term}\".", added: "Added \"{term}\".",
      ruleCount: "{n} rule{s} of your own.", ruleDup: "That rule is empty or already in the list.",
      imported: "Imported {n} new rule{s} from {name}.", couldNotImport: "Could not import {name}: {err}",
      bothVersions: "Add text for both versions first.",
      cmpStatus: "{a} appear, {d} disappear, {p} persist.",
      inB: "in B,", inA: "in A,", inBShared: "in B (A passage {i}, {pct}% shared words),", passageWord: " passage {i}",
      appearH: "Appear in B", appearHint: "Rules that fire in the revised text with no similar passage in A.",
      disappearH: "Disappear from A", disappearHint: "Rules that fired in A with no similar passage in B. Check whether the concern was addressed or only reworded.",
      persistH: "Persist", persistHint: "Same rule, similar passage in both versions.",
      progressLabel: "Review progress", progress: "Reviewed {d} of {n}", nextUnreviewed: "Next unreviewed",
      allReviewed: "Every flag has a decision.", catProgress: "{cat}: {d} of {n} reviewed",
      shortcutsBtn: "Keyboard shortcuts", shortcutsH: "Keyboard shortcuts",
      shortcutsHint: "Shortcuts work when the focus is not in a text field.",
      kNext: "Next flag", kPrev: "Previous flag", kAccept: "Accept the current flag", kReject: "Reject the current flag",
      kContext: "Contextualise the current flag", kNote: "Write a note on the current flag", kHelp: "Open this sheet",
      kEsc: "Close this sheet, or leave a note field", close: "Close"
    },
    sv: {
      pageTitle: "Public Decision Risk Lens: prototyp",
      metaDesc: "Klistra in ett offentligt beslutsunderlag eller öppna en fil (.txt, .md, .html, .docx eller PDF). Stycken med triggerord markeras och listas per kategori för mänsklig granskning.",
      skip: "Hoppa till flaggor",
      evalLink: "Hur bra fungerar det? Uppmätt precision och täckning",
      langLabel: "Språk",
      bannerLabel: "Rådgivande information",
      banner: "<strong>Rådgivande diskussionsstöd.</strong> Den här tidiga prototypen matchar synliga ord och fraser. Den kan missa risker och den kommer att ge falska träffar. Den beslutar ingenting och bedömer inte människor. Varje flagga behöver en mänsklig granskare.",
      tag: "prototyp",
      lede: "Klistra in ett offentligt beslutsunderlag eller öppna en fil (.txt, .md, .html, .docx eller PDF). Filer läses i den här webbläsaren, och stycken från PDF behåller sitt sidnummer. Stycken med triggerord markeras och listas per kategori för mänsklig granskning.",
      inputH: "1. Dokument", docLabel: "Dokumenttext", docPlaceholder: "Klistra in text här",
      analyse: "Analysera texten", loadSample: "Läs in exempel", samplePick: "Exempel", sampleFictional: "Fiktivt exempel", sampleSv: "Svensk verklig text: Förvaltningslag 28-33 §§", sampleEu: "EU, verklig text: AI-förordningen artikel 14 och 86",
      srcMetaH: "Källa för exemplet", srcTitle: "Titel", srcIssuer: "Utfärdad av", srcDate: "Datum", srcNumber: "Dokumentnummer", srcUrl: "Källans adress", srcRetrieved: "Hämtad", srcLicence: "Återanvändning", srcVerbatim: "Ordagrant utdrag. Radbrytningar har ändrats men inte orden. Läs hela texten hos källan.", srcFictional: "Fiktiv text skriven för prototypen. Den beskriver ingen verklig myndighet eller verkligt beslut.", loadFile: "Läs in .txt eller .pdf", clear: "Rensa granskningen",
      storageHint: "Din text, dina beslut och anteckningar sparas bara i den här webbläsaren (local storage) så att de finns kvar efter omladdning. Använd Rensa granskningen för att ta bort dem.",
      rulesH: "Egna regler",
      rulesHint: "Lägg till ett ord eller en fras du vill bevaka. Dina regler körs bredvid den inbyggda taxonomin, märks <span class=\"badge\">Granskartillagd</span> i flaggor, exporter och den utskrivna rapporten och sparas i den här webbläsaren. Dela dem som ett regelpaket i JSON.",
      ruleTerm: "Ord eller fras", ruleCat: "Kategori", ruleQ: "Granskningsfråga (valfri)", addRule: "Lägg till regel",
      rulesExport: "Exportera regelpaket", rulesImport: "Importera regelpaket",
      rmH: "Riskkarta",
      rmHint: "Var triggerorden förekommer i dokumentet, per kategori. Varje tänd ruta är ett stycke; välj den för att hoppa dit. Siffrorna räknar träffar, inte allvar.",
      passagesH: "2. Stycken", reviewH: "3. Granskning", reviewerLabel: "Granskare (roll eller initialer, valfritt)",
      exportH: "Exportera granskningslogg",
      exportHint: "Loggen visar varje regel som slog till, styckets text och ditt beslut. Inget lämnar webbläsaren om du inte sparar filen.",
      exportJson: "Exportera JSON", exportMd: "Exportera Markdown", printReport: "Skriv ut granskningsrapport",
      cmpH: "Jämför två versioner",
      cmpHint: "Klistra in eller läs in en tidigare version A och en reviderad version B. Flaggorna paras ihop efter regel och efter hur lika styckenas formuleringar är (gemensamma ord, minst hälften). Resultatet visar vilka flaggor som tillkommer, försvinner eller finns kvar. En flagga som försvinner kan betyda att formuleringen ändrats, inte att problemet åtgärdats: läs båda styckena.",
      verA: "Version A (tidigare)", verB: "Version B (reviderad)", verAFile: "Läs in .txt för A", verBFile: "Läs in .txt för B",
      compareRun: "Jämför versionerna", compareUseDoc: "Använd aktuellt dokument som A",
      reportLabel: "Utskrivbar granskningsrapport",
      accept: "Godta", reject: "Avvisa", contextualise: "Sätt i sammanhang", notReviewed: "inte granskad",
      pastedText: "inklistrad text",
      cleared: "Granskningen är rensad. Inget sparas i den här webbläsaren.",
      page: "Sida",
      flagsAria: "{cat}: {n} flaggor", cellIn: "{cat} i {where}",
      notFoundH: "Finns inte i den här texten",
      notFoundHint: "De här ämnena nämns inte i texten du analyserade. De kan tas upp i andra dokument. Det är en uppmaning att kontrollera, inte ett konstaterande.",
      decisionLegend: "Granskarens beslut", matched: " matchade \"{term}\"", reviewerAdded: "Granskartillagd",
      yourQuestion: "Din fråga: ", reviewNote: "Granskningsanteckning",
      why: "Varför den här flaggan?", rule: "Regel",
      ctx_mentions_automation: "Nämner automatisering", ctxHint: "Kontext, inte en riskflagga: stycket nämner automatiserat beslutsfattande eller AI. Räknas inte i förloppet eller sammanfattningen.",
      ruleReviewer: " Tillagd av en granskare i den här webbläsaren, inte del av den inbyggda taxonomin.",
      ruleTaxonomy: " Från den inbyggda utkasttaxonomin.",
      pattern: "Mönster",
      patternText: "\"{p}\" matchade i början av ett ord, oavsett skiftläge, {n} gång{s} i det här stycket.",
      inContext: "I sitt sammanhang", category: "Kategori", reviewerQuestion: "Granskarens fråga",
      relatedChecks: "Relaterade frånvarokontroller", noneForCat: "Inga för den här kategorin.",
      checkLine: ": {status}. Letar efter {patterns}.",
      statusMissing: "finns inte i den här texten", statusPresent: "ett relaterat ord förekommer i texten",
      whyHint: "En träff betyder att stycket kan förtjäna en närmare titt. Det är inget konstaterande.",
      passage: "Stycke {i}", passagePage: "Stycke {i}, sida {p}",
      noFlags: "Inga triggerord hittades. Det betyder inte att dokumentet är fritt från risker.",
      status: "{p} stycken, {f} flaggor, {a} ämnen saknas. {d} av {f} flaggor granskade.",
      pasteFirst: "Klistra in eller läs in ett dokument först.",
      toolName: "Public Decision Risk Lens, prototyp",
      notice: "Rådgivande diskussionsstöd. Mönstermatchning kan missa risker och ge falska träffar. Inget avgörande.",
      mdTitle: "# Granskningslogg: Public Decision Risk Lens, prototyp",
      exported: "Exporterad", source: "Källa", reviewer: "Granskare", notGiven: "inte angiven",
      flagsH: "Flaggor", reviewerRule: "granskartillagd regel", decision: "Beslut", note: "Anteckning", noneP: "(inga)",
      rulesAddedH: "Granskartillagda regler",
      reportH: "Granskningsrapport", reportNoticeTail: " Den beslutar ingenting och bedömer inte människor.",
      generated: "Skapad", reviewed: "Granskat", reviewedOf: "{d} av {n} flaggor",
      byCatH: "Flaggor per kategori", sumH: "Sammanfattning av granskningen", sumHint: "Antal träffar och dina beslut hittills. Antal säger inget om allvar.", sumDecH: "Per beslut", sumCatH: "Per kategori och beslut", sumCatLine: "{n} flagg(or): {a} godtagna, {r} avvisade, {c} satta i sammanhang, {u} inte granskade", sumRulesH: "Granskarens egna regler som användes", sumNoRules: "Ingen egen regel gav träff i den här texten.", sumRuleLine: "\"{term}\" ({cat}): {n} träff(ar)", flagsDecisionsH: "Flaggor och beslut",
      matchedDecision: "Matchade \"{term}\". Beslut: ",
      reportFoot: "Mönstermatchning kan missa risker och ge falska träffar. Varje flagga behöver en mänsklig granskare. Building AI course project.",
      readingPdf: "Läser {name} i den här webbläsaren...",
      noTextLayer: "PDF-filen saknar textlager. Skannade PDF-filer behöver OCR först; det här verktyget gör ingen OCR.",
      couldNotRead: "Kunde inte läsa {name}: {err}",
      openFile: "Öppna en fil", fileTypes: ".txt, .md, .html, .docx eller .pdf",
      fileHint: "Filer läses i den här webbläsaren. Inget laddas upp. Du kan också släppa en fil på textrutan.",
      dropHere: "Släpp filen för att läsa den i den här webbläsaren",
      fileLoaded: "Läste {name} i den här webbläsaren.",
      errUnsupported: "{name} är inte en filtyp som stöds. Använd .txt, .md, .html, .docx eller .pdf.",
      errBroken: "{name} kunde inte läsas. Filen verkar skadad eller är inte det som namnet anger.",
      errEmpty: "{name} innehåller ingen läsbar text.",
      flagMapLabel: "Flaggkarta",
      flagMark: "{cats}: {where}",
      noRules: "Inga egna regler än.", remove: "Ta bort", removeRule: "Ta bort regeln \"{term}\"",
      removed: "Tog bort \"{term}\".", added: "Lade till \"{term}\".",
      ruleCount: "{n} egna regler.", ruleDup: "Regeln är tom eller finns redan i listan.",
      imported: "Importerade {n} nya regler från {name}.", couldNotImport: "Kunde inte importera {name}: {err}",
      bothVersions: "Lägg till text för båda versionerna först.",
      cmpStatus: "{a} tillkommer, {d} försvinner, {p} finns kvar.",
      inB: "i B,", inA: "i A,", inBShared: "i B (A stycke {i}, {pct} % gemensamma ord),", passageWord: " stycke {i}",
      appearH: "Tillkommer i B", appearHint: "Regler som slår till i den reviderade texten utan något liknande stycke i A.",
      disappearH: "Försvinner från A", disappearHint: "Regler som slog till i A utan något liknande stycke i B. Kontrollera om problemet åtgärdats eller bara formulerats om.",
      persistH: "Finns kvar", persistHint: "Samma regel, liknande stycke i båda versionerna.",
      progressLabel: "Granskningsförlopp", progress: "{d} av {n} granskade", nextUnreviewed: "Nästa ogranskade",
      allReviewed: "Alla flaggor har ett beslut.", catProgress: "{cat}: {d} av {n} granskade",
      shortcutsBtn: "Kortkommandon", shortcutsH: "Kortkommandon",
      shortcutsHint: "Kortkommandona fungerar när fokus inte står i ett textfält.",
      kNext: "Nästa flagga", kPrev: "Föregående flagga", kAccept: "Godta aktuell flagga", kReject: "Avvisa aktuell flagga",
      kContext: "Sätt aktuell flagga i sammanhang", kNote: "Skriv en anteckning till aktuell flagga", kHelp: "Öppna den här listan",
      kEsc: "Stäng listan, eller lämna ett anteckningsfält", close: "Stäng"
    }
  };

  // Swedish wording for the taxonomy and absence checks, keyed by id.
  const CATS_SV = {
    transparency: { label: "Transparens", description: "Om människor kan se att ett verktyg används, vad det gör och på vilken grund.", question: "Skulle en berörd person kunna ta reda på att verktyget används och hur det påverkar beslutet?" },
    accountability: { label: "Ansvarsskyldighet", description: "Vem som ansvarar för verktyget, dess resultat och dess fel.", question: "Är det tydligt vilken namngiven roll eller instans som svarar för beslutet och för misstag?" },
    discrimination: { label: "Diskriminering", description: "Om vissa grupper kan behandlas sämre, direkt eller via ersättningsvariabler.", question: "Kan kriteriet eller datakällan slå olika för grupper som skyddas av diskrimineringslagen?" },
    privacy: { label: "Integritet", description: "Hur personuppgifter samlas in, samkörs, lagras och delas.", question: "Behövs personuppgifterna för det angivna ändamålet, och är användningen begränsad, laglig och tidsbunden?" },
    contestability: { label: "Möjlighet att ifrågasätta", description: "Om människor kan förstå, ifrågasätta och överklaga ett beslut.", question: "Kan en berörd person få motivering till beslutet och i praktiken överklaga det?" },
    "human-oversight": { label: "Mänsklig kontroll", description: "Om en person med verkligt mandat granskar verktygets resultat innan det påverkar någon.", question: "Granskar en person med kompetens och befogenhet resultatet, och kan hen gå emot det?" },
    security: { label: "Säkerhet", description: "Skydd av system och data mot obehörig åtkomst, förlust eller manipulation.", question: "Vem kommer åt systemet och dess data, och vad händer vid intrång eller fel?" },
    misuse: { label: "Missbruk", description: "Användning av verktyget eller dess data utöver det ursprungliga ändamålet, eller på sätt som kan skada.", question: "Kan verktyget eller dess data återanvändas för ett ändamål som aldrig bedömts eller godkänts?" }
  };
  const CHECKS_SV = {
    "absence-contestability": { label: "Inget om överklagande eller ifrågasättande", question: "Beskrivs vägen för överklagande eller klagomål någon annanstans?" },
    "absence-human-oversight": { label: "Inget om mänsklig granskning", question: "Beskrivs det någon annanstans vem som granskar resultaten innan beslut fattas?" },
    "absence-accountability": { label: "Inget namngivet ansvar", question: "Anges det någon annanstans vilken roll eller instans som är ansvarig?" },
    "absence-transparency": { label: "Inget om att informera berörda", question: "Får berörda veta att ett verktyg används, och hur?" }
  };

  function detect() {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === "sv" || saved === "en") return saved;
    } catch (e) { /* storage may be unavailable */ }
    const langs = (root.navigator && (root.navigator.languages || [root.navigator.language])) || [];
    return /^sv\b/i.test(langs[0] || "") ? "sv" : "en";
  }

  let lang = detect();
  const listeners = [];

  function t(key, vars = {}) {
    const s = (STR[lang] && STR[lang][key]) ?? STR.en[key] ?? key;
    return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
  }
  // Category with its visible wording in the current language.
  function cat(c) {
    if (!c) return {};
    const sv = lang === "sv" ? CATS_SV[c.id] : null;
    return { ...c, ...(sv || {}) };
  }
  function check(a) {
    const sv = lang === "sv" ? CHECKS_SV[a.id] : null;
    return { ...a, ...(sv || {}) };
  }

  // Static page text: data-i18n (text), data-i18n-html (trusted markup from
  // this file), data-i18n-attr="attr:key;attr:key".
  function applyStatic(doc) {
    doc.documentElement.lang = lang;
    doc.title = t("pageTitle");
    const meta = doc.querySelector('meta[name="description"]');
    if (meta) meta.content = t("metaDesc");
    doc.querySelectorAll("[data-i18n]").forEach((n) => { n.textContent = t(n.dataset.i18n); });
    doc.querySelectorAll("[data-i18n-html]").forEach((n) => { n.innerHTML = t(n.dataset.i18nHtml); });
    doc.querySelectorAll("[data-i18n-attr]").forEach((n) => {
      for (const pair of n.dataset.i18nAttr.split(";")) {
        const [attr, key] = pair.split(":");
        n.setAttribute(attr, t(key));
      }
    });
  }

  function setLang(next, remember = true) {
    if (next !== "sv" && next !== "en") return;
    lang = next;
    if (remember) { try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ } }
    listeners.forEach((fn) => fn(lang));
  }

  root.RiskLensI18n = {
    t, cat, check, applyStatic, setLang,
    get lang() { return lang; },
    onChange: (fn) => listeners.push(fn),
    STR, CATS_SV, CHECKS_SV, LANG_KEY
  };
})(typeof window !== "undefined" ? window : globalThis);
