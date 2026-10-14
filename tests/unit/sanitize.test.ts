import { describe, expect, it } from "vitest";
import { sanitizeDocumentHtml } from "@/server/sanitize";

describe("document HTML sanitization", () => {
  it("removes script tags and their contents", () => {
    expect(sanitizeDocumentHtml('<p>Hi</p><script>alert("x")</script>')).toBe("<p>Hi</p>");
  });

  it("removes event handler attributes such as onclick", () => {
    expect(sanitizeDocumentHtml('<p onclick="steal()">Click</p><strong onmouseover="x()">bold</strong>')).toBe(
      "<p>Click</p><strong>bold</strong>",
    );
  });

  it("removes iframes and style tags", () => {
    expect(sanitizeDocumentHtml('<iframe src="https://evil.test"></iframe><p>ok</p>')).toBe("<p>ok</p>");
    expect(sanitizeDocumentHtml("<style>body{display:none}</style><p>ok</p>")).toBe("<p>ok</p>");
    expect(sanitizeDocumentHtml('<p style="color:red">ok</p>')).toBe("<p>ok</p>");
  });

  it("drops links and images but keeps link text", () => {
    expect(sanitizeDocumentHtml('<p><a href="javascript:alert(1)">link</a><img src="x" onerror="y()"></p>')).toBe(
      "<p>link</p>",
    );
  });

  it("keeps the formatting the editor produces", () => {
    const html =
      "<h1>Goals</h1><h2>Sub</h2><h3>Small</h3><p><strong>Ship</strong> <em>it</em> <u>now</u><br>next</p>" +
      "<ul><li><p>one</p></li></ul><ol><li><p>two</p></li></ol><blockquote><p>quote</p></blockquote>" +
      "<pre><code>code()</code></pre><p><b>b</b><i>i</i><code>c</code></p>";
    expect(sanitizeDocumentHtml(html)).toBe(html);
  });
});
