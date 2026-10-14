// Server-side HTML allowlist matching what the editor can produce. Everything else is dropped:
// no attributes, links, images, scripts, or styles. Applied before any document HTML is saved.
import sanitizeHtml from "sanitize-html";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "h1", "h2", "h3", "strong", "b", "em", "i", "u", "ul", "ol", "li", "blockquote", "code", "pre"],
  allowedAttributes: {},
  allowedSchemes: [],
  // Drop these tags together with their contents (other disallowed tags keep their text).
  nonTextTags: ["script", "style", "textarea", "option", "noscript", "iframe", "object", "embed", "svg", "math"],
};

export function sanitizeDocumentHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
