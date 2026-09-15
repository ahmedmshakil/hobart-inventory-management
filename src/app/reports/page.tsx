"use client";

import { Download, FileBarChart, Printer } from "lucide-react";
import { useMemo, useState } from "react";

import { ChartCard, StackedBars } from "@/components/charts";
import { DateRangeBar } from "@/components/ui/DateRangeBar";
import { StatTile } from "@/components/ui/StatTile";
import { Badge, Button, Card, CardHeader, PageHeader, Select } from "@/components/ui/primitives";
import {
  REVENUE_STATUSES,
  SPECIES_COLOR,
  cutOutputs,
  orderKg,
  orderValue,
  productionSummary,
  runSaleableKg,
  salesSummary,
  speciesYield,
  stockRows,
  sum,
  trendSeries,
  wastageSummary,
} from "@/lib/analytics";
import { downloadCSV } from "@/lib/csv";
import { autoBucket, bucketLabel, inRange } from "@/lib/dates";
import { compactKg, compactMoney, dateLabel, money, num, pct } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useRange } from "@/lib/useRange";
import { SPECIES, SPECIES_ANIMAL } from "@/lib/types";

type ReportId =
  | "yield"
  | "cuts"
  | "daily"
  | "stock"
  | "sales-customer"
  | "sales-product"
  | "purchases"
  | "wastage";

const REPORTS: { id: ReportId; name: string; blurb: string }[] = [
  { id: "yield", name: "Production & yield by species", blurb: "Head processed, live/carcass/saleable weight and yield per animal." },
  { id: "cuts", name: "Cut production report", blurb: "Every cut produced in the period, in kilograms and piece counts." },
  { id: "daily", name: "Daily production log", blurb: "Day-by-day carcass in, saleable out, yield and loss." },
  { id: "stock", name: "Stock on hand valuation", blurb: "Current cold-room inventory by cut, with value and next expiry." },
  { id: "sales-customer", name: "Sales by customer", blurb: "Revenue, weight and order count per wholesale account." },
  { id: "sales-product", name: "Sales by product", blurb: "What sold, how much of it, and what it earned." },
  { id: "purchases", name: "Livestock purchases by supplier", blurb: "Consignments, head, carcass weight and spend per supplier." },
  { id: "wastage", name: "Wastage & yield loss", blurb: "Trim, bone and avoidable loss by reason and species." },
];

interface Built {
  columns: string[];
  rows: Record<string, string | number>[];
  numeric: Set<string>;
  footer?: Record<string, string | number | undefined>;
}

export default function ReportsPage() {
  const { preset, range, onChange } = useRange("thisMonth");
  const [reportId, setReportId] = useState<ReportId>("yield");

  const runs = useStore((s) => s.runs);
  const intakes = useStore((s) => s.intakes);
  const orders = useStore((s) => s.orders);
  const lots = useStore((s) => s.lots);
  const products = useStore((s) => s.products);
  const customers = useStore((s) => s.customers);
  const suppliers = useStore((s) => s.suppliers);
  const wastage = useStore((s) => s.wastage);
  const settings = useStore((s) => s.settings);

  const prod = useMemo(() => productionSummary(runs, range), [runs, range]);
  const sales = useMemo(() => salesSummary(orders, range), [orders, range]);
  const waste = useMemo(() => wastageSummary(wastage, range), [wastage, range]);
  const bucket = autoBucket(range);
  const trend = useMemo(
    () => trendSeries(range, bucket, runs, orders, wastage, (k) => bucketLabel(k, bucket)),
    [range, bucket, runs, orders, wastage],
  );

  const report = REPORTS.find((r) => r.id === reportId)!;

  const built: Built = useMemo(() => {
    switch (reportId) {
      case "yield": {
        const ys = speciesYield(runs, intakes, range).filter((y) => y.head > 0);
        return {
          columns: [
            "Species",
            "Animal",
            "Batches",
            "Head",
            "Live kg",
            "Carcass kg",
            "Saleable kg",
            "Live kg/head",
            "Carcass kg/head",
            "Saleable kg/head",
            "Dressing %",
            "Boning yield %",
            "Total yield %",
            "Cost $/saleable kg",
          ],
          numeric: new Set([
            "Batches", "Head", "Live kg", "Carcass kg", "Saleable kg", "Live kg/head",
            "Carcass kg/head", "Saleable kg/head", "Dressing %", "Boning yield %",
            "Total yield %", "Cost $/saleable kg",
          ]),
          rows: ys.map((y) => ({
            Species: y.species,
            Animal: SPECIES_ANIMAL[y.species],
            Batches: y.batches,
            Head: y.head,
            "Live kg": +y.liveKg.toFixed(1),
            "Carcass kg": +y.carcassKg.toFixed(1),
            "Saleable kg": +y.saleableKg.toFixed(1),
            "Live kg/head": +y.liveKgPerHead.toFixed(1),
            "Carcass kg/head": +y.carcassKgPerHead.toFixed(1),
            "Saleable kg/head": +y.saleableKgPerHead.toFixed(1),
            "Dressing %": +y.dressingPct.toFixed(1),
            "Boning yield %": +y.boningYieldPct.toFixed(1),
            "Total yield %": +y.totalYieldPct.toFixed(1),
            "Cost $/saleable kg": +y.costPerSaleableKg.toFixed(2),
          })),
          footer: {
            Species: "TOTAL",
            Head: prod.headProcessed,
            "Carcass kg": +prod.carcassInKg.toFixed(1),
            "Saleable kg": +prod.saleableKg.toFixed(1),
            "Boning yield %": +prod.boningYieldPct.toFixed(1),
          },
        };
      }
      case "cuts": {
        const cs = cutOutputs(runs, products, range);
        return {
          columns: ["SKU", "Cut", "Species", "Category", "Kilograms", "Pieces", "Runs", "Value at list $"],
          numeric: new Set(["Kilograms", "Pieces", "Runs", "Value at list $"]),
          rows: cs.map((c) => ({
            SKU: c.product.sku,
            Cut: c.product.name,
            Species: c.product.species,
            Category: c.product.category,
            Kilograms: +c.kg.toFixed(1),
            Pieces: c.product.unit === "piece" ? c.pieces : 0,
            Runs: c.runs,
            "Value at list $": +c.value.toFixed(2),
          })),
          footer: {
            SKU: "TOTAL",
            Kilograms: +sum(cs, (c) => c.kg).toFixed(1),
            Pieces: sum(cs, (c) => (c.product.unit === "piece" ? c.pieces : 0)),
            "Value at list $": +sum(cs, (c) => c.value).toFixed(2),
          },
        };
      }
      case "daily": {
        const days = runs
          .filter((r) => inRange(r.date, range))
          .reduce((acc, r) => {
            const cur = acc.get(r.date) ?? { runs: 0, head: 0, carcass: 0, saleable: 0, trim: 0, bone: 0, waste: 0 };
            cur.runs += 1;
            cur.head += r.headProcessed;
            cur.carcass += r.carcassInputKg;
            cur.saleable += runSaleableKg(r);
            cur.trim += r.trimKg;
            cur.bone += r.boneKg;
            cur.waste += r.wasteKg;
            acc.set(r.date, cur);
            return acc;
          }, new Map<string, { runs: number; head: number; carcass: number; saleable: number; trim: number; bone: number; waste: number }>());
        return {
          columns: ["Date", "Runs", "Head", "Carcass kg", "Saleable kg", "Yield %", "Trim kg", "Bone kg", "Waste kg"],
          numeric: new Set(["Runs", "Head", "Carcass kg", "Saleable kg", "Yield %", "Trim kg", "Bone kg", "Waste kg"]),
          rows: [...days.entries()]
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([date, v]) => ({
              Date: date,
              Runs: v.runs,
              Head: v.head,
              "Carcass kg": +v.carcass.toFixed(1),
              "Saleable kg": +v.saleable.toFixed(1),
              "Yield %": +(v.carcass ? (v.saleable / v.carcass) * 100 : 0).toFixed(1),
              "Trim kg": +v.trim.toFixed(1),
              "Bone kg": +v.bone.toFixed(1),
              "Waste kg": +v.waste.toFixed(1),
            })),
          footer: {
            Date: "TOTAL",
            Runs: prod.runCount,
            Head: prod.headProcessed,
            "Carcass kg": +prod.carcassInKg.toFixed(1),
            "Saleable kg": +prod.saleableKg.toFixed(1),
            "Yield %": +prod.boningYieldPct.toFixed(1),
          },
        };
      }
      case "stock": {
        const rs = stockRows(lots, products).filter((r) => r.kg > 0);
        return {
          columns: ["SKU", "Cut", "Species", "On hand kg", "Pieces", "Lots", "Value $", "Oldest lot", "Next expiry", "Re-order kg"],
          numeric: new Set(["On hand kg", "Pieces", "Lots", "Value $", "Re-order kg"]),
          rows: rs.map((r) => ({
            SKU: r.product.sku,
            Cut: r.product.name,
            Species: r.product.species,
            "On hand kg": +r.kg.toFixed(1),
            Pieces: r.product.unit === "piece" ? r.pieces : 0,
            Lots: r.lots,
            "Value $": +r.value.toFixed(2),
            "Oldest lot": r.oldestDate ?? "",
            "Next expiry": r.nearestExpiry ?? "",
            "Re-order kg": r.product.reorderLevelKg,
          })),
          footer: {
            SKU: "TOTAL",
            "On hand kg": +sum(rs, (r) => r.kg).toFixed(1),
            "Value $": +sum(rs, (r) => r.value).toFixed(2),
          },
        };
      }
      case "sales-customer": {
        const os = orders.filter((o) => inRange(o.orderDate, range) && REVENUE_STATUSES.includes(o.status));
        const acc = new Map<string, { revenue: number; kg: number; orders: number; last: string }>();
        for (const o of os) {
          const cur = acc.get(o.customerId) ?? { revenue: 0, kg: 0, orders: 0, last: "" };
          cur.revenue += orderValue(o);
          cur.kg += orderKg(o);
          cur.orders += 1;
          if (o.orderDate > cur.last) cur.last = o.orderDate;
          acc.set(o.customerId, cur);
        }
        const rows = [...acc.entries()]
          .map(([id, v]) => {
            const c = customers.find((x) => x.id === id);
            return {
              Customer: c?.name ?? "Unknown",
              Type: c?.type ?? "",
              Suburb: c?.suburb ?? "",
              Terms: c?.paymentTerms ?? "",
              Orders: v.orders,
              "Weight kg": +v.kg.toFixed(1),
              "Revenue $": +v.revenue.toFixed(2),
              "Avg order $": +(v.revenue / v.orders).toFixed(2),
              "Last order": v.last,
            };
          })
          .sort((a, b) => Number(b["Revenue $"]) - Number(a["Revenue $"]));
        return {
          columns: ["Customer", "Type", "Suburb", "Terms", "Orders", "Weight kg", "Revenue $", "Avg order $", "Last order"],
          numeric: new Set(["Orders", "Weight kg", "Revenue $", "Avg order $"]),
          rows,
          footer: {
            Customer: "TOTAL",
            Orders: sum(rows, (r) => Number(r.Orders)),
            "Weight kg": +sum(rows, (r) => Number(r["Weight kg"])).toFixed(1),
            "Revenue $": +sum(rows, (r) => Number(r["Revenue $"])).toFixed(2),
          },
        };
      }
      case "sales-product": {
        const os = orders.filter((o) => inRange(o.orderDate, range) && REVENUE_STATUSES.includes(o.status));
        const acc = new Map<string, { kg: number; pieces: number; revenue: number; lines: number }>();
        for (const o of os)
          for (const l of o.lines) {
            const cur = acc.get(l.productId) ?? { kg: 0, pieces: 0, revenue: 0, lines: 0 };
            cur.kg += l.qtyKg;
            cur.pieces += l.pieces;
            cur.revenue += l.qtyKg * l.unitPrice;
            cur.lines += 1;
            acc.set(l.productId, cur);
          }
        const rows = [...acc.entries()]
          .map(([id, v]) => {
            const p = products.find((x) => x.id === id);
            const cost = (p?.costPerKg ?? 0) * v.kg;
            return {
              SKU: p?.sku ?? "",
              Cut: p?.name ?? "Unknown",
              Species: p?.species ?? "",
              "Order lines": v.lines,
              "Weight kg": +v.kg.toFixed(1),
              Pieces: p?.unit === "piece" ? v.pieces : 0,
              "Revenue $": +v.revenue.toFixed(2),
              "Est. cost $": +cost.toFixed(2),
              "Gross margin %": +(v.revenue ? ((v.revenue - cost) / v.revenue) * 100 : 0).toFixed(1),
            };
          })
          .sort((a, b) => Number(b["Revenue $"]) - Number(a["Revenue $"]));
        return {
          columns: ["SKU", "Cut", "Species", "Order lines", "Weight kg", "Pieces", "Revenue $", "Est. cost $", "Gross margin %"],
          numeric: new Set(["Order lines", "Weight kg", "Pieces", "Revenue $", "Est. cost $", "Gross margin %"]),
          rows,
          footer: {
            SKU: "TOTAL",
            "Weight kg": +sum(rows, (r) => Number(r["Weight kg"])).toFixed(1),
            "Revenue $": +sum(rows, (r) => Number(r["Revenue $"])).toFixed(2),
            "Est. cost $": +sum(rows, (r) => Number(r["Est. cost $"])).toFixed(2),
          },
        };
      }
      case "purchases": {
        const bs = intakes.filter((b) => inRange(b.arrivalDate, range));
        const acc = new Map<string, { batches: number; head: number; live: number; carcass: number; cost: number }>();
        for (const b of bs) {
          const cur = acc.get(b.supplierId) ?? { batches: 0, head: 0, live: 0, carcass: 0, cost: 0 };
          cur.batches += 1;
          cur.head += b.headCount;
          cur.live += b.liveWeightKg;
          cur.carcass += b.carcassWeightKg;
          cur.cost += b.cost;
          acc.set(b.supplierId, cur);
        }
        const rows = [...acc.entries()]
          .map(([id, v]) => {
            const s = suppliers.find((x) => x.id === id);
            return {
              Supplier: s?.name ?? "Unknown",
              Type: s?.type ?? "",
              Consignments: v.batches,
              Head: v.head,
              "Live kg": +v.live.toFixed(1),
              "Carcass kg": +v.carcass.toFixed(1),
              "Dressing %": +(v.live ? (v.carcass / v.live) * 100 : 0).toFixed(1),
              "Spend $": +v.cost.toFixed(2),
              "$ / carcass kg": +(v.carcass ? v.cost / v.carcass : 0).toFixed(2),
            };
          })
          .sort((a, b) => Number(b["Spend $"]) - Number(a["Spend $"]));
        return {
          columns: ["Supplier", "Type", "Consignments", "Head", "Live kg", "Carcass kg", "Dressing %", "Spend $", "$ / carcass kg"],
          numeric: new Set(["Consignments", "Head", "Live kg", "Carcass kg", "Dressing %", "Spend $", "$ / carcass kg"]),
          rows,
          footer: {
            Supplier: "TOTAL",
            Consignments: sum(rows, (r) => Number(r.Consignments)),
            Head: sum(rows, (r) => Number(r.Head)),
            "Carcass kg": +sum(rows, (r) => Number(r["Carcass kg"])).toFixed(1),
            "Spend $": +sum(rows, (r) => Number(r["Spend $"])).toFixed(2),
          },
        };
      }
      case "wastage":
      default: {
        const ws = wastage.filter((w) => inRange(w.date, range));
        const acc = new Map<string, { kg: number; value: number; count: number }>();
        for (const w of ws) {
          const key = `${w.species}||${w.reason}`;
          const cur = acc.get(key) ?? { kg: 0, value: 0, count: 0 };
          cur.kg += w.qtyKg;
          cur.value += w.costValue;
          cur.count += 1;
          acc.set(key, cur);
        }
        const rows = [...acc.entries()]
          .map(([key, v]) => {
            const [species, reason] = key.split("||");
            return {
              Species: species,
              Reason: reason,
              Records: v.count,
              Kilograms: +v.kg.toFixed(1),
              "Value $": +v.value.toFixed(2),
              Avoidable: reason === "Trim" || reason === "Bone" ? "No" : "Yes",
            };
          })
          .sort((a, b) => Number(b.Kilograms) - Number(a.Kilograms));
        return {
          columns: ["Species", "Reason", "Records", "Kilograms", "Value $", "Avoidable"],
          numeric: new Set(["Records", "Kilograms", "Value $"]),
          rows,
          footer: {
            Species: "TOTAL",
            Records: ws.length,
            Kilograms: +waste.totalKg.toFixed(1),
            "Value $": +waste.totalValue.toFixed(2),
          },
        };
      }
    }
  }, [reportId, runs, intakes, orders, lots, products, customers, suppliers, wastage, range, prod, waste]);

  const speciesLegend = SPECIES.map((s) => ({ key: s, label: s, color: SPECIES_COLOR[s] }));

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Build a report over any period and export it for the accountant, the auditor or the client"
        actions={
          <>
            <DateRangeBar preset={preset} range={range} onChange={onChange} />
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={15} /> Print
            </Button>
            <Button
              variant="primary"
              onClick={() => downloadCSV(`${reportId}-${range.from}_${range.to}`, built.rows, built.columns)}
              disabled={!built.rows.length}
            >
              <Download size={15} /> Export CSV
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <Card className="no-print h-fit" padded>
          <CardHeader title="Report type" subtitle="Pick what you need" />
          <ul className="space-y-1">
            {REPORTS.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setReportId(r.id)}
                  className={`w-full rounded-lg px-2.5 py-2 text-left transition-colors ${
                    reportId === r.id ? "bg-brand-soft" : "hover:bg-surface-3"
                  }`}
                >
                  <p className={`text-[13px] font-medium ${reportId === r.id ? "text-brand-ink" : "text-ink"}`}>
                    {r.name}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">{r.blurb}</p>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 sm:hidden">
            <Select value={reportId} onChange={(e) => setReportId(e.target.value as ReportId)}>
              {REPORTS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <div className="min-w-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Head processed" value={num(prod.headProcessed)} sub={`${num(prod.runCount)} runs`} accent="var(--s1)" />
            <StatTile label="Saleable produced" value={compactKg(prod.saleableKg)} sub={`yield ${pct(prod.boningYieldPct)}`} accent="var(--s3)" />
            <StatTile label="Revenue" value={compactMoney(sales.revenue)} sub={`${num(sales.orderCount)} orders`} accent="var(--s5)" />
            <StatTile label="Loss" value={compactKg(waste.totalKg)} sub={money(waste.totalValue)} accent="var(--s2)" upIsGood={false} />
          </div>

          <ChartCard
            title="Output by species over the period"
            subtitle={`${bucket === "day" ? "Daily" : bucket === "week" ? "Weekly" : "Monthly"} saleable kilograms`}
            legend={speciesLegend}
            height={230}
            table={
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-surface">
                  <tr className="border-b border-line text-left text-ink-muted">
                    <th className="py-1.5 font-medium">Period</th>
                    {SPECIES.map((s) => (
                      <th key={s} className="py-1.5 text-right font-medium">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="tabnum">
                  {trend.map((t) => (
                    <tr key={t.key} className="border-b border-line/60">
                      <td className="py-1.5 text-ink-2">{t.label}</td>
                      {SPECIES.map((s) => (
                        <td key={s} className="py-1.5 text-right text-ink-2">
                          {num(Number(t[s]), 0)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          >
            <StackedBars data={trend} keys={speciesLegend} fmt={compactKg} />
          </ChartCard>

          <Card className="print-block">
            <CardHeader
              title={report.name}
              subtitle={`${dateLabel(range.from)} – ${dateLabel(range.to)} · ${built.rows.length} rows · ${settings.tradingName}`}
              right={<Badge tone="brand"><FileBarChart size={11} /> {built.rows.length} rows</Badge>}
            />
            {built.rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-muted">
                Nothing to report for this period. Try a wider date range.
              </p>
            ) : (
              <div className="-mx-4 overflow-x-auto sm:mx-0">
                <table className="w-full min-w-[44rem] text-sm">
                  <thead>
                    <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
                      {built.columns.map((c) => (
                        <th
                          key={c}
                          className={`px-3 py-2 font-semibold ${built.numeric.has(c) ? "text-right" : "text-left"}`}
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {built.rows.slice(0, 200).map((row, i) => (
                      <tr key={i} className="border-b border-line/60">
                        {built.columns.map((c) => (
                          <td
                            key={c}
                            className={`px-3 py-2 ${built.numeric.has(c) ? "text-right tabnum text-ink-2" : "text-left text-ink"}`}
                          >
                            {typeof row[c] === "number" ? num(row[c] as number, Number.isInteger(row[c]) ? 0 : 1) : (row[c] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  {built.footer && (
                    <tfoot>
                      <tr className="border-t border-line-strong bg-surface-2 text-[13px] font-semibold text-ink">
                        {built.columns.map((c) => (
                          <td key={c} className={`px-3 py-2.5 ${built.numeric.has(c) ? "text-right tabnum" : "text-left"}`}>
                            {built.footer![c] === undefined
                              ? ""
                              : typeof built.footer![c] === "number"
                                ? num(built.footer![c] as number, Number.isInteger(built.footer![c]) ? 0 : 1)
                                : built.footer![c]}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  )}
                </table>
                {built.rows.length > 200 && (
                  <p className="mt-3 text-center text-[11px] text-ink-muted">
                    Showing the first 200 rows — export to CSV for the full {num(built.rows.length)}.
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
