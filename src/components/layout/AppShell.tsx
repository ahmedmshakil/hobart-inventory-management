"use client";

import { Bell, ChevronsLeft, Menu, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ALL_NAV_ITEMS, NAV } from "@/components/layout/nav";
import { Badge } from "@/components/ui/primitives";
import { DEMO_DATA_ENABLED } from "@/data/demo-seed";
import { expiringLots, stockRows } from "@/lib/analytics";
import { todayISO } from "@/lib/dates";
import { useStore } from "@/lib/store";

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-1 py-0.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand text-white shadow-[var(--shadow-sm)]">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden>
          <path
            d="M4 9.5C4 6.46 6.46 4 9.5 4h5C17.54 4 20 6.46 20 9.5c0 2.2-1.3 4.1-3.17 4.96V17a3 3 0 0 1-3 3h-2.66a3 3 0 0 1-3-3v-2.54C5.3 13.6 4 11.7 4 9.5Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="9.5" r="2.2" fill="currentColor" />
        </svg>
      </span>
      {!collapsed && (
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-semibold leading-tight tracking-[-0.01em] text-ink">
            Hobart Premium Meat
          </span>
          <span className="block truncate text-[10.5px] leading-tight text-ink-muted">
            Processing &amp; Inventory
          </span>
        </span>
      )}
    </Link>
  );
}

function NavList({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-3">
      {NAV.map((group) => (
        <div key={group.title}>
          {!collapsed && (
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              {group.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={`group flex items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] font-medium transition-colors ${
                      active
                        ? "bg-brand-soft text-brand-ink"
                        : "text-ink-2 hover:bg-surface-3 hover:text-ink"
                    } ${collapsed ? "justify-center" : ""}`}
                  >
                    <Icon size={16} className={active ? "text-brand" : "text-ink-muted group-hover:text-ink-2"} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function AlertBell() {
  const [open, setOpen] = useState(false);
  const lots = useStore((s) => s.lots);
  const products = useStore((s) => s.products);
  const settings = useStore((s) => s.settings);
  const orders = useStore((s) => s.orders);

  const alerts = useMemo(() => {
    const today = todayISO();
    const low = stockRows(lots, products).filter((r) => r.belowReorder && r.kg > 0);
    const exp = expiringLots(lots, settings.expiryWarningDays, today);
    const late = orders.filter(
      (o) => o.deliveryDate < today && o.status !== "Delivered" && o.status !== "Cancelled",
    );
    return { low, exp, late };
  }, [lots, products, settings.expiryWarningDays, orders]);

  const count = alerts.low.length + alerts.exp.length + alerts.late.length;

  return (
    <div className="relative no-print">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Alerts (${count})`}
        className="relative grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <Bell size={15} />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[9.5px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="animate-pop absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-lg)]">
            <header className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <h4 className="text-[13px] font-semibold text-ink">Operational alerts</h4>
              <span className="text-[11px] text-ink-muted">{count} open</span>
            </header>
            <div className="max-h-80 divide-y divide-line overflow-y-auto">
              {count === 0 && (
                <p className="px-4 py-6 text-center text-xs text-ink-muted">
                  All clear — nothing needs attention.
                </p>
              )}
              {alerts.exp.slice(0, 5).map((l) => {
                const p = products.find((x) => x.id === l.productId);
                return (
                  <div key={l.id} className="flex items-start gap-2.5 px-4 py-2.5">
                    <Badge tone="warning">Expiry</Badge>
                    <p className="text-[12px] leading-snug text-ink-2">
                      <span className="font-medium text-ink">{p?.name}</span> lot {l.lotCode} expires{" "}
                      {l.expiryDate}
                    </p>
                  </div>
                );
              })}
              {alerts.low.slice(0, 5).map((r) => (
                <div key={r.product.id} className="flex items-start gap-2.5 px-4 py-2.5">
                  <Badge tone="critical">Low stock</Badge>
                  <p className="text-[12px] leading-snug text-ink-2">
                    <span className="font-medium text-ink">{r.product.name}</span> at{" "}
                    {r.kg.toFixed(1)} kg (re-order {r.product.reorderLevelKg} kg)
                  </p>
                </div>
              ))}
              {alerts.late.slice(0, 4).map((o) => (
                <div key={o.id} className="flex items-start gap-2.5 px-4 py-2.5">
                  <Badge tone="critical">Overdue</Badge>
                  <p className="text-[12px] leading-snug text-ink-2">
                    Order <span className="font-medium text-ink">{o.orderNo}</span> was due{" "}
                    {o.deliveryDate}
                  </p>
                </div>
              ))}
            </div>
            <Link
              href="/inventory"
              onClick={() => setOpen(false)}
              className="block border-t border-line bg-surface-2 px-4 py-2.5 text-center text-[12px] font-medium text-brand-ink hover:bg-surface-3"
            >
              Open inventory
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const hydrated = useStore((s) => s.hydrated);

  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("hpm-nav-collapsed") === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("hpm-nav-collapsed", c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  };

  const current = ALL_NAV_ITEMS.find((i) => i.href === pathname);

  return (
    <div className="flex min-h-screen">
      {/* ---------------------------- sidebar ---------------------------- */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-surface transition-[width,transform] duration-200 lg:static lg:translate-x-0 ${
          collapsed ? "w-[4.5rem]" : "w-64"
        } ${mobileOpen ? "translate-x-0 shadow-[var(--shadow-lg)]" : "-translate-x-[110%] lg:-translate-x-0"}`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-3">
          <Brand collapsed={collapsed} />
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 lg:hidden"
            aria-label="Close navigation"
          >
            <X size={17} />
          </button>
        </div>

        <NavList collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />

        <div className="border-t border-line p-2">
          {DEMO_DATA_ENABLED && !collapsed && (
            <div className="mb-2 flex items-start gap-2 rounded-lg bg-brand-soft px-2.5 py-2">
              <Sparkles size={13} className="mt-0.5 shrink-0 text-brand" />
              <p className="text-[10.5px] leading-snug text-brand-ink">
                Demo dataset loaded. Clear it any time from Settings.
              </p>
            </div>
          )}
          <button
            onClick={toggleCollapsed}
            className={`hidden w-full items-center gap-2 rounded-lg px-2 py-2 text-[12px] font-medium text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink lg:flex ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <ChevronsLeft size={15} className={collapsed ? "rotate-180" : ""} />
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-[rgba(12,10,9,0.45)] lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* ----------------------------- main ------------------------------ */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-[color-mix(in_srgb,var(--plane)_86%,transparent)] px-4 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 text-ink-2 hover:bg-surface-3 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink">{current?.label ?? "Dashboard"}</p>
            <p className="hidden truncate text-[11px] text-ink-muted sm:block">{current?.short}</p>
          </div>
          <AlertBell />
          <ThemeToggle />
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          {hydrated ? (
            <div className="animate-fade-up mx-auto w-full max-w-[110rem]">{children}</div>
          ) : (
            <div className="mx-auto w-full max-w-[110rem] space-y-4">
              <div className="h-8 w-52 animate-pulse rounded-lg bg-surface-3" />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-xl bg-surface-3" />
                ))}
              </div>
              <div className="h-72 animate-pulse rounded-xl bg-surface-3" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
