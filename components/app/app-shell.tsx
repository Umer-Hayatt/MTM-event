"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, ChevronsLeft, Menu, Search, X, type LucideIcon } from "lucide-react";
import clsx from "clsx";

export type ShellNavItem = { id: string; label: string; icon: LucideIcon; badge?: string | number };
export type ShellNavGroup = { label?: string; items: ShellNavItem[] };

/**
 * Generic app frame: collapsible sidebar + sticky top bar.
 * Look comes from the finance reference (white floating panels, lime active pill).
 *
 *   <AppShell brand="Acme" groups={nav} active={page} onNavigate={setPage} title="Overview">
 *     ...page content...
 *   </AppShell>
 */
export function AppShell({
  brand,
  groups,
  active,
  onNavigate,
  title,
  actions,
  user,
  sidebarFooter,
  children,
}: {
  brand: React.ReactNode;
  groups: ShellNavGroup[];
  active: string;
  onNavigate: (id: string) => void;
  title?: React.ReactNode;
  /** Buttons rendered on the right of the top bar */
  actions?: React.ReactNode;
  user?: { name: string; email?: string };
  /** Pinned to the bottom of the sidebar (upgrade card, help link…) */
  sidebarFooter?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const nav = (isCollapsed: boolean, onPick: (id: string) => void) => (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.label && !isCollapsed && <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-muted">{g.label}</p>}
          <ul className="space-y-0.5">
            {g.items.map(({ id, label, icon: Icon, badge }) => {
              const on = id === active;
              return (
                <li key={id} className="relative">
                  {on && <motion.span layoutId="shell-active" className="absolute inset-0 rounded-xl bg-highlight/45" transition={{ type: "spring", stiffness: 400, damping: 35 }} />}
                  <button
                    onClick={() => onPick(id)}
                    title={isCollapsed ? label : undefined}
                    className={clsx(
                      "relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                      on ? "font-medium text-foreground" : "text-muted hover:bg-surface hover:text-foreground",
                      isCollapsed && "justify-center px-0",
                    )}
                  >
                    <Icon className="size-[18px] shrink-0" strokeWidth={on ? 2.2 : 1.8} />
                    {!isCollapsed && <span className="flex-1 truncate text-left">{label}</span>}
                    {!isCollapsed && badge != null && <span className="rounded-md bg-accent px-1.5 text-[11px] font-medium text-accent-foreground">{badge}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen gap-4 bg-background p-3 lg:p-4">
      {/* desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 76 : 248 }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        className="sticky top-4 hidden h-[calc(100vh-2rem)] shrink-0 flex-col gap-6 overflow-hidden rounded-3xl border border-border bg-card p-4 lg:flex"
      >
        <div className={clsx("flex items-center", collapsed ? "justify-center" : "justify-between pl-2")}>
          {!collapsed && <div className="truncate text-lg font-bold tracking-tight">{brand}</div>}
          <button onClick={() => setCollapsed((c) => !c)} aria-label="Toggle sidebar" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface">
            <ChevronsLeft className={clsx("size-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>
        {nav(collapsed, onNavigate)}
        {!collapsed && sidebarFooter}
      </motion.aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-6 bg-card p-4 lg:hidden"
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              <div className="flex items-center justify-between pl-2">
                <div className="text-lg font-bold">{brand}</div>
                <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="rounded-lg p-1.5 hover:bg-surface"><X className="size-4" /></button>
              </div>
              {nav(false, (id) => { onNavigate(id); setMobileOpen(false); })}
              {sidebarFooter}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <header className="sticky top-3 z-30 flex items-center gap-3 rounded-2xl border border-border bg-card/90 p-2.5 backdrop-blur lg:top-4">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="rounded-lg p-2 hover:bg-surface lg:hidden"><Menu className="size-5" /></button>
          <label className="flex w-full max-w-xs items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm focus-within:border-accent">
            <Search className="size-4 text-muted" />
            <input ref={searchRef} placeholder="Search" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted" />
            <kbd className="hidden rounded border border-border px-1.5 text-[10px] text-muted sm:block">Ctrl K</kbd>
          </label>
          <div className="ml-auto flex items-center gap-2">
            {actions}
            <button aria-label="Notifications" className="relative grid size-9 place-items-center rounded-full bg-surface hover:bg-border">
              <Bell className="size-4" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-danger" />
            </button>
            {user && (
              <div className="flex items-center gap-2 pl-1">
                <span className="grid size-9 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                  {user.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                </span>
                <div className="hidden leading-tight md:block">
                  <p className="text-sm font-medium">{user.name}</p>
                  {user.email && <p className="text-xs text-muted">{user.email}</p>}
                </div>
              </div>
            )}
          </div>
        </header>

        {title && <h1 className="px-1 text-2xl font-semibold tracking-tight">{title}</h1>}
        <AnimatePresence mode="wait">
          <motion.main key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="min-w-0 flex-1">
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Dark promo card for the sidebar footer. */
export function SidebarPromo({ title, body, cta, onClick }: { title: string; body: string; cta: string; onClick?: () => void }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className="rounded-2xl bg-accent p-4 text-accent-foreground">
      <div className="flex items-start justify-between gap-2 text-sm font-semibold">{title}<button aria-label="Dismiss" onClick={() => setHidden(true)}><X className="size-4 opacity-70" /></button></div>
      <p className="mt-2 text-xs opacity-75">{body}</p>
      <button onClick={onClick} className="mt-3 rounded-lg bg-highlight px-3 py-1.5 text-xs font-semibold text-highlight-foreground">{cta}</button>
    </div>
  );
}
