"use client";

import {
  Beef,
  Boxes,
  DollarSign,
  Percent,
  Printer,
  Scale,
  TrendingUp,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { AreaTrend, ChartCard, MultiLine, RankedBars, StackedBars } from "@/components/charts";
import { DateRangeBar } from "@/components/ui/DateRangeBar";
import { StatTile } from "@/components/ui/StatTile";
import { Badge, Button, Card, CardHeader, PageHeader, Segmented } from "@/components/ui/primitives";
import {
  SPECIES_COLOR,
  cutOutputs,
  expiringLots,
  pctChange,
  productionSummary,
  salesSummary,
  speciesYield,
  stockRows,
  topCustomers,
  topProducts,
  trendSeries,
  wastageSummary,
} from "@/lib/analytics";
import { autoBucket, bucketLabel, previousRange, todayISO, type Bucket } from "@/lib/dates";
import { compactKg, compactMoney, kg, money, num, pct, shortDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useRange } from "@/lib/useRange";
import { SPECIES, SPECIES_ANIMAL } from "@/lib/types";

export default function DashboardPage() {
  const { preset, range, onChange } = useRange("last30");
  const [bucketMode, setBucketMode] = useState<"auto" | Bucket>("auto");
  const [cutView, setCutView] = useState<"produced" | "stock">("produced");

  const runs = useStore((s) => s.runs);
  const intakes = useStore((s) => s.intakes);
  const orders = useStore((s) => s.orders);
  const lots = useStore((s) => s.lots);
  const products = useStore((s) => s.products);
  const customers = useStore((s) => s.customers);
  const wastage = useStore((s) => s.wastage);
  const settings = useStore((s) => s.settings);

  const bucket: Bucket = bucketMode === "auto" ? autoBucket(range) : bucketMode;
  const prev = useMemo(() => previousRange(range), [range]);

  const prod = useMemo(() => productionSummary(runs, range), [runs, range]);
  const prodPrev = useMemo(() => productionSummary(runs, prev), [runs, prev]);
  const sales = useMemo(() => salesSummary(orders, range), [orders, range]);
  const salesPrev = useMemo(() => salesSummary(orders, prev), [orders, prev]);
  const waste = useMemo(() => wastageSummary(wastage, range), [wastage, range]);
  const wastePrev = useMemo(() => wastageSummary(wastage, prev), [wastage, prev]);
  const yields = useMemo(() => speciesYield(runs, intakes, range), [runs, intakes, range]);
  const cuts = useMemo(() => cutOutputs(runs, products, range), [runs, products, range]);
  const stock = useMemo(() => stockRows(lots, products), [lots, products]);
  const trend = useMemo(
    () => trendSeries(range, bucket, runs, orders, wastage, (k) => bucketLabel(k, bucket)),
    [range, bucket, runs, orders, wastage],
  );
  const bestCustomers = useMemo(() => topCustomers(orders, range, 6), [orders, range]);
  const bestProducts = useMemo(() => topProducts(orders, products, range, 7), [orders, products, range]);

  const today = todayISO();
  const lowStock = stock.filter((r) => r.belowReorder);
  const expiring = useMemo(
    () => expiringLots(lots, settings.expiryWarningDays, today),
    [lots, settings.expiryWarningDays, today],
  );
  const stockValue = stock.reduce((a, r) => a + r.value, 0);
  const stockKg = stock.reduce((a, r) => a + r.kg, 0);

  const speciesLegend = SPECIES.map((s) => ({ key: s, label: s, color: SPECIES_COLOR[s] }));
  const headByType = SPECIES.map((s) => {
    const y = yields.find((x) => x.species === s)!;
    return { name: SPECIES_ANIMAL[s], value: y.head, color: SPECIES_COLOR[s] };
  });
  const totalHead = prod.headProcessed;

  const cutRows = (cutView === "produced"
    ? cuts.slice(0, 9).map((c) => ({
        id: c.product.id,
        label: c.product.name,
        sub: c.product.unit === "piece" ? `${num(c.pieces)} pcs` : undefined,
        value: c.kg,
        color: SPECIES_COLOR[c.product.species],
      }))
    : stock
        .filter((r) => r.kg > 0)
        .slice(0, 9)
        .map((r) => ({
          id: r.product.id,
          label: r.product.name,
          sub: r.product.unit === "piece" ? `${num(r.pieces)} pcs` : undefined,
          value: r.kg,
          color: SPECIES_COLOR[r.product.species],
        })));

  return (
    <>
      <PageHeader
        title="Operations Dashboard"
        subtitle={`${settings.tradingName} · Moonah, Tasmania`}
        actions={
          <>
            <Segmented<"auto" | Bucket>
              value={bucketMode}
              onChange={setBucketMode}
              options={[
                { value: "auto", label: "Auto" },
                { value: "day", label: "Daily" },
                { value: "week", label: "Weekly" },
                { value: "month", label: "Monthly" },
              ]}
            />
            <DateRangeBar preset={preset} range={range} onChange={onChange} />
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={15} /> Print
            </Button>
          </>
        }
      />

      {/* ------------------------------ KPIs ------------------------------ */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile
          label="Animals processed"
          value={num(prod.headProcessed)}
          sub={`${num(prod.runCount)} runs`}
          icon={<Beef size={16} />}
          deltaPct={pctChange(prod.headProcessed, prodPrev.headProcessed)}
          deltaLabel="vs prev period"
          accent="var(--s1)"
        />
        <StatTile
          label="Carcass processed"
          value={compactKg(prod.carcassInKg)}
          sub={kg(prod.carcassInKg, 0)}
          icon={<Scale size={16} />}
          deltaPct={pctChange(prod.carcassInKg, prodPrev.carcassInKg)}
          deltaLabel="vs prev period"
          accent="var(--s2)"
        />
        <StatTile
          label="Saleable meat produced"
          value={compactKg(prod.saleableKg)}
          sub={kg(prod.saleableKg, 0)}
          icon={<Boxes size={16} />}
          deltaPct={pctChange(prod.saleableKg, prodPrev.saleableKg)}
          deltaLabel="vs prev period"
          accent="var(--s3)"
        />
        <StatTile
          label="Boning yield"
          value={pct(prod.boningYieldPct)}
          sub="saleable ÷ carcass"
          icon={<Percent size={16} />}
          deltaPct={pctChange(prod.boningYieldPct, prodPrev.boningYieldPct)}
          deltaLabel="vs prev period"
          accent="var(--s4)"
        />
        <StatTile
          label="Sales revenue"
          value={compactMoney(sales.revenue)}
          sub={`${num(sales.orderCount)} orders`}
          icon={<DollarSign size={16} />}
          deltaPct={pctChange(sales.revenue, salesPrev.revenue)}
          deltaLabel="vs prev period"
          accent="var(--s5)"
        />
      </div>

      {/* -------------------------- trend + donut -------------------------- */}
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartCard
            title="Saleable output by species"
            subtitle={`Boning-room production, ${bucket === "day" ? "daily" : bucket === "week" ? "weekly" : "monthly"} buckets`}
            legend={speciesLegend}
            height={300}
            table={
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-surface">
                  <tr className="border-b border-line text-left text-ink-muted">
                    <th className="py-1.5 pr-2 font-medium">Period</th>
                    {SPECIES.map((s) => (
                      <th key={s} className="py-1.5 pr-2 text-right font-medium">
                        {s}
                      </th>
                    ))}
                    <th className="py-1.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="tabnum">
                  {trend.map((t) => (
                    <tr key={t.key} className="border-b border-line/60">
                      <td className="py-1.5 pr-2 text-ink-2">{t.label}</td>
                      {SPECIES.map((s) => (
                        <td key={s} className="py-1.5 pr-2 text-right text-ink-2">
                          {num(Number(t[s]), 0)}
                        </td>
                      ))}
                      <td className="py-1.5 text-right font-medium text-ink">{num(t.saleableKg, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          >
            <StackedBars data={trend} keys={speciesLegend} fmt={compactKg} />
          </ChartCard>
        </div>

        <Card>
          <CardHeader title="Animals processed" subtitle="Head count by species in this period" />
          <div className="mb-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[30px] font-semibold leading-none tracking-[-0.025em] text-ink">
              {num(totalHead)}
            </span>
            <span className="text-[11px] text-ink-muted">
              head total · {num(prod.runCount)} processing runs
            </span>
          </div>
          <RankedBars
            rows={headByType.map((h) => ({
              id: h.name,
              label: h.name,
              sub: totalHead ? pct((h.value / totalHead) * 100, 1) : "—",
              value: h.value,
              color: h.color,
            }))}
            fmt={(v) => `${num(v)} head`}
          />
          <p className="mt-4 border-t border-line pt-3 text-[11px] text-ink-muted">
            Carcass weight in: <span className="font-medium text-ink-2">{kg(prod.carcassInKg, 0)}</span> ·
            average {num(prod.headProcessed ? prod.carcassInKg / prod.headProcessed : 0, 1)} kg per head
          </p>
        </Card>
      </div>

      {/* ---------------------- per-animal yield analysis ------------------- */}
      <Card className="mt-4 print-block">
        <CardHeader
          title="Yield analysis per animal"
          subtitle="How much saleable meat each head actually produced in this period"
          right={
            <Link href="/reports" className="text-[12px] font-medium text-brand-ink hover:underline">
              Open in reports →
            </Link>
          }
        />
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
                <th className="px-3 py-2 text-left font-semibold">Species</th>
                <th className="px-3 py-2 text-right font-semibold">Head</th>
                <th className="px-3 py-2 text-right font-semibold">Live kg / head</th>
                <th className="px-3 py-2 text-right font-semibold">Carcass kg / head</th>
                <th className="px-3 py-2 text-right font-semibold">Saleable kg / head</th>
                <th className="px-3 py-2 text-right font-semibold">Dressing %</th>
                <th className="px-3 py-2 text-right font-semibold">Boning yield %</th>
                <th className="px-3 py-2 text-right font-semibold">Cost / saleable kg</th>
              </tr>
            </thead>
            <tbody>
              {yields.map((y) => (
                <tr key={y.species} className="border-b border-line/70 last:border-0">
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-2 font-medium text-ink">
                      <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: SPECIES_COLOR[y.species] }} />
                      {y.species}
                      <span className="text-[11px] font-normal text-ink-muted">
                        ({SPECIES_ANIMAL[y.species]})
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabnum text-ink-2">{num(y.head)}</td>
                  <td className="px-3 py-2.5 text-right tabnum text-ink-2">{num(y.liveKgPerHead, 1)}</td>
                  <td className="px-3 py-2.5 text-right tabnum text-ink-2">{num(y.carcassKgPerHead, 1)}</td>
                  <td className="px-3 py-2.5 text-right tabnum font-semibold text-ink">
                    {num(y.saleableKgPerHead, 1)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabnum text-ink-2">{pct(y.dressingPct)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Badge tone={y.boningYieldPct >= 70 ? "good" : y.boningYieldPct >= 60 ? "warning" : "neutral"}>
                      {pct(y.boningYieldPct)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right tabnum text-ink-2">
                    {y.costPerSaleableKg ? money(y.costPerSaleableKg, true) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line-strong bg-surface-2 text-[13px] font-semibold text-ink">
                <td className="px-3 py-2.5">All species</td>
                <td className="px-3 py-2.5 text-right tabnum">{num(prod.headProcessed)}</td>
                <td className="px-3 py-2.5 text-right tabnum text-ink-muted">—</td>
                <td className="px-3 py-2.5 text-right tabnum">
                  {num(prod.headProcessed ? prod.carcassInKg / prod.headProcessed : 0, 1)}
                </td>
                <td className="px-3 py-2.5 text-right tabnum">
                  {num(prod.headProcessed ? prod.saleableKg / prod.headProcessed : 0, 1)}
                </td>
                <td className="px-3 py-2.5 text-right tabnum text-ink-muted">—</td>
                <td className="px-3 py-2.5 text-right tabnum">{pct(prod.boningYieldPct)}</td>
                <td className="px-3 py-2.5 text-right tabnum text-ink-muted">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* --------------------------- cuts + sales -------------------------- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={cutView === "produced" ? "Cuts produced this period" : "Cuts currently in stock"}
            subtitle={
              cutView === "produced"
                ? `${num(cuts.length)} distinct cuts · ${kg(prod.saleableKg, 0)} total`
                : `${num(stock.filter((s) => s.kg > 0).length)} lines on hand · ${kg(stockKg, 0)}`
            }
            right={
              <Segmented
                size="sm"
                value={cutView}
                onChange={setCutView}
                options={[
                  { value: "produced", label: "Produced" },
                  { value: "stock", label: "In stock" },
                ]}
              />
            }
          />
          <RankedBars rows={cutRows} fmt={(v) => kg(v, 0)} />
          <Link
            href="/inventory"
            className="mt-4 inline-block text-[12px] font-medium text-brand-ink hover:underline"
          >
            View full cut-level inventory →
          </Link>
        </Card>

        <ChartCard
          title="Revenue & order volume"
          subtitle="Confirmed and delivered orders"
          height={276}
          legend={[{ key: "revenue", label: "Revenue (AUD)", color: "var(--s1)" }]}
          table={
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-line text-left text-ink-muted">
                  <th className="py-1.5 font-medium">Period</th>
                  <th className="py-1.5 text-right font-medium">Orders</th>
                  <th className="py-1.5 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="tabnum">
                {trend.map((t) => (
                  <tr key={t.key} className="border-b border-line/60">
                    <td className="py-1.5 text-ink-2">{t.label}</td>
                    <td className="py-1.5 text-right text-ink-2">{num(t.orders)}</td>
                    <td className="py-1.5 text-right font-medium text-ink">{money(t.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <AreaTrend data={trend} dataKey="revenue" name="Revenue" color="var(--s1)" fmt={compactMoney} />
        </ChartCard>
      </div>

      {/* ----------------------- customers / waste ------------------------ */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Top wholesale accounts" subtitle="By revenue in the selected period" />
          <RankedBars
            rows={bestCustomers.map((c) => {
              const cust = customers.find((x) => x.id === c.customerId);
              return {
                id: c.customerId,
                label: cust?.name ?? "Unknown",
                sub: `${num(c.orders)} ord`,
                value: c.revenue,
              };
            })}
            fmt={(v) => money(v)}
          />
        </Card>

        <Card>
          <CardHeader title="Best selling cuts" subtitle="By revenue in the selected period" />
          <RankedBars
            rows={bestProducts.map((p) => ({
              id: p.product.id,
              label: p.product.name,
              sub: p.product.unit === "piece" ? `${num(p.pieces)} pcs` : `${num(p.kg, 0)} kg`,
              value: p.revenue,
              color: SPECIES_COLOR[p.product.species],
            }))}
            fmt={(v) => money(v)}
          />
        </Card>

        <ChartCard
          title="Yield loss & wastage"
          subtitle={`${kg(waste.totalKg, 0)} total · ${kg(waste.avoidableKg, 0)} avoidable`}
          height={220}
          legend={[{ key: "wasteKg", label: "Trim, bone & waste (kg)", color: "var(--s2)" }]}
          table={
            <table className="w-full text-[12px]">
              <tbody className="tabnum">
                {waste.byReason.map((r) => (
                  <tr key={r.reason} className="border-b border-line/60">
                    <td className="py-1.5 text-ink-2">{r.reason}</td>
                    <td className="py-1.5 text-right text-ink-2">{num(r.kg, 0)} kg</td>
                    <td className="py-1.5 text-right font-medium text-ink">{money(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
          right={
            <span className="text-[11px] tabnum text-ink-muted">
              {pct(prod.carcassInKg ? (waste.totalKg / prod.carcassInKg) * 100 : 0)} of carcass
            </span>
          }
        >
          <MultiLine
            data={trend}
            keys={[{ key: "wasteKg", label: "Waste (kg)", color: "var(--s2)" }]}
            fmt={compactKg}
          />
        </ChartCard>
      </div>

      {/* ------------------------------ alerts ---------------------------- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <StatTile
          label="Stock on hand"
          value={compactKg(stockKg)}
          sub={`${money(stockValue)} at list price`}
          icon={<Boxes size={16} />}
        />
        <StatTile
          label="Avoidable wastage"
          value={compactKg(waste.avoidableKg)}
          sub={money(waste.avoidableValue)}
          icon={<Trash2 size={16} />}
          upIsGood={false}
          deltaPct={pctChange(waste.avoidableKg, wastePrev.avoidableKg)}
          deltaLabel="vs prev period"
        />
        <StatTile
          label="Avg order value"
          value={money(sales.avgOrderValue)}
          sub={`${num(sales.open)} orders still open`}
          icon={<TrendingUp size={16} />}
          deltaPct={pctChange(sales.avgOrderValue, salesPrev.avgOrderValue)}
          deltaLabel="vs prev period"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Low stock — below re-order level"
            subtitle={`${lowStock.length} product lines`}
            right={
              <Link href="/inventory" className="text-[12px] font-medium text-brand-ink hover:underline">
                Inventory →
              </Link>
            }
          />
          {lowStock.length === 0 ? (
            <p className="py-6 text-center text-xs text-ink-muted">
              Every line is above its re-order level.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {lowStock.slice(0, 6).map((r) => (
                <li key={r.product.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink">{r.product.name}</p>
                    <p className="text-[11px] text-ink-muted">
                      {r.product.sku} · re-order at {r.product.reorderLevelKg} kg
                    </p>
                  </div>
                  <Badge tone={r.kg === 0 ? "critical" : "warning"}>
                    <TriangleAlert size={11} />
                    {kg(r.kg, 1)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Expiring soon"
            subtitle={`Within ${settings.expiryWarningDays} days · ${expiring.length} lots`}
          />
          {expiring.length === 0 ? (
            <p className="py-6 text-center text-xs text-ink-muted">No lots nearing their use-by date.</p>
          ) : (
            <ul className="divide-y divide-line">
              {expiring.slice(0, 6).map((l) => {
                const p = products.find((x) => x.id === l.productId);
                return (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">{p?.name ?? "—"}</p>
                      <p className="truncate text-[11px] text-ink-muted">
                        {l.lotCode} · {kg(l.qtyKg)}
                      </p>
                    </div>
                    <Badge tone={l.expiryDate <= today ? "critical" : "warning"}>
                      {shortDate(l.expiryDate)}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
