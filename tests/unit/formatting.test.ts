// The editor (src/lib/editorExtensions.ts) and the sanitizer (src/server/sanitize.ts) must agree exactly.
import { describe, expect, it } from "vitest";
import { generateHTML } from "@tiptap/html";
import { editorExtensions } from "@/lib/editorExtensions";
import { fileToDocument } from "@/lib/importFile";
import { parseLinkInput } from "@/lib/linkUrl";
import { sanitizeDocumentHtml } from "@/server/sanitize";

const text = (t: string, marks?: { type: string; attrs?: Record<string, unknown> }[]) => ({ type: "text", text: t, marks });
const para = (...content: object[]) => ({ type: "paragraph", content });

// One document using every supported node and mark.
const everything = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [text("Heading one")] },
    { type: "heading", attrs: { level: 2 }, content: [text("Heading two")] },
    { type: "heading", attrs: { level: 3 }, content: [text("Heading three")] },
    para(
      text("bold", [{ type: "bold" }]),
      text(" "),
      text("italic", [{ type: "italic" }]),
      text(" "),
      text("underline", [{ type: "underline" }]),
      text(" "),
      text("strike", [{ type: "strike" }]),
      text(" "),
      text("code", [{ type: "code" }]),
      { type: "hardBreak" },
      text("a "),
      text("link", [{ type: "link", attrs: { href: "https://example.com/page" } }]),
      text(" and "),
      text("mail", [{ type: "link", attrs: { href: "mailto:team@example.com" } }]),
    ),
    { type: "bulletList", content: [{ type: "listItem", content: [para(text("bullet"))] }] },
    { type: "orderedList", attrs: { start: 3 }, content: [{ type: "listItem", content: [para(text("number"))] }] },
    { type: "blockquote", content: [para(text("quote"))] },
    { type: "codeBlock", attrs: { language: "js" }, content: [text("const x = 1;")] },
    { type: "horizontalRule" },
    para(text("end")),
  ],
};

describe("editor and sanitizer agree", () => {
  it("passes every supported node and mark through sanitization unchanged", () => {
    const html = generateHTML(everything, editorExtensions);
    // Guard against the fixture silently missing a format.
    for (const tag of ["<h1>", "<h2>", "<h3>", "<strong>", "<em>", "<u>", "<s>", "<code>", "<br>", "<a ", "<ul>", "<ol>", "<blockquote>", "<pre>", "<hr>"]) {
      expect(html).toContain(tag);
    }
    expect(html).toContain('<a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com/page">');
    expect(sanitizeDocumentHtml(html)).toBe(html);
  });
});

describe("link URLs", () => {
  it("strips javascript:, data:, and vbscript: links but keeps their text", () => {
    const html =
      '<p><a href="javascript:alert(1)">one</a> <a href="data:text/html,hi">two</a> <a href="vbscript:msgbox(1)">three</a> ' +
      '<a href=" JaVaScRiPt:alert(1)">four</a></p>';
    expect(sanitizeDocumentHtml(html)).toBe("<p>one two three four</p>");
  });

  it("keeps http, https, and mailto links with fixed rel and target", () => {
    const attrs = 'target="_blank" rel="noopener noreferrer nofollow"';
    expect(
      sanitizeDocumentHtml(
        '<p><a href="http://a.test" rel="opener" target="_self" onclick="x()">a</a><a href="https://b.test">b</a><a href="mailto:c@d.test">c</a></p>',
      ),
    ).toBe(`<p><a ${attrs} href="http://a.test">a</a><a ${attrs} href="https://b.test">b</a><a ${attrs} href="mailto:c@d.test">c</a></p>`);
  });

  it("drops relative and protocol-relative links", () => {
    expect(sanitizeDocumentHtml('<p><a href="/docs">rel</a> <a href="//evil.test">pr</a></p>')).toBe("<p>rel pr</p>");
  });

  it("validates link input in the editor with a clear error", () => {
    expect(parseLinkInput("javascript:alert(1)")).toEqual({ error: "Only http, https, and mailto links are allowed." });
    expect(parseLinkInput("data:text/html,x")).toEqual({ error: "Only http, https, and mailto links are allowed." });
    expect(parseLinkInput("not a url")).toEqual({ error: "That doesn't look like a valid URL." });
    expect(parseLinkInput("")).toEqual({ error: "Enter a URL." });
    expect(parseLinkInput("example.com/x")).toEqual({ url: "https://example.com/x" });
    expect(parseLinkInput(" https://example.com ")).toEqual({ url: "https://example.com" });
    expect(parseLinkInput("mailto:a@b.test")).toEqual({ url: "mailto:a@b.test" });
  });
});

describe("markdown import formatting", () => {
  const importMd = async (md: string) => sanitizeDocumentHtml((await fileToDocument("x.md", Buffer.from(md))).html);

  it("keeps the readable text of unsupported syntax and drops only the markup", async () => {
    const html = await importMd("Intro ![Flow diagram](https://x.test/a.png)\n\n| Name | Role |\n|---|---|\n| Jimwell | Owner |");
    expect(html).toContain("Intro Flow diagram");
    for (const word of ["Name", "Role", "Jimwell", "Owner"]) expect(html).toContain(word);
    expect(html).not.toMatch(/<(img|table|thead|tbody|tr|th|td)\b/);
  });

  it("imports links and strikethrough", async () => {
    const html = await importMd("See [the docs](https://example.com) and ~~old~~ text.");
    expect(html).toBe(
      '<p>See <a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com">the docs</a> and <s>old</s> text.</p>\n',
    );
  });
});
