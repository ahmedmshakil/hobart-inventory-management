import { bucketKey, bucketsIn, inRange, type Bucket } from "@/lib/dates";
import type {
  DateRange,
  IntakeBatch,
  Order,
  ProcessingRun,
  Product,
  Species,
  StockLot,
  WasteRecord,
} from "@/lib/types";
import { SPECIES } from "@/lib/types";

/* --------------------------- chart palette ---------------------------- *
 * Fixed slot order — assigned by entity, never by rank, never cycled.
 * Validated (see dataviz): adjacent CVD ΔE ≥ 8 in both modes.
 * --------------------------------------------------------------------- */
export const SERIES_VARS = ["--s1", "--s2", "--s3", "--s4", "--s5", "--s6", "--s7", "--s8"] as const;
export const seriesColor = (i: number) => `var(${SERIES_VARS[i % SERIES_VARS.length]})`;

/** Species keep the same hue everywhere in the app. */
export const SPECIES_COLOR: Record<Species, string> = {
  Beef: "var(--s1)",
  Lamb: "var(--s2)",
  Goat: "var(--s3)",
  Pork: "var(--s4)",
  Poultry: "var(--s5)",
};

/* ------------------------------ helpers ------------------------------- */

export const sum = <T,>(arr: T[], f: (x: T) => number) => arr.reduce((a, x) => a + (f(x) || 0), 0);

export const runSaleableKg = (r: ProcessingRun) => sum(r.outputs, (o) => o.qtyKg);

export const orderValue = (o: Order) => sum(o.lines, (l) => l.qtyKg * l.unitPrice);

export const orderKg = (o: Order) => sum(o.lines, (l) => l.qtyKg);

export const REVENUE_STATUSES: Order["status"][] = [
  "Confirmed",
  "Packed",
  "Out for Delivery",
  "Delivered",
];

export function pctChange(now: number, before: number) {
  if (!before) return now ? 100 : 0;
  return ((now - before) / before) * 100;
}

/* --------------------------- production ------------------------------- */

export interface ProductionSummary {
  runCount: number;
  headProcessed: number;
  carcassInKg: number;
  saleableKg: number;
  trimKg: number;
  boneKg: number;
  wasteKg: number;
  labourHours: number;
  /** saleable ÷ carcass in */
  boningYieldPct: number;
}

export function productionSummary(runs: ProcessingRun[], range?: DateRange): ProductionSummary {
  const rs = range ? runs.filter((r) => inRange(r.date, range)) : runs;
  const carcassInKg = sum(rs, (r) => r.carcassInputKg);
  const saleableKg = sum(rs, runSaleableKg);
  return {
    runCount: rs.length,
    headProcessed: sum(rs, (r) => r.headProcessed),
    carcassInKg,
    saleableKg,
    trimKg: sum(rs, (r) => r.trimKg),
    boneKg: sum(rs, (r) => r.boneKg),
    wasteKg: sum(rs, (r) => r.wasteKg),
    labourHours: sum(rs, (r) => r.labourHours),
    boningYieldPct: carcassInKg ? (saleableKg / carcassInKg) * 100 : 0,
  };
}

/* ------------------------ per-species / per-head ----------------------- */

export interface SpeciesYield {
  species: Species;
  batches: number;
  head: number;
  liveKg: number;
  carcassKg: number;
  saleableKg: number;
  /** carcass ÷ live */
  dressingPct: number;
  /** saleable ÷ carcass */
  boningYieldPct: number;
  /** saleable ÷ live */
  totalYieldPct: number;
  liveKgPerHead: number;
  carcassKgPerHead: number;
  saleableKgPerHead: number;
  cost: number;
  costPerSaleableKg: number;
}

export function speciesYield(
  runs: ProcessingRun[],
  intakes: IntakeBatch[],
  range?: DateRange,
): SpeciesYield[] {
  const rs = range ? runs.filter((r) => inRange(r.date, range)) : runs;
  const byId = new Map(intakes.map((i) => [i.id, i]));

  return SPECIES.map((species) => {
    const speciesRuns = rs.filter((r) => r.species === species);
    const batches = new Set(speciesRuns.map((r) => r.intakeBatchId));
    const linked = [...batches].map((id) => byId.get(id)).filter(Boolean) as IntakeBatch[];

    const head = sum(speciesRuns, (r) => r.headProcessed);
    const liveKg = sum(linked, (b) => b.liveWeightKg);
    const carcassKg = sum(speciesRuns, (r) => r.carcassInputKg);
    const saleableKg = sum(speciesRuns, runSaleableKg);
    const cost = sum(linked, (b) => b.cost);

    return {
      species,
      batches: linked.length,
      head,
      liveKg,
      carcassKg,
      saleableKg,
      dressingPct: liveKg ? (carcassKg / liveKg) * 100 : 0,
      boningYieldPct: carcassKg ? (saleableKg / carcassKg) * 100 : 0,
      totalYieldPct: liveKg ? (saleableKg / liveKg) * 100 : 0,
      liveKgPerHead: head ? liveKg / head : 0,
      carcassKgPerHead: head ? carcassKg / head : 0,
      saleableKgPerHead: head ? saleableKg / head : 0,
      cost,
      costPerSaleableKg: saleableKg ? cost / saleableKg : 0,
    };
  });
}

/* --------------------------- cut production --------------------------- */

export interface CutOutput {
  product: Product;
  kg: number;
  pieces: number;
  runs: number;
  value: number;
}

export function cutOutputs(
  runs: ProcessingRun[],
  products: Product[],
  range?: DateRange,
): CutOutput[] {
  const rs = range ? runs.filter((r) => inRange(r.date, range)) : runs;
  const acc = new Map<string, { kg: number; pieces: number; runs: number }>();
  for (const r of rs) {
    for (const o of r.outputs) {
      const cur = acc.get(o.productId) ?? { kg: 0, pieces: 0, runs: 0 };
      cur.kg += o.qtyKg;
      cur.pieces += o.pieces;
      cur.runs += 1;
      acc.set(o.productId, cur);
    }
  }
  return products
    .map((product) => {
      const a = acc.get(product.id) ?? { kg: 0, pieces: 0, runs: 0 };
      return { product, kg: a.kg, pieces: a.pieces, runs: a.runs, value: a.kg * product.pricePerKg };
    })
    .filter((c) => c.kg > 0)
    .sort((a, b) => b.kg - a.kg);
}

/* ------------------------------ inventory ----------------------------- */

export interface StockRow {
  product: Product;
  kg: number;
  pieces: number;
  lots: number;
  value: number;
  oldestDate: string | null;
  nearestExpiry: string | null;
  belowReorder: boolean;
}

export const LIVE_LOT_STATUSES: StockLot["status"][] = ["In Stock", "Reserved"];

export function stockRows(lots: StockLot[], products: Product[]): StockRow[] {
  const live = lots.filter((l) => LIVE_LOT_STATUSES.includes(l.status) && l.qtyKg > 0);
  const acc = new Map<string, StockLot[]>();
  for (const l of live) {
    const arr = acc.get(l.productId) ?? [];
    arr.push(l);
    acc.set(l.productId, arr);
  }
  return products
    .map((product) => {
      const ls = acc.get(product.id) ?? [];
      const kg = sum(ls, (l) => l.qtyKg);
      return {
        product,
        kg,
        pieces: sum(ls, (l) => l.pieces),
        lots: ls.length,
        value: kg * product.pricePerKg,
        oldestDate: ls.length ? ls.map((l) => l.producedDate).sort()[0] : null,
        nearestExpiry: ls.length ? ls.map((l) => l.expiryDate).sort()[0] : null,
        belowReorder: kg < product.reorderLevelKg,
      };
    })
    .sort((a, b) => b.kg - a.kg);
}

export function expiringLots(lots: StockLot[], withinDays: number, todayIso: string) {
  const limit = new Date(`${todayIso}T00:00:00`);
  limit.setDate(limit.getDate() + withinDays);
  const limitIso = limit.toISOString().slice(0, 10);
  return lots
    .filter((l) => LIVE_LOT_STATUSES.includes(l.status) && l.qtyKg > 0 && l.expiryDate <= limitIso)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
}

/* -------------------------------- sales ------------------------------- */

export interface SalesSummary {
  orderCount: number;
  revenue: number;
  kg: number;
  avgOrderValue: number;
  delivered: number;
  open: number;
  cancelled: number;
}

export function salesSummary(orders: Order[], range?: DateRange): SalesSummary {
  const os = range ? orders.filter((o) => inRange(o.orderDate, range)) : orders;
  const billable = os.filter((o) => REVENUE_STATUSES.includes(o.status));
  const revenue = sum(billable, orderValue);
  return {
    orderCount: os.length,
    revenue,
    kg: sum(billable, orderKg),
    avgOrderValue: billable.length ? revenue / billable.length : 0,
    delivered: os.filter((o) => o.status === "Delivered").length,
    open: os.filter((o) => o.status !== "Delivered" && o.status !== "Cancelled").length,
    cancelled: os.filter((o) => o.status === "Cancelled").length,
  };
}

export function topCustomers(orders: Order[], range: DateRange, limit = 6) {
  const os = orders.filter((o) => inRange(o.orderDate, range) && REVENUE_STATUSES.includes(o.status));
  const acc = new Map<string, { revenue: number; kg: number; orders: number }>();
  for (const o of os) {
    const cur = acc.get(o.customerId) ?? { revenue: 0, kg: 0, orders: 0 };
    cur.revenue += orderValue(o);
    cur.kg += orderKg(o);
    cur.orders += 1;
    acc.set(o.customerId, cur);
  }
  return [...acc.entries()]
    .map(([customerId, v]) => ({ customerId, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function topProducts(orders: Order[], products: Product[], range: DateRange, limit = 8) {
  const os = orders.filter((o) => inRange(o.orderDate, range) && REVENUE_STATUSES.includes(o.status));
  const acc = new Map<string, { kg: number; pieces: number; revenue: number }>();
  for (const o of os) {
    for (const l of o.lines) {
      const cur = acc.get(l.productId) ?? { kg: 0, pieces: 0, revenue: 0 };
      cur.kg += l.qtyKg;
      cur.pieces += l.pieces;
      cur.revenue += l.qtyKg * l.unitPrice;
      acc.set(l.productId, cur);
    }
  }
  const byId = new Map(products.map((p) => [p.id, p]));
  return [...acc.entries()]
    .map(([productId, v]) => ({ product: byId.get(productId), ...v }))
    .filter((x) => x.product)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit) as { product: Product; kg: number; pieces: number; revenue: number }[];
}

/* ------------------------------- wastage ------------------------------ */

export function wastageSummary(records: WasteRecord[], range?: DateRange) {
  const ws = range ? records.filter((w) => inRange(w.date, range)) : records;
  const byReason = new Map<string, { kg: number; value: number; count: number }>();
  for (const w of ws) {
    const cur = byReason.get(w.reason) ?? { kg: 0, value: 0, count: 0 };
    cur.kg += w.qtyKg;
    cur.value += w.costValue;
    cur.count += 1;
    byReason.set(w.reason, cur);
  }
  const avoidable = ws.filter((w) => w.reason !== "Trim" && w.reason !== "Bone");
  return {
    totalKg: sum(ws, (w) => w.qtyKg),
    totalValue: sum(ws, (w) => w.costValue),
    avoidableKg: sum(avoidable, (w) => w.qtyKg),
    avoidableValue: sum(avoidable, (w) => w.costValue),
    count: ws.length,
    byReason: [...byReason.entries()]
      .map(([reason, v]) => ({ reason, ...v }))
      .sort((a, b) => b.kg - a.kg),
  };
}

/* ---------------------------- time series ----------------------------- */

export interface TrendPoint {
  key: string;
  label: string;
  carcassKg: number;
  saleableKg: number;
  head: number;
  revenue: number;
  orders: number;
  wasteKg: number;
  [species: string]: number | string;
}

export function trendSeries(
  range: DateRange,
  bucket: Bucket,
  runs: ProcessingRun[],
  orders: Order[],
  wastage: WasteRecord[],
  labelFn: (key: string) => string,
): TrendPoint[] {
  const keys = bucketsIn(range, bucket);
  const base = new Map<string, TrendPoint>();
  for (const k of keys) {
    const point: TrendPoint = {
      key: k,
      label: labelFn(k),
      carcassKg: 0,
      saleableKg: 0,
      head: 0,
      revenue: 0,
      orders: 0,
      wasteKg: 0,
    };
    for (const s of SPECIES) point[s] = 0;
    base.set(k, point);
  }

  for (const r of runs) {
    if (!inRange(r.date, range)) continue;
    const p = base.get(bucketKey(r.date, bucket));
    if (!p) continue;
    p.carcassKg += r.carcassInputKg;
    p.saleableKg += runSaleableKg(r);
    p.head += r.headProcessed;
    p[r.species] = (p[r.species] as number) + runSaleableKg(r);
  }
  for (const o of orders) {
    if (!inRange(o.orderDate, range)) continue;
    const p = base.get(bucketKey(o.orderDate, bucket));
    if (!p) continue;
    p.orders += 1;
    if (REVENUE_STATUSES.includes(o.status)) p.revenue += orderValue(o);
  }
  for (const w of wastage) {
    if (!inRange(w.date, range)) continue;
    const p = base.get(bucketKey(w.date, bucket));
    if (!p) continue;
    p.wasteKg += w.qtyKg;
  }

  return keys.map((k) => {
    const p = base.get(k)!;
    return {
      ...p,
      carcassKg: Number(p.carcassKg.toFixed(1)),
      saleableKg: Number(p.saleableKg.toFixed(1)),
      revenue: Number(p.revenue.toFixed(0)),
      wasteKg: Number(p.wasteKg.toFixed(1)),
    };
  });
}

export type { Bucket };
