import { describe, expect, it } from "vitest";
import { contentDisposition, htmlToMarkdown, htmlToPlainText, renderExport } from "@/server/export";

const html =
  '<h2>Plan</h2><p><strong>Bold</strong> <em>it</em> <u>under</u> <s>old</s> <code>x()</code> a*b<br>next</p>' +
  "<ul><li><p>one</p><ul><li><p>nested</p></li></ul></li></ul><ol><li><p>first</p></li><li><p>second</p></li></ol>" +
  '<blockquote><p>quote</p></blockquote><pre><code>let a = 1;</code></pre><hr><p><a target="_blank" rel="noopener noreferrer nofollow" href="https://example.com">site</a> &amp; &lt;tag&gt;</p>';

describe("document export", () => {
  it("converts every supported format to Markdown", () => {
    expect(htmlToMarkdown(html)).toBe(
      [
        "## Plan",
        "**Bold** *it* under ~~old~~ `x()` a\\*b  \nnext",
        "- one\n  - nested",
        "1. first\n2. second",
        "> quote",
        "```\nlet a = 1;\n```",
        "---",
        "[site](https://example.com) & \\<tag>",
      ].join("\n\n") + "\n",
    );
  });

  it("converts to plain text without markup", () => {
    expect(htmlToPlainText(html)).toBe(
      ["Plan", "Bold it under old x() a*b\nnext", "• one\n  • nested", "1. first\n2. second", "quote", "let a = 1;", "----------", "site (https://example.com) & <tag>"].join("\n\n") + "\n",
    );
  });

  it("escapes text that would otherwise become Markdown syntax", () => {
    expect(htmlToMarkdown("<p># not a heading</p><p>- not a list</p>")).toBe("\\# not a heading\n\n\\- not a list\n");
  });

  it("puts the title first", () => {
    expect(renderExport("My *plan*", "<p>Hi</p>", "md")).toBe("# My \\*plan\\*\n\nHi\n");
    expect(renderExport("My plan", "<p>Hi</p>", "txt")).toBe("My plan\n\nHi\n");
  });

  it("builds a safe download filename from the title", () => {
    expect(contentDisposition("Q4 plan", "md")).toBe(`attachment; filename="Q4 plan.md"; filename*=UTF-8''Q4%20plan.md`);
    expect(contentDisposition('a/b: "c" résumé', "txt")).toBe(
      `attachment; filename="a b c resume.txt"; filename*=UTF-8''a%20b%20c%20r%C3%A9sum%C3%A9.txt`,
    );
    expect(contentDisposition("///", "md")).toBe(`attachment; filename="document.md"; filename*=UTF-8''document.md`);
  });
});
