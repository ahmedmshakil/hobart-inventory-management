import type { DateRange, RangePreset } from "@/lib/types";

export function iso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(s: string) {
  return new Date(`${s}T00:00:00`);
}

export function todayISO() {
  return iso(new Date());
}

export function addDays(s: string, n: number) {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export function daysBetween(a: string, b: string) {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
}

export function inRange(date: string, r: DateRange) {
  return date >= r.from && date <= r.to;
}

export const PRESET_LABELS: Record<RangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 days",
  last30: "Last 30 days",
  thisWeek: "This week",
  thisMonth: "This month",
  lastMonth: "Last month",
  last90: "Last 90 days",
  thisYear: "This year",
  custom: "Custom range",
};

export function presetRange(p: RangePreset, current?: DateRange): DateRange {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const t = iso(now);
  switch (p) {
    case "today":
      return { from: t, to: t };
    case "yesterday": {
      const y = addDays(t, -1);
      return { from: y, to: y };
    }
    case "last7":
      return { from: addDays(t, -6), to: t };
    case "last30":
      return { from: addDays(t, -29), to: t };
    case "last90":
      return { from: addDays(t, -89), to: t };
    case "thisWeek": {
      const dow = (now.getDay() + 6) % 7; // Monday = 0
      return { from: addDays(t, -dow), to: t };
    }
    case "thisMonth": {
      const f = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: iso(f), to: t };
    }
    case "lastMonth": {
      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const l = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: iso(f), to: iso(l) };
    }
    case "thisYear": {
      const f = new Date(now.getFullYear(), 0, 1);
      return { from: iso(f), to: t };
    }
    default:
      return current ?? { from: addDays(t, -29), to: t };
  }
}

/** The equally-long window immediately before `r`, for trend comparison. */
export function previousRange(r: DateRange): DateRange {
  const len = daysBetween(r.from, r.to) + 1;
  return { from: addDays(r.from, -len), to: addDays(r.from, -1) };
}

export function eachDay(r: DateRange): string[] {
  const out: string[] = [];
  let cur = r.from;
  let guard = 0;
  while (cur <= r.to && guard < 1500) {
    out.push(cur);
    cur = addDays(cur, 1);
    guard++;
  }
  return out;
}

export type Bucket = "day" | "week" | "month";

/** Chooses a sensible bucket for the span unless one is forced. */
export function autoBucket(r: DateRange): Bucket {
  const len = daysBetween(r.from, r.to) + 1;
  if (len <= 31) return "day";
  if (len <= 130) return "week";
  return "month";
}

export function bucketKey(date: string, b: Bucket) {
  if (b === "day") return date;
  if (b === "month") return date.slice(0, 7);
  const d = parseISO(date);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return iso(d);
}

export function bucketLabel(key: string, b: Bucket) {
  if (b === "month") {
    const d = new Date(`${key}-01T00:00:00`);
    return d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" });
  }
  const d = new Date(`${key}T00:00:00`);
  if (b === "week") return `w/c ${d.toLocaleDateString("en-AU", { day: "2-digit", month: "short" })}`;
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short" });
}

export function bucketsIn(r: DateRange, b: Bucket): string[] {
  const seen: string[] = [];
  const set = new Set<string>();
  for (const d of eachDay(r)) {
    const k = bucketKey(d, b);
    if (!set.has(k)) {
      set.add(k);
      seen.push(k);
    }
  }
  return seen;
}
