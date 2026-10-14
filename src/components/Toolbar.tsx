"use client";
import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Underline,
  Undo2,
  X,
} from "lucide-react";
import { parseLinkInput } from "@/lib/linkUrl";

const HINT_KEY = "ajaia:formatting-tip-dismissed";

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

/** "Mod+Shift+S" becomes "Ctrl+Shift+S" on Windows and Linux, "⇧⌘S" on Mac. */
function formatShortcut(keys: string, mac: boolean) {
  if (!mac) return keys.replace("Mod", "Ctrl");
  return keys
    .split("+")
    .map((k) => ({ Mod: "⌘", Shift: "⇧" })[k] ?? k)
    .sort((a, b) => Number(b === "⇧") - Number(a === "⇧")) // Mac order: ⇧ before ⌘
    .join("");
}

function Btn({
  onClick,
  active,
  label,
  shortcut,
  children,
  disabled,
  mac,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  shortcut?: string;
  children: React.ReactNode;
  disabled?: boolean;
  mac: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep the editor's selection
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      aria-keyshortcuts={shortcut?.replace("Mod", mac ? "Meta" : "Control")}
      title={shortcut ? `${label} (${formatShortcut(shortcut, mac)})` : label}
      disabled={disabled}
      className={`inline-flex h-8 min-w-8 max-md:h-10 max-md:min-w-10 shrink-0 items-center justify-center rounded-md px-2 text-sm transition disabled:opacity-40 ${
        active ? "bg-selected text-ink" : "text-ink-muted hover:bg-hover hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-line" />;

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex shrink-0 items-center gap-0.5">
      {children}
    </div>
  );
}

export default function Toolbar({
  editor,
  linkOpen,
  setLinkOpen,
  stickyTop = 0,
}: {
  editor: Editor | null;
  linkOpen: boolean;
  setLinkOpen: (open: boolean) => void;
  /** Distance from the top of the viewport where the toolbar sticks (below the page's top bar). */
  stickyTop?: number;
}) {
  const [mac, setMac] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setMac(isMac());
    try {
      setShowHint(localStorage.getItem(HINT_KEY) !== "1");
    } catch {
      setShowHint(true);
    }
  }, []);

  function dismissHint() {
    setShowHint(false);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      // Storage unavailable (private mode, blocked): the tip just comes back next time.
    }
  }

  if (!editor) return <div className="h-11 border-b border-line" />;
  const c = () => editor.chain().focus();
  const icon = { size: 16, strokeWidth: 2.25, "aria-hidden": true } as const;

  return (
    <>
      <div style={{ top: stickyTop }} className="sticky z-10 border-b border-line bg-white">
        {/* Scrolls sideways within itself on narrow screens; wraps on wider ones. Never scrolls the page. */}
        <div role="toolbar" aria-label="Formatting" className="flex items-center gap-0.5 overflow-x-auto py-1.5 sm:flex-wrap">
          <Group label="History">
            <Btn mac={mac} label="Undo" shortcut="Mod+Z" onClick={() => c().undo().run()} disabled={!editor.can().undo()}>
              <Undo2 {...icon} />
            </Btn>
            <Btn mac={mac} label="Redo" shortcut="Mod+Shift+Z" onClick={() => c().redo().run()} disabled={!editor.can().redo()}>
              <Redo2 {...icon} />
            </Btn>
          </Group>
          <Sep />
          <Group label="Text style">
            <Btn mac={mac} label="Normal text" active={editor.isActive("paragraph")} onClick={() => c().setParagraph().run()}>Text</Btn>
            <Btn mac={mac} label="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => c().toggleHeading({ level: 1 }).run()}>H1</Btn>
            <Btn mac={mac} label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => c().toggleHeading({ level: 2 }).run()}>H2</Btn>
            <Btn mac={mac} label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => c().toggleHeading({ level: 3 }).run()}>H3</Btn>
          </Group>
          <Sep />
          <Group label="Inline formatting">
            <Btn mac={mac} label="Bold" shortcut="Mod+B" active={editor.isActive("bold")} onClick={() => c().toggleBold().run()}>
              <Bold {...icon} />
            </Btn>
            <Btn mac={mac} label="Italic" shortcut="Mod+I" active={editor.isActive("italic")} onClick={() => c().toggleItalic().run()}>
              <Italic {...icon} />
            </Btn>
            <Btn mac={mac} label="Underline" shortcut="Mod+U" active={editor.isActive("underline")} onClick={() => c().toggleUnderline().run()}>
              <Underline {...icon} />
            </Btn>
            <Btn mac={mac} label="Strikethrough" shortcut="Mod+Shift+S" active={editor.isActive("strike")} onClick={() => c().toggleStrike().run()}>
              <Strikethrough {...icon} />
            </Btn>
            <Btn mac={mac} label="Inline code" active={editor.isActive("code")} onClick={() => c().toggleCode().run()}>
              <Code {...icon} />
            </Btn>
          </Group>
          <Sep />
          <Group label="Link">
            <Btn mac={mac} label="Link" shortcut="Mod+K" active={editor.isActive("link") || linkOpen} onClick={() => setLinkOpen(!linkOpen)}>
              <LinkIcon {...icon} />
            </Btn>
          </Group>
          <Sep />
          <Group label="Lists and blocks">
            <Btn mac={mac} label="Bulleted list" active={editor.isActive("bulletList")} onClick={() => c().toggleBulletList().run()}>
              <List {...icon} />
            </Btn>
            <Btn mac={mac} label="Numbered list" active={editor.isActive("orderedList")} onClick={() => c().toggleOrderedList().run()}>
              <ListOrdered {...icon} />
            </Btn>
            <Btn mac={mac} label="Quote" active={editor.isActive("blockquote")} onClick={() => c().toggleBlockquote().run()}>
              <Quote {...icon} />
            </Btn>
            <Btn mac={mac} label="Code block" active={editor.isActive("codeBlock")} onClick={() => c().toggleCodeBlock().run()}>
              <SquareCode {...icon} />
            </Btn>
            <Btn mac={mac} label="Divider" onClick={() => c().setHorizontalRule().run()}>
              <Minus {...icon} />
            </Btn>
          </Group>
        </div>
        {linkOpen && <LinkPopover editor={editor} onClose={() => setLinkOpen(false)} />}
      </div>
      {showHint && (
        <div className="mt-2 flex items-start justify-between gap-3 rounded-md bg-sidebar px-3 py-2 text-sm text-ink-muted">
          <p>Tip: type # for a heading, - for a list, &gt; for a quote, ``` for code.</p>
          <button type="button" onClick={dismissHint} aria-label="Dismiss tip" className="shrink-0 rounded p-0.5 max-md:-my-2 max-md:p-3 text-ink-muted hover:bg-hover">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}

function LinkPopover({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const inLink = editor.isActive("link");
  const [value, setValue] = useState<string>(editor.getAttributes("link").href ?? "");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => input.current?.focus(), []);

  function close() {
    onClose();
    editor.commands.focus();
  }

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseLinkInput(value);
    if ("error" in parsed) {
      setError(parsed.error);
      input.current?.focus();
      return;
    }
    const { url } = parsed;
    if (editor.state.selection.empty && !inLink) {
      // Nothing selected: insert the URL itself as linked text.
      editor.chain().focus().insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    onClose();
  }

  function remove() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onClose();
  }

  return (
    <form
      onSubmit={apply}
      noValidate
      aria-label="Edit link"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          close();
        }
      }}
      className="absolute inset-x-0 top-full z-20 mt-1 rounded-lg bg-white p-3 shadow-lg ring-1 ring-black/10 sm:left-auto sm:w-80"
    >
      <label htmlFor="link-url" className="block text-xs font-medium text-ink">
        Link URL (http, https, or mailto)
      </label>
      <input
        id="link-url"
        ref={input}
        type="url"
        inputMode="url"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError("");
        }}
        placeholder="https://example.com"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "link-url-error" : undefined}
        className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1.5 max-md:py-2.5 text-sm"
      />
      {error && (
        <p id="link-url-error" role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2 text-sm">
        <button type="submit" className="rounded-md bg-ink px-3 py-1 max-md:py-2.5 text-white hover:bg-black">
          Apply
        </button>
        <button type="button" onClick={remove} disabled={!inLink} className="rounded-md px-3 py-1 max-md:py-2.5 ring-1 ring-line hover:bg-hover disabled:opacity-50">
          Remove link
        </button>
        <button type="button" onClick={close} className="px-2 py-1 max-md:py-2.5 text-ink-muted underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
