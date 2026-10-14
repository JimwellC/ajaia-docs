// Link rules shared by the editor (src/lib/editorExtensions.ts) and the sanitizer (src/server/sanitize.ts).

export const LINK_PROTOCOLS = ["http", "https", "mailto"] as const;
export const LINK_REL = "noopener noreferrer nofollow";
export const LINK_TARGET = "_blank";

/** True only for absolute http, https, and mailto URLs. */
export function isAllowedLinkUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    return (LINK_PROTOCOLS as readonly string[]).includes(new URL(url.trim()).protocol.slice(0, -1));
  } catch {
    return false;
  }
}

/**
 * Turns what a user typed into a link URL, or explains why it can't be one.
 * "example.com" becomes "https://example.com"; other schemes such as javascript: are refused.
 */
export function parseLinkInput(input: string): { url: string } | { error: string } {
  const value = input.trim();
  if (!value) return { error: "Enter a URL." };
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value);
  const url = hasScheme ? value : `https://${value}`;
  if (hasScheme && !isAllowedLinkUrl(url)) return { error: "Only http, https, and mailto links are allowed." };
  if (/\s/.test(value) || !isAllowedLinkUrl(url)) return { error: "That doesn't look like a valid URL." };
  return { url };
}
