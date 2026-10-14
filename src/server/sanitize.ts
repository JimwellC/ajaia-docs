// Server-side HTML allowlist. Keep identical to the editor's formatting scope in
// src/lib/editorExtensions.ts: whatever the editor produces must pass through unchanged,
// and nothing else may (tests/unit/formatting.test.ts checks this).
// Applied before any document HTML is saved or imported.
import sanitizeHtml from "sanitize-html";
import { isAllowedLinkUrl, LINK_PROTOCOLS, LINK_REL, LINK_TARGET } from "@/lib/linkUrl";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "h1", "h2", "h3", "strong", "b", "em", "i", "u", "s",
    "ul", "ol", "li", "blockquote", "code", "pre", "hr", "a",
  ],
  // Links keep only their href from the input; rel and target are always set by transformTags below.
  allowedAttributes: { a: ["href", "rel", "target"] },
  allowedSchemes: [...LINK_PROTOCOLS],
  allowedSchemesByTag: {},
  allowProtocolRelative: false,
  transformTags: {
    // Same output as the editor's Link extension (attribute order included). A link with a
    // disallowed or missing URL loses its attributes and is unwrapped by exclusiveFilter below.
    // (Renaming it to a disallowed tag instead would trip a sanitize-html bug that mislabels later closing tags.)
    a: (_tag, attribs) => ({
      tagName: "a",
      attribs: isAllowedLinkUrl(attribs.href) ? { target: LINK_TARGET, rel: LINK_REL, href: attribs.href } : ({} as sanitizeHtml.Attributes),
    }),
    // Strikethrough from imports (Markdown produces <del>) maps to the editor's <s>.
    del: "s",
    strike: "s",
  },
  // Unwrap links without an allowed URL: the tag goes, the text stays.
  exclusiveFilter: (frame) => (frame.tag === "a" && !frame.attribs.href ? "excludeTag" : false),
  // Drop these tags together with their contents (other disallowed tags keep their text).
  nonTextTags: ["script", "style", "textarea", "option", "noscript", "iframe", "object", "embed", "svg", "math"],
};

export function sanitizeDocumentHtml(html: string): string {
  // sanitize-html writes void tags as <br /> and <hr />; the editor writes <br> and <hr>.
  return sanitizeHtml(html, OPTIONS).replace(/<(br|hr) \/>/g, "<$1>");
}
