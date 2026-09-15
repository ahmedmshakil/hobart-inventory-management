"use client";

import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/primitives";
import { PRESET_LABELS, daysBetween, presetRange, todayISO } from "@/lib/dates";
import { dateLabel } from "@/lib/format";
import type { DateRange, RangePreset } from "@/lib/types";

const PRESETS: RangePreset[] = [
  "today",
  "yesterday",
  "last7",
  "thisWeek",
  "last30",
  "thisMonth",
  "lastMonth",
  "last90",
  "thisYear",
];

export function DateRangeBar({
  preset,
  range,
  onChange,
}: {
  preset: RangePreset;
  range: DateRange;
  onChange: (preset: RangePreset, range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(range);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(range), [range]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const days = daysBetween(range.from, range.to) + 1;
  const label =
    preset === "custom"
      ? `${dateLabel(range.from)} – ${dateLabel(range.to)}`
      : PRESET_LABELS[preset];

  return (
    <div className="relative no-print" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9.5 items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium text-ink shadow-[var(--shadow-sm)] transition-colors hover:bg-surface-2"
      >
        <CalendarDays size={15} className="text-ink-muted" />
        <span className="max-w-[15rem] truncate">{label}</span>
        <span className="hidden text-[11px] font-normal text-ink-muted sm:inline">
          · {days} {days === 1 ? "day" : "days"}
        </span>
        <ChevronDown size={14} className="text-ink-muted" />
      </button>

      {open && (
        <div className="animate-pop absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-lg)]">
          <ul className="max-h-72 overflow-y-auto py-1.5">
            {PRESETS.map((p) => (
              <li key={p}>
                <button
                  onClick={() => {
                    onChange(p, presetRange(p));
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-3.5 py-2 text-left text-[13px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  {PRESET_LABELS[p]}
                  {preset === p ? <Check size={16} strokeWidth={2.6} className="text-brand" /> : null}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-line bg-surface-2 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Custom range
            </p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={draft.from}
                max={draft.to}
                onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                className="h-8 w-full rounded-lg border border-line-strong bg-surface px-2 text-[12px] text-ink focus:border-brand focus:outline-none"
              />
              <span className="text-xs text-ink-muted">to</span>
              <input
                type="date"
                value={draft.to}
                min={draft.from}
                max={todayISO()}
                onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                className="h-8 w-full rounded-lg border border-line-strong bg-surface px-2 text-[12px] text-ink focus:border-brand focus:outline-none"
              />
            </div>
            <Button
              size="sm"
              variant="primary"
              className="mt-2.5 w-full"
              onClick={() => {
                if (draft.from && draft.to && draft.from <= draft.to) {
                  onChange("custom", draft);
                  setOpen(false);
                }
              }}
            >
              Apply custom range
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
