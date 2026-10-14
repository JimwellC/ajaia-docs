"use client";
// App frame: a collapsible sidebar on wide screens, a drawer under 768px.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ChevronsLeft, House, Menu, PanelLeftOpen, Plus, Upload, X } from "lucide-react";
import type { DocSummary } from "@/server/repo";
import AppIcon from "./AppIcon";
import DocMenu from "./DocMenu";
import { useCreateDocument } from "./useCreateDocument";

const COLLAPSE_KEY = "ajaia:sidebar-collapsed";

const ShellContext = createContext<{ openDrawer: () => void; collapsed: boolean; expand: () => void }>({
  openDrawer: () => {},
  collapsed: false,
  expand: () => {},
});

export interface ShellProps {
  user: { name: string };
  owned: DocSummary[];
  shared: DocSummary[];
  currentDocId?: string;
  children: React.ReactNode;
}

export default function AppShell({ user, owned, shared, currentDocId, children }: ShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // Storage unavailable: start expanded.
    }
  }, []);

  const setCollapsedSaved = useCallback((value: boolean) => {
    setCollapsed(value);
    try {
      localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
    } catch {
      // Storage unavailable: the choice lasts until reload.
    }
  }, []);

  const openDrawer = useCallback(() => {
    opener.current = document.activeElement as HTMLElement | null;
    setDrawerOpen(true);
  }, []);
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    opener.current?.focus();
  }, []);

  // Navigating closes the drawer.
  useEffect(() => setDrawerOpen(false), [pathname]);

  const sidebar = { user, owned, shared, currentDocId, isHome: pathname === "/" };

  return (
    <ShellContext.Provider value={{ openDrawer, collapsed, expand: () => setCollapsedSaved(false) }}>
      <div className="flex min-h-screen bg-white">
        {!collapsed && (
          <div className="sticky top-0 hidden h-screen w-60 shrink-0 md:block">
            <Sidebar {...sidebar} onCollapse={() => setCollapsedSaved(true)} />
          </div>
        )}
        {drawerOpen && <Drawer onClose={closeDrawer}>{<Sidebar {...sidebar} onClose={closeDrawer} />}</Drawer>}
        <div className="min-w-0 flex-1" inert={drawerOpen || undefined}>
          {children}
        </div>
      </div>
    </ShellContext.Provider>
  );
}

/** Opens the drawer on narrow screens, or brings back a collapsed sidebar on wide ones. */
export function NavButton() {
  const { openDrawer, collapsed, expand } = useContext(ShellContext);
  const base = "inline-flex h-8 w-8 max-md:h-10 max-md:w-10 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-hover";
  return (
    <>
      <button type="button" onClick={openDrawer} aria-label="Open navigation" className={`${base} md:hidden`}>
        <Menu size={18} aria-hidden="true" />
      </button>
      {collapsed && (
        <button type="button" onClick={expand} aria-label="Show sidebar" title="Show sidebar" className={`${base} hidden md:inline-flex`}>
          <PanelLeftOpen size={18} aria-hidden="true" />
        </button>
      )}
    </>
  );
}

function Drawer({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>("button, a[href]")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div ref={panel} role="dialog" aria-modal="true" aria-label="Navigation" className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl">
        {children}
      </div>
    </div>
  );
}

function Sidebar({
  user,
  owned,
  shared,
  currentDocId,
  isHome,
  onCollapse,
  onClose,
}: Omit<ShellProps, "children"> & { isHome: boolean; onCollapse?: () => void; onClose?: () => void }) {
  const router = useRouter();
  const create = useCreateDocument();
  const action = "flex w-full items-center gap-2 rounded-md px-2 py-1.5 max-md:py-2.5 text-left text-ink-muted hover:bg-hover disabled:opacity-60";

  async function signOut() {
    await fetch("/api/session", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full flex-col bg-sidebar text-sm text-ink">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 max-md:py-2.5 font-semibold hover:bg-hover">
          <AppIcon />
          <span className="truncate">Ajaia Docs</span>
        </Link>
        {onCollapse && (
          <button type="button" onClick={onCollapse} aria-label="Collapse sidebar" title="Collapse sidebar" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-hover">
            <ChevronsLeft size={16} aria-hidden="true" />
          </button>
        )}
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close navigation" className="inline-flex h-7 w-7 max-md:h-10 max-md:w-10 items-center justify-center rounded-md text-ink-muted hover:bg-hover">
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="px-2">
        <button type="button" onClick={create.createBlank} disabled={create.busy !== null} className={action}>
          <Plus size={16} aria-hidden="true" /> {create.busy === "new" ? "Creating…" : "New document"}
        </button>
        <button type="button" onClick={create.chooseFile} disabled={create.busy !== null} className={action}>
          <Upload size={16} aria-hidden="true" /> {create.busy === "upload" ? "Importing…" : "Import file"}
        </button>
        <input {...create.fileInputProps} />
        {create.error && (
          <p role="alert" className="px-2 py-1 text-red-700">
            {create.error}
          </p>
        )}
      </div>

      <nav aria-label="Documents" className="mt-2 flex-1 overflow-y-auto px-2 pb-4">
        <Link
          href="/"
          aria-current={isHome ? "page" : undefined}
          className={`flex items-center gap-2 rounded-md px-2 py-1.5 max-md:py-2.5 hover:bg-hover ${isHome ? "bg-selected font-medium" : "text-ink-muted"}`}
        >
          <House size={16} aria-hidden="true" /> Home
        </Link>
        <Section title="Private" empty="No documents yet">
          {owned.map((d) => (
            <DocItem key={d.id} doc={d} current={d.id === currentDocId} canDelete />
          ))}
        </Section>
        <Section title="Shared" empty="Nothing shared with you yet">
          {shared.map((d) => (
            <DocItem key={d.id} doc={d} current={d.id === currentDocId} roleHint={d.role === "viewer" ? "Can view" : "Can edit"} />
          ))}
        </Section>
      </nav>

      <div className="flex items-center gap-2 border-t border-line px-3 py-3">
        <span className="min-w-0 flex-1 truncate font-medium" title={user.name}>
          {user.name}
        </span>
        <button type="button" onClick={signOut} className="shrink-0 rounded-md px-2 py-1 max-md:py-2.5 text-ink-muted hover:bg-hover">
          Switch user
        </button>
      </div>
    </aside>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="mt-5">
      <h2 className="px-2 pb-1 text-xs font-medium text-ink-muted">{title}</h2>
      {children.length ? <ul>{children}</ul> : <p className="px-2 py-1 text-ink-muted">{empty}</p>}
    </section>
  );
}

function DocItem({ doc, current, canDelete = false, roleHint }: { doc: DocSummary; current: boolean; canDelete?: boolean; roleHint?: string }) {
  return (
    <li className={`group flex items-center gap-1 rounded-md pr-1 hover:bg-hover ${current ? "bg-selected" : ""}`}>
      <Link
        href={`/docs/${doc.id}`}
        aria-current={current ? "page" : undefined}
        className={`min-w-0 flex-1 truncate rounded-md px-2 py-1.5 max-md:py-2.5 focus-visible:outline-offset-[-2px] ${current ? "font-medium" : ""}`}
      >
        {doc.title}
        {roleHint && <span className="sr-only"> ({roleHint.toLowerCase()})</span>}
      </Link>
      {roleHint && (
        <span aria-hidden="true" className="hidden shrink-0 text-xs text-ink-muted group-focus-within:inline group-hover:inline">
          {roleHint}
        </span>
      )}
      <DocMenu doc={doc} canDelete={canDelete} isCurrent={current} />
    </li>
  );
}
