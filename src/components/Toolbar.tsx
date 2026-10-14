"use client";
import type { Editor } from "@tiptap/react";

function Btn({
  onClick,
  active,
  label,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep the editor's selection
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      className={`min-w-8 rounded-md px-2 py-1 text-sm transition disabled:opacity-40 ${
        active ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-200"
      }`}
    >
      {children}
    </button>
  );
}

export default function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return <div className="h-10" />;
  const c = () => editor.chain().focus();
  const sep = <span className="mx-1 h-5 w-px bg-stone-300" />;

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-stone-200 bg-white/95 px-3 py-1.5 backdrop-blur">
      <Btn label="Undo" onClick={() => c().undo().run()} disabled={!editor.can().undo()}>↶</Btn>
      <Btn label="Redo" onClick={() => c().redo().run()} disabled={!editor.can().redo()}>↷</Btn>
      {sep}
      <Btn label="Normal text" active={editor.isActive("paragraph")} onClick={() => c().setParagraph().run()}>Text</Btn>
      <Btn label="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => c().toggleHeading({ level: 1 }).run()}>H1</Btn>
      <Btn label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => c().toggleHeading({ level: 2 }).run()}>H2</Btn>
      <Btn label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => c().toggleHeading({ level: 3 }).run()}>H3</Btn>
      {sep}
      <Btn label="Bold (Ctrl+B)" active={editor.isActive("bold")} onClick={() => c().toggleBold().run()}>
        <b>B</b>
      </Btn>
      <Btn label="Italic (Ctrl+I)" active={editor.isActive("italic")} onClick={() => c().toggleItalic().run()}>
        <i>I</i>
      </Btn>
      <Btn label="Underline (Ctrl+U)" active={editor.isActive("underline")} onClick={() => c().toggleUnderline().run()}>
        <u>U</u>
      </Btn>
      {sep}
      <Btn label="Bulleted list" active={editor.isActive("bulletList")} onClick={() => c().toggleBulletList().run()}>• List</Btn>
      <Btn label="Numbered list" active={editor.isActive("orderedList")} onClick={() => c().toggleOrderedList().run()}>1. List</Btn>
    </div>
  );
}
