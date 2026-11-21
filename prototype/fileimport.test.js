// Unit tests for the in-browser file reader. Run: node --test prototype/fileimport.test.js
const test = require("node:test");
const assert = require("node:assert");
const FI = require("./fileimport.js");
const { makeDocx, zip } = require("../tests/fixtures/make-docx.js");

const file = (name, data) => new File([data], name);

test("kindOf maps extensions and rejects others", () => {
  assert.strictEqual(FI.kindOf("a.TXT"), "text");
  assert.strictEqual(FI.kindOf("a.md"), "markdown");
  assert.strictEqual(FI.kindOf("a.htm"), "html");
  assert.strictEqual(FI.kindOf("beslut.docx"), "docx");
  assert.strictEqual(FI.kindOf("a.doc"), null);
  assert.strictEqual(FI.kindOf("noext"), null);
});

test(".txt keeps paragraphs and drops the BOM", async () => {
  const r = await FI.readFile(file("a.txt", "\ufeffFirst  line\r\n\r\nSecond para"));
  assert.strictEqual(r.text, "First line\n\nSecond para");
});

test(".md strips markup but keeps the words", async () => {
  const r = await FI.readFile(file("a.md", "# Beslut\n\nThe **algorithm** decides, see [the rule](https://x.se).\n\n> quoted"));
  assert.strictEqual(r.text, "Beslut\n\nThe algorithm decides, see the rule.\n\nquoted");
});

test(".html strips tags, scripts and styles and keeps paragraphs", async () => {
  const html = "<html><head><title>T</title><style>p{}</style></head><body><h1>Rubrik</h1><p>Ett\n  automatiserat &amp; beslut</p><script>alert(1)</script><ul><li>One</li><li>Two&nbsp;&#167;</li></ul><p>Line<br>break</p></body></html>";
  const r = await FI.readFile(file("a.html", html));
  assert.strictEqual(r.text, "Rubrik\n\nEtt automatiserat & beslut\n\nOne\n\nTwo §\n\nLine\nbreak");
});

test(".docx: reads w:p paragraphs and joins runs", async () => {
  const buf = makeDocx(["The agency uses automated decision-making.", "Personal data & profiling < limits."]);
  const r = await FI.readFile(file("beslut.docx", buf));
  assert.strictEqual(r.kind, "docx");
  assert.strictEqual(r.text, "The agency uses automated decision-making.\n\nPersonal data & profiling < limits.");
});

test(".docx: tabs, breaks and empty paragraphs", () => {
  const xml = "<w:body><w:p><w:r><w:t>A</w:t><w:tab/><w:t>B</w:t><w:br/><w:t>C</w:t></w:r></w:p><w:p/><w:p><w:r><w:t>D</w:t></w:r></w:p></w:body>";
  assert.strictEqual(FI.docxXmlToText(xml), "A B\nC\n\nD");
});

test("broken and unsupported files give coded errors", async () => {
  await assert.rejects(FI.readFile(file("a.pages", "x")), (e) => e.code === "unsupported");
  await assert.rejects(FI.readFile(file("a.docx", "not a zip at all, just text here")), (e) => e.code === "broken");
  const truncated = makeDocx(["Hello"]).subarray(0, 60);
  await assert.rejects(FI.readFile(file("a.docx", truncated)), (e) => e.code === "broken");
  const noDoc = zip({ "other.xml": "<x/>" });
  await assert.rejects(FI.readFile(file("a.docx", noDoc)), (e) => e.code === "broken" && /document\.xml/.test(e.message));
  await assert.rejects(FI.readFile(file("a.txt", "   \n\n ")), (e) => e.code === "empty");
  await assert.rejects(FI.readFile(file("a.txt", "PK\u0003\u0004\u0000\u0000binary")), (e) => e.code === "broken");
});
