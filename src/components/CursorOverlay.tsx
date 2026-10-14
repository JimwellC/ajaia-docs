"use client";
// Block-level cursor indicators drawn in an overlay beside the editor. It only reads the editor's DOM,
// so it never changes the document, never triggers an update or a save, and never moves the local cursor.
import { useEffect, useState, type RefObject } from "react";
import type { Editor } from "@tiptap/react";
import { colorFor, visibleCursors } from "@/lib/cursorBlocks";
import type { PresenceEntry } from "@/server/repo";

interface Marker {
  id: string;
  name: string;
  color: string;
  top: number;
  height: number;
}

export default function CursorOverlay({ editor, others, container }: { editor: Editor | null; others: PresenceEntry[]; container: RefObject<HTMLDivElement | null> }) {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [tick, setTick] = useState(0);

  // Re-measure when the document or the window changes, since blocks move.
  useEffect(() => {
    if (!editor) return;
    const bump = () => setTick((t) => t + 1);
    editor.on("transaction", bump);
    window.addEventListener("resize", bump);
    return () => {
      editor.off("transaction", bump);
      window.removeEventListener("resize", bump);
    };
  }, [editor]);

  useEffect(() => {
    const box = container.current;
    if (!editor || editor.isDestroyed || !box) return setMarkers([]);
    const blocks = editor.view.dom.children;
    const origin = box.getBoundingClientRect();
    setMarkers(
      visibleCursors(others, Math.min(blocks.length, editor.state.doc.childCount)).map((p) => {
        const r = blocks[p.cursorBlock]!.getBoundingClientRect();
        return { id: p.id, name: p.name, color: colorFor(p.id), top: r.top - origin.top, height: r.height };
      }),
    );
  }, [editor, others, container, tick]);

  if (markers.length === 0) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block">
      {markers.map((m) => (
        <div key={m.id} data-cursor-for={m.name} className="absolute left-0" style={{ top: m.top, height: m.height }}>
          <span className="absolute -left-[5px] top-0 h-full w-[2px] rounded-full opacity-70" style={{ background: m.color }} />
          <span
            className="absolute right-[calc(100%+8px)] top-0 max-w-6 truncate rounded px-1 text-[11px] font-medium leading-5 text-white xl:max-w-24"
            style={{ background: m.color }}
            title={m.name}
          >
            <span className="xl:hidden">{m.name.charAt(0).toUpperCase()}</span>
            <span className="hidden xl:inline">{m.name.split(" ")[0]}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
