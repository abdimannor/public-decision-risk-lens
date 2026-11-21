// Public Decision Risk Lens: read .txt, .md, .html and .docx files in the
// browser. No dependencies and no network: a .docx is a zip archive, so the
// central directory is read by hand and word/document.xml is inflated with
// the built-in DecompressionStream. Works in Node 18+ too, for the tests.
(function (root) {
  class FileImportError extends Error {
    constructor(code, detail) {
      super(detail || code);
      this.code = code; // "unsupported", "broken" or "empty"
    }
  }

  const KINDS = { txt: "text", text: "text", md: "markdown", markdown: "markdown", html: "html", htm: "html", docx: "docx" };
  const ACCEPT = ".txt,.md,.markdown,.html,.htm,.docx,text/plain,text/markdown,text/html,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  function kindOf(name) {
    const m = /\.([a-z0-9]+)$/i.exec(name || "");
    return m ? KINDS[m[1].toLowerCase()] || null : null;
  }

  const NAMED = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", ndash: "-", mdash: "-", hellip: "...", laquo: "«", raquo: "»", rsquo: "'", lsquo: "'", rdquo: "\"", ldquo: "\"", sect: "§", copy: "©", shy: "", aring: "å", Aring: "Å", auml: "ä", Auml: "Ä", ouml: "ö", Ouml: "Ö", eacute: "é", Eacute: "É", uuml: "ü", Uuml: "Ü" };
  function decodeEntities(s) {
    return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, e) => {
      if (e[0] === "#") {
        const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        try { return String.fromCodePoint(code); } catch { return all; }
      }
      return Object.prototype.hasOwnProperty.call(NAMED, e) ? NAMED[e] : all;
    });
  }

  // Paragraphs are separated by one blank line; whitespace inside a paragraph
  // is collapsed so passages match what a reader sees.
  function tidyParagraphs(paras) {
    return paras.map((p) => p.replace(/[ \t\f\v\u00a0]+/g, " ").replace(/ *\n */g, "\n").trim()).filter(Boolean).join("\n\n");
  }

  const BLOCK = "p|div|section|article|aside|header|footer|main|nav|h[1-6]|li|ul|ol|dl|dt|dd|table|thead|tbody|tr|td|th|blockquote|pre|figure|figcaption|form|fieldset|address|hr|caption";
  function htmlToText(html) {
    let s = String(html)
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<(script|style|head|template|noscript|svg|iframe|object)\b[\s\S]*?<\/\1\s*>/gi, "")
      .replace(/<br\s*\/?>/gi, "\u2028")
      .replace(new RegExp(`</?(?:${BLOCK})\\b[^>]*>`, "gi"), "\n\n")
      .replace(/<[^>]*>/g, "");
    s = decodeEntities(s).replace(/\r\n?/g, "\n");
    // Inside a paragraph a single source newline is just wrapping.
    return tidyParagraphs(s.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").replace(/ *\u2028 */g, "\n")));
  }

  function markdownToText(md) {
    const s = String(md).replace(/\r\n?/g, "\n")
      .replace(/^```[^\n]*\n([\s\S]*?)^```\s*$/gm, "$1")
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/^ {0,3}#{1,6}\s+/gm, "")
      .replace(/^ {0,3}>\s?/gm, "")
      .replace(/^ {0,3}(?:[-*_]\s*){3,}$/gm, "")
      .replace(/(\*\*|__)(.+?)\1/g, "$2")
      .replace(/`([^`]+)`/g, "$1");
    return tidyParagraphs(s.split(/\n\s*\n/));
  }

  function plainText(txt) {
    return tidyParagraphs(String(txt).replace(/^\ufeff/, "").replace(/\r\n?/g, "\n").split(/\n\s*\n/));
  }

  // --- zip ---------------------------------------------------------------
  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }

  function zipEntries(bytes) {
    const min = Math.max(0, bytes.length - 22 - 65535);
    let eocd = -1;
    for (let i = bytes.length - 22; i >= min; i--) {
      if (u32(bytes, i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new FileImportError("broken", "no zip directory");
    const count = u16(bytes, eocd + 10);
    let p = u32(bytes, eocd + 16);
    const out = [];
    for (let n = 0; n < count; n++) {
      if (p + 46 > bytes.length || u32(bytes, p) !== 0x02014b50) throw new FileImportError("broken", "bad zip entry");
      const nameLen = u16(bytes, p + 28);
      out.push({
        method: u16(bytes, p + 10), compSize: u32(bytes, p + 20), size: u32(bytes, p + 24),
        offset: u32(bytes, p + 42), name: new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen))
      });
      p += 46 + nameLen + u16(bytes, p + 30) + u16(bytes, p + 32);
    }
    return out;
  }

  async function zipRead(bytes, entry) {
    const o = entry.offset;
    if (o + 30 > bytes.length || u32(bytes, o) !== 0x04034b50) throw new FileImportError("broken", "bad local header");
    const start = o + 30 + u16(bytes, o + 26) + u16(bytes, o + 28);
    const data = bytes.subarray(start, start + entry.compSize);
    if (data.length !== entry.compSize) throw new FileImportError("broken", "truncated entry");
    if (entry.method === 0) return data;
    if (entry.method !== 8) throw new FileImportError("broken", `compression method ${entry.method}`);
    if (typeof DecompressionStream === "undefined") throw new FileImportError("unsupported", "DecompressionStream missing");
    try {
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch (err) {
      throw new FileImportError("broken", "could not inflate");
    }
  }

  function docxXmlToText(xml) {
    const paras = [];
    const pRe = /<w:p\b[^>]*?(?:\/>|>([\s\S]*?)<\/w:p>)/g;
    let m;
    while ((m = pRe.exec(xml))) {
      const body = m[1] || "";
      let text = "";
      const tRe = /<w:t\b[^>]*>([^<]*)<\/w:t>|<w:tab\b[^>]*\/>|<w:(?:br|cr)\b[^>]*\/>/g;
      let r;
      while ((r = tRe.exec(body))) {
        if (r[1] !== undefined) text += decodeEntities(r[1]);
        else if (r[0].startsWith("<w:tab")) text += "\t";
        else text += "\n";
      }
      paras.push(text);
    }
    return tidyParagraphs(paras);
  }

  async function docxToText(bytes) {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (b.length < 22 || u32(b, 0) !== 0x04034b50) throw new FileImportError("broken", "not a zip archive");
    const entry = zipEntries(b).find((e) => e.name === "word/document.xml");
    if (!entry) throw new FileImportError("broken", "word/document.xml missing");
    const xml = new TextDecoder("utf-8").decode(await zipRead(b, entry));
    return docxXmlToText(xml);
  }

  // Read a File or Blob with a name. Returns { text, kind }.
  async function readFile(file) {
    const kind = kindOf(file.name);
    if (!kind) throw new FileImportError("unsupported", file.name);
    let text;
    if (kind === "docx") text = await docxToText(new Uint8Array(await file.arrayBuffer()));
    else {
      const raw = await file.text();
      if (/\u0000/.test(raw.slice(0, 2000))) throw new FileImportError("broken", "binary content");
      text = kind === "html" ? htmlToText(raw) : kind === "markdown" ? markdownToText(raw) : plainText(raw);
    }
    if (!text.trim()) throw new FileImportError("empty", file.name);
    return { text, kind };
  }

  const api = { readFile, kindOf, htmlToText, markdownToText, plainText, docxToText, docxXmlToText, zipEntries, FileImportError, ACCEPT };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RiskLensFileImport = api;
})(typeof window !== "undefined" ? window : globalThis);
