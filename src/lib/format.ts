export const AUD = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

export const AUD2 = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function money(n: number, cents = false) {
  if (!isFinite(n)) return "—";
  return cents ? AUD2.format(n) : AUD.format(n);
}

export function kg(n: number, d = 1) {
  if (!isFinite(n)) return "—";
  return `${n.toLocaleString("en-AU", { minimumFractionDigits: d, maximumFractionDigits: d })} kg`;
}

export function num(n: number, d = 0) {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("en-AU", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function pct(n: number, d = 1) {
  if (!isFinite(n)) return "—";
  return `${n.toFixed(d)}%`;
}

export function compactKg(n: number) {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}t`;
  return `${Math.round(n)}kg`;
}

export function compactMoney(n: number) {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

export function dateLabel(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

export function shortDate(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short" });
}

export function weekdayShort(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString("en-AU", { weekday: "short" });
}

export function relativeDays(isoDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${isoDate}T00:00:00`);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return `in ${diff} days`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
