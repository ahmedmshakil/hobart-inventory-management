"use client";

import { Table2, LineChart as LineIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compactKg, compactMoney, num } from "@/lib/format";

/* ------------------------------ chrome ------------------------------- */

export interface LegendItem {
  key: string;
  label: string;
  color: string;
}

export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
      {items.map((i) => (
        <li key={i.key} className="inline-flex items-center gap-1.5 text-[11px] text-ink-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export function ChartCard({
  title,
  subtitle,
  legend,
  children,
  table,
  right,
  height = 280,
}: {
  title: string;
  subtitle?: string;
  legend?: LegendItem[];
  children: ReactNode;
  /** Accessible fallback — required whenever colour carries meaning. */
  table?: ReactNode;
  right?: ReactNode;
  height?: number;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className="print-block rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow-sm)] sm:p-5">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 no-print">
          {right}
          {table ? (
            <button
              onClick={() => setShowTable((v) => !v)}
              className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-line px-2 text-[11px] font-medium text-ink-2 transition-colors hover:bg-surface-3 hover:text-ink"
            >
              {showTable ? <LineIcon size={12} /> : <Table2 size={12} />}
              {showTable ? "Chart" : "Table"}
            </button>
          ) : null}
        </div>
      </header>
      {legend?.length ? (
        <div className="mb-3">
          <ChartLegend items={legend} />
        </div>
      ) : null}
      {showTable && table ? (
        <div className="max-h-[20rem] overflow-auto">{table}</div>
      ) : (
        <div style={{ height }}>{children}</div>
      )}
    </section>
  );
}

/* ------------------------------ tooltip ------------------------------ */

interface TipPayload {
  name?: unknown;
  dataKey?: unknown;
  value?: unknown;
  color?: string;
}

interface TipBoxProps {
  active?: boolean;
  label?: unknown;
  payload?: readonly unknown[];
  fmt: (v: number) => string;
  total?: boolean;
}

function TipBox({ active, label, payload, fmt, total }: TipBoxProps) {
  if (!active || !payload?.length) return null;
  const rows = (payload as TipPayload[]).filter(
    (p) => typeof p.value === "number" && p.value !== 0,
  );
  if (!rows.length) return null;
  const sum = rows.reduce((a, p) => a + (p.value as number), 0);
  return (
    <div className="pointer-events-none min-w-[9rem] rounded-lg border border-line bg-surface px-3 py-2 shadow-[var(--shadow-md)]">
      <p className="mb-1.5 text-[11px] font-semibold text-ink">{String(label ?? "")}</p>
      <ul className="space-y-1">
        {rows.map((p, i) => (
          <li key={i} className="flex items-center justify-between gap-4 text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-ink-2">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: p.color }} />
              {String(p.name ?? p.dataKey)}
            </span>
            <span className="font-medium tabnum text-ink">{fmt(p.value as number)}</span>
          </li>
        ))}
      </ul>
      {total && rows.length > 1 ? (
        <p className="mt-1.5 flex items-center justify-between border-t border-line pt-1.5 text-[11px] font-semibold text-ink">
          <span>Total</span>
          <span className="tabnum">{fmt(sum)}</span>
        </p>
      ) : null}
    </div>
  );
}

const AXIS = { stroke: "var(--axis)", fontSize: 11 };

/* --------------------------- stacked bars ---------------------------- */

export function StackedBars({
  data,
  keys,
  fmt = compactKg,
}: {
  data: Record<string, unknown>[];
  keys: LegendItem[];
  fmt?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 6, right: 4, left: -12, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--axis)" }} {...AXIS} minTickGap={14} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => fmt(Number(v))} {...AXIS} width={52} />
        <Tooltip
          cursor={{ fill: "color-mix(in srgb, var(--ink) 5%, transparent)" }}
          content={(p) => <TipBox {...p} fmt={fmt} total />}
        />
        {keys.map((k, i) => (
          <Bar
            key={k.key}
            dataKey={k.key}
            name={k.label}
            stackId="a"
            fill={k.color}
            stroke="var(--surface)"
            strokeWidth={2}
            radius={i === keys.length - 1 ? [4, 4, 0, 0] : 0}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------ area --------------------------------- */

export function AreaTrend({
  data,
  dataKey,
  name,
  color = "var(--s1)",
  fmt = compactKg,
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  name: string;
  color?: string;
  fmt?: (v: number) => string;
}) {
  const gid = `grad-${dataKey}`;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.26} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--axis)" }} {...AXIS} minTickGap={18} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => fmt(Number(v))} {...AXIS} width={52} />
        <Tooltip
          cursor={{ stroke: "var(--axis)", strokeWidth: 1 }}
          content={(p) => <TipBox {...p} fmt={fmt} />}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gid})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MultiLine({
  data,
  keys,
  fmt = compactMoney,
}: {
  data: Record<string, unknown>[];
  keys: LegendItem[];
  fmt?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--axis)" }} {...AXIS} minTickGap={18} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => fmt(Number(v))} {...AXIS} width={52} />
        <Tooltip cursor={{ stroke: "var(--axis)" }} content={(p) => <TipBox {...p} fmt={fmt} />} />
        {keys.map((k) => (
          <Line
            key={k.key}
            type="monotone"
            dataKey={k.key}
            name={k.label}
            stroke={k.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------ donut -------------------------------- */

export function Donut({
  data,
  centerValue,
  centerLabel,
  fmt = (v: number) => num(v),
}: {
  data: { name: string; value: number; color: string }[];
  centerValue?: string;
  centerLabel?: string;
  fmt?: (v: number) => string;
}) {
  const live = data.filter((d) => d.value > 0);
  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={(p) => <TipBox {...p} fmt={fmt} />} />
          <Pie
            data={live}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            stroke="var(--surface)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {live.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {centerValue ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tracking-[-0.02em] text-ink">{centerValue}</span>
          {centerLabel ? <span className="text-[11px] text-ink-muted">{centerLabel}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------- ranked bar list -------------------------- */

export function RankedBars({
  rows,
  max,
  fmt,
  emptyLabel = "No data in this period",
}: {
  rows: { id: string; label: string; sub?: string; value: number; color?: string }[];
  max?: number;
  fmt: (v: number) => string;
  emptyLabel?: string;
}) {
  if (!rows.length) return <p className="py-6 text-center text-xs text-ink-muted">{emptyLabel}</p>;
  const top = max ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.id}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-[13px] text-ink">{r.label}</span>
            <span className="shrink-0 text-[12px] font-medium tabnum text-ink-2">{fmt(r.value)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full"
                style={{ width: `${(r.value / top) * 100}%`, background: r.color ?? "var(--s1)" }}
              />
            </div>
            {r.sub ? <span className="w-20 shrink-0 text-right text-[11px] tabnum text-ink-muted">{r.sub}</span> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
