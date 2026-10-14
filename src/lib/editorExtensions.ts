// The editor's formatting scope. Keep identical to the allowlist in src/server/sanitize.ts:
// every node and mark here must survive sanitization unchanged, and nothing else may
// (tests/unit/formatting.test.ts checks this).
//
// Supported: paragraph, H1 to H3, bold, italic, underline, strikethrough, bullet list,
// numbered list, blockquote, code block, inline code, horizontal rule, hard break, links.
import StarterKit from "@tiptap/starter-kit";
import CodeBlock from "@tiptap/extension-code-block";
import OrderedList from "@tiptap/extension-ordered-list";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { isAllowedLinkUrl, LINK_PROTOCOLS, LINK_REL, LINK_TARGET } from "./linkUrl";

// The allowlist permits no attributes except a link's href, so these nodes drop theirs:
// code blocks render as plain <pre><code> (no language class), numbered lists as plain <ol> (always from 1).
const PlainCodeBlock = CodeBlock.extend({
  addAttributes() {
    return {};
  },
});
const PlainOrderedList = OrderedList.extend({
  addAttributes() {
    return {};
  },
});

export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    codeBlock: false,
    orderedList: false,
  }),
  PlainCodeBlock,
  PlainOrderedList,
  Underline,
  Link.configure({
    openOnClick: false,
    autolink: true,
    defaultProtocol: "https",
    protocols: [...LINK_PROTOCOLS],
    HTMLAttributes: { rel: LINK_REL, target: LINK_TARGET, class: null },
    isAllowedUri: (url) => isAllowedLinkUrl(url),
    shouldAutoLink: (url) => isAllowedLinkUrl(url),
  }),
];
