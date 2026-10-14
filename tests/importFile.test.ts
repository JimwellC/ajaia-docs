import { describe, expect, it } from "vitest";
import { fileToDocument, ImportError, textToHtml, titleFromFilename } from "@/lib/importFile";

describe("file import", () => {
  it("turns plain text into paragraphs and escapes HTML", async () => {
    const { title, html } = await fileToDocument("meeting notes.txt", Buffer.from("Hello <b>world</b>\n\nSecond line"));
    expect(title).toBe("meeting notes");
    expect(html).toBe("<p>Hello &lt;b&gt;world&lt;/b&gt;</p><p>Second line</p>");
  });

  it("converts markdown headings, emphasis and lists", async () => {
    const { html } = await fileToDocument("plan.md", Buffer.from("# Plan\n\n**Bold** item\n\n- one\n- two"));
    expect(html).toContain("<h1>Plan</h1>");
    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain("<li>one</li>");
  });

  it("does not pass raw HTML from markdown through", async () => {
    const { html } = await fileToDocument("x.md", Buffer.from("<script>alert(1)</script>"));
    expect(html).not.toContain("<script>");
  });

  it("rejects unsupported, empty and oversized files", async () => {
    await expect(fileToDocument("image.png", Buffer.from("x"))).rejects.toBeInstanceOf(ImportError);
    await expect(fileToDocument("empty.txt", Buffer.alloc(0))).rejects.toThrow("empty");
    await expect(fileToDocument("big.txt", Buffer.alloc(3 * 1024 * 1024, 97))).rejects.toThrow("2 MB");
  });

  it("handles edge cases in helpers", () => {
    expect(textToHtml("   ")).toBe("<p></p>");
    expect(titleFromFilename(".txt")).toBe("Imported document");
  });
});
