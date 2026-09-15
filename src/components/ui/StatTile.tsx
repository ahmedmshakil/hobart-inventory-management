"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";

export function StatTile({
  label,
  value,
  sub,
  icon,
  deltaPct,
  deltaLabel,
  /** Set false where a rise is bad (waste, cost). */
  upIsGood = true,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  deltaPct?: number;
  deltaLabel?: string;
  upIsGood?: boolean;
  accent?: string;
}) {
  const hasDelta = typeof deltaPct === "number" && isFinite(deltaPct);
  const flat = hasDelta && Math.abs(deltaPct!) < 0.5;
  const up = hasDelta && deltaPct! > 0;
  const good = flat ? null : up === upIsGood;
  const deltaColor = good === null ? "var(--ink-muted)" : good ? "var(--good)" : "var(--critical)";

  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow-sm)]">
      {accent ? (
        <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: accent }} aria-hidden />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{label}</p>
        {icon ? <span className="text-ink-muted">{icon}</span> : null}
      </div>
      <p className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.025em] text-ink">{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {hasDelta ? (
          <span
            className="inline-flex items-center gap-0.5 text-xs font-medium tabnum"
            style={{ color: deltaColor }}
          >
            {flat ? <Minus size={12} /> : up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(deltaPct!).toFixed(1)}%
          </span>
        ) : null}
        {deltaLabel ? <span className="text-[11px] text-ink-muted">{deltaLabel}</span> : null}
        {sub ? <span className="text-[11px] text-ink-muted">{sub}</span> : null}
      </div>
    </div>
  );
}
