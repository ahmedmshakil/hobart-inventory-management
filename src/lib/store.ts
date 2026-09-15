"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { COLD_ROOMS, DEFAULT_SETTINGS, PRODUCTS } from "@/data/catalog";
/* --- Demo data. Delete this import + `seedState()` body to ship empty. --- */
import { DEMO_DATA_ENABLED, demoSeed } from "@/data/demo-seed";

import { addDays, todayISO } from "@/lib/dates";
import type {
  ColdRoom,
  CompanySettings,
  Customer,
  IntakeBatch,
  Order,
  OrderStatus,
  ProcessingRun,
  Product,
  StockLot,
  Supplier,
  WasteRecord,
} from "@/lib/types";

export const STORAGE_KEY = "hpm-inventory-v1";

interface DataShape {
  products: Product[];
  suppliers: Supplier[];
  customers: Customer[];
  coldRooms: ColdRoom[];
  intakes: IntakeBatch[];
  runs: ProcessingRun[];
  lots: StockLot[];
  orders: Order[];
  wastage: WasteRecord[];
  settings: CompanySettings;
}

function emptyState(): DataShape {
  return {
    products: PRODUCTS,
    suppliers: [],
    customers: [],
    coldRooms: COLD_ROOMS,
    intakes: [],
    runs: [],
    lots: [],
    orders: [],
    wastage: [],
    settings: DEFAULT_SETTINGS,
  };
}

function seedState(): DataShape {
  if (!DEMO_DATA_ENABLED) return emptyState();
  const s = demoSeed();
  return { ...emptyState(), ...s, settings: DEFAULT_SETTINGS };
}

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

interface Actions {
  hydrated: boolean;
  setHydrated: (v: boolean) => void;

  /* master data */
  upsertProduct: (p: Product) => void;
  removeProduct: (id: string) => void;
  upsertSupplier: (s: Supplier) => void;
  removeSupplier: (id: string) => void;
  upsertCustomer: (c: Customer) => void;
  removeCustomer: (id: string) => void;
  upsertColdRoom: (c: ColdRoom) => void;
  removeColdRoom: (id: string) => void;

  /* operations */
  upsertIntake: (b: IntakeBatch) => void;
  removeIntake: (id: string) => void;
  upsertRun: (r: ProcessingRun, createLots?: boolean) => void;
  removeRun: (id: string) => void;
  upsertLot: (l: StockLot) => void;
  removeLot: (id: string) => void;
  adjustLot: (id: string, deltaKg: number) => void;
  upsertOrder: (o: Order) => void;
  removeOrder: (id: string) => void;
  setOrderStatus: (id: string, status: OrderStatus) => void;
  upsertWaste: (w: WasteRecord) => void;
  removeWaste: (id: string) => void;

  /* system */
  updateSettings: (s: Partial<CompanySettings>) => void;
  resetDemoData: () => void;
  clearAllData: () => void;
  importData: (d: Partial<DataShape>) => void;
  newId: (prefix: string) => string;
}

export type Store = DataShape & Actions;

/** FIFO withdrawal across in-stock lots of a product. */
function withdraw(lots: StockLot[], productId: string, qtyKg: number): StockLot[] {
  let left = qtyKg;
  const sorted = [...lots].sort((a, b) => a.producedDate.localeCompare(b.producedDate));
  return sorted.map((l) => {
    if (left <= 0 || l.productId !== productId) return l;
    if (l.status !== "In Stock" && l.status !== "Reserved") return l;
    const take = Math.min(l.qtyKg, left);
    left -= take;
    const remaining = Number((l.qtyKg - take).toFixed(2));
    return {
      ...l,
      qtyKg: remaining,
      pieces: l.pieces ? Math.max(0, Math.round((l.pieces * remaining) / (l.qtyKg || 1))) : 0,
      status: remaining <= 0.01 ? ("Sold" as const) : l.status,
    };
  });
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...seedState(),
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),
      newId: uid,

      upsertProduct: (p) =>
        set((s) => ({
          products: s.products.some((x) => x.id === p.id)
            ? s.products.map((x) => (x.id === p.id ? p : x))
            : [...s.products, p],
        })),
      removeProduct: (id) => set((s) => ({ products: s.products.filter((x) => x.id !== id) })),

      upsertSupplier: (v) =>
        set((s) => ({
          suppliers: s.suppliers.some((x) => x.id === v.id)
            ? s.suppliers.map((x) => (x.id === v.id ? v : x))
            : [v, ...s.suppliers],
        })),
      removeSupplier: (id) => set((s) => ({ suppliers: s.suppliers.filter((x) => x.id !== id) })),

      upsertCustomer: (v) =>
        set((s) => ({
          customers: s.customers.some((x) => x.id === v.id)
            ? s.customers.map((x) => (x.id === v.id ? v : x))
            : [v, ...s.customers],
        })),
      removeCustomer: (id) => set((s) => ({ customers: s.customers.filter((x) => x.id !== id) })),

      upsertColdRoom: (v) =>
        set((s) => ({
          coldRooms: s.coldRooms.some((x) => x.id === v.id)
            ? s.coldRooms.map((x) => (x.id === v.id ? v : x))
            : [...s.coldRooms, v],
        })),
      removeColdRoom: (id) => set((s) => ({ coldRooms: s.coldRooms.filter((x) => x.id !== id) })),

      upsertIntake: (v) =>
        set((s) => ({
          intakes: s.intakes.some((x) => x.id === v.id)
            ? s.intakes.map((x) => (x.id === v.id ? v : x))
            : [v, ...s.intakes],
        })),
      removeIntake: (id) => set((s) => ({ intakes: s.intakes.filter((x) => x.id !== id) })),

      upsertRun: (r, createLots = false) =>
        set((s) => {
          const exists = s.runs.some((x) => x.id === r.id);
          const runs = exists ? s.runs.map((x) => (x.id === r.id ? r : x)) : [r, ...s.runs];
          let lots = s.lots;
          if (createLots && !exists) {
            const made: StockLot[] = [];
            r.outputs.forEach((o, i) => {
              if (o.qtyKg <= 0) return;
              const product = s.products.find((p) => p.id === o.productId);
              if (!product) return;
              made.push({
                id: uid("lot"),
                lotCode: `L${r.date.replace(/-/g, "").slice(2)}-${product.sku}-${String(i + 1).padStart(3, "0")}`,
                productId: product.id,
                runId: r.id,
                coldRoomId: s.coldRooms[1]?.id ?? s.coldRooms[0]?.id ?? "cr-2",
                qtyKg: o.qtyKg,
                pieces: o.pieces,
                producedDate: r.date,
                expiryDate: addDays(r.date, product.shelfLifeDays),
                status: "In Stock",
              });
            });
            lots = [...made, ...s.lots];
          }
          // mark the source batch processed
          const intakes = s.intakes.map((b) =>
            b.id === r.intakeBatchId ? { ...b, status: "Processed" as const } : b,
          );
          return { runs, lots, intakes };
        }),
      removeRun: (id) =>
        set((s) => ({ runs: s.runs.filter((x) => x.id !== id), lots: s.lots.filter((l) => l.runId !== id) })),

      upsertLot: (v) =>
        set((s) => ({
          lots: s.lots.some((x) => x.id === v.id)
            ? s.lots.map((x) => (x.id === v.id ? v : x))
            : [v, ...s.lots],
        })),
      removeLot: (id) => set((s) => ({ lots: s.lots.filter((x) => x.id !== id) })),
      adjustLot: (id, deltaKg) =>
        set((s) => ({
          lots: s.lots.map((l) => {
            if (l.id !== id) return l;
            const q = Math.max(0, Number((l.qtyKg + deltaKg).toFixed(2)));
            const product = s.products.find((p) => p.id === l.productId);
            return {
              ...l,
              qtyKg: q,
              pieces: product && product.unit === "piece" ? Math.round(q / product.avgPieceKg) : l.pieces,
              status: q <= 0.01 ? ("Sold" as const) : l.status,
            };
          }),
        })),

      upsertOrder: (v) =>
        set((s) => ({
          orders: s.orders.some((x) => x.id === v.id)
            ? s.orders.map((x) => (x.id === v.id ? v : x))
            : [v, ...s.orders],
        })),
      removeOrder: (id) => set((s) => ({ orders: s.orders.filter((x) => x.id !== id) })),

      setOrderStatus: (id, status) =>
        set((s) => {
          const order = s.orders.find((o) => o.id === id);
          if (!order) return {};
          const shouldDeduct =
            !order.stockApplied &&
            (status === "Packed" || status === "Out for Delivery" || status === "Delivered");
          let lots = s.lots;
          if (shouldDeduct) {
            for (const line of order.lines) lots = withdraw(lots, line.productId, line.qtyKg);
          }
          return {
            lots,
            orders: s.orders.map((o) =>
              o.id === id ? { ...o, status, stockApplied: o.stockApplied || shouldDeduct } : o,
            ),
          };
        }),

      upsertWaste: (v) =>
        set((s) => ({
          wastage: s.wastage.some((x) => x.id === v.id)
            ? s.wastage.map((x) => (x.id === v.id ? v : x))
            : [v, ...s.wastage],
        })),
      removeWaste: (id) => set((s) => ({ wastage: s.wastage.filter((x) => x.id !== id) })),

      updateSettings: (v) => set((s) => ({ settings: { ...s.settings, ...v } })),

      resetDemoData: () => set({ ...seedState() }),
      clearAllData: () => set({ ...emptyState() }),
      importData: (d) => set((s) => ({ ...s, ...d })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        const { hydrated: _h, ...rest } = s;
        void _h;
        return rest as DataShape;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

/** Convenience lookups. */
export const useProduct = (id: string | null | undefined) =>
  useStore((s) => (id ? s.products.find((p) => p.id === id) : undefined));

export function productMap(products: Product[]) {
  return new Map(products.map((p) => [p.id, p]));
}

export const freshTodayISO = todayISO;
