/* ------------------------------------------------------------------ *
 * Master catalogue — cut list, cold rooms, yield profiles, defaults.
 *
 * This is CONFIGURATION, not demo data. It is what a real butchery
 * would keep. Demo transactions live in `src/data/demo-seed.ts`.
 * ------------------------------------------------------------------ */

import type { ColdRoom, CompanySettings, Product, Species } from "@/lib/types";

type ProductSeed = Omit<Product, "id" | "active"> & { yieldPct: number };

/**
 * `yieldPct` = share of carcass weight this cut represents.
 * Per species the cuts + trim + bone + waste add up to 100%.
 */
const RAW_PRODUCTS: ProductSeed[] = [
  /* ------------------------------- BEEF ------------------------------- */
  { sku: "BF-EYE", name: "Eye Fillet", species: "Beef", category: "Steak Cut", unit: "piece", avgPieceKg: 0.22, pricePerKg: 62, costPerKg: 38.5, reorderLevelKg: 25, shelfLifeDays: 12, yieldPct: 2 },
  { sku: "BF-SCO", name: "Scotch Fillet", species: "Beef", category: "Steak Cut", unit: "piece", avgPieceKg: 0.3, pricePerKg: 48, costPerKg: 29.8, reorderLevelKg: 40, shelfLifeDays: 14, yieldPct: 4 },
  { sku: "BF-POR", name: "Porterhouse / Sirloin", species: "Beef", category: "Steak Cut", unit: "piece", avgPieceKg: 0.3, pricePerKg: 42, costPerKg: 26, reorderLevelKg: 45, shelfLifeDays: 14, yieldPct: 5 },
  { sku: "BF-TBO", name: "T-Bone Steak", species: "Beef", category: "Steak Cut", unit: "piece", avgPieceKg: 0.45, pricePerKg: 34, costPerKg: 21.1, reorderLevelKg: 30, shelfLifeDays: 12, yieldPct: 3 },
  { sku: "BF-RIB", name: "Rib Eye on Bone", species: "Beef", category: "Steak Cut", unit: "piece", avgPieceKg: 0.4, pricePerKg: 45, costPerKg: 27.9, reorderLevelKg: 30, shelfLifeDays: 12, yieldPct: 3 },
  { sku: "BF-RMP", name: "Rump", species: "Beef", category: "Steak Cut", unit: "piece", avgPieceKg: 0.28, pricePerKg: 28, costPerKg: 17.4, reorderLevelKg: 50, shelfLifeDays: 14, yieldPct: 6 },
  { sku: "BF-BRI", name: "Brisket", species: "Beef", category: "Slow Cook", unit: "kg", avgPieceKg: 4.5, pricePerKg: 18, costPerKg: 11.2, reorderLevelKg: 60, shelfLifeDays: 16, yieldPct: 5 },
  { sku: "BF-CHK", name: "Chuck", species: "Beef", category: "Slow Cook", unit: "kg", avgPieceKg: 3.8, pricePerKg: 16, costPerKg: 9.9, reorderLevelKg: 70, shelfLifeDays: 16, yieldPct: 7 },
  { sku: "BF-BLD", name: "Blade", species: "Beef", category: "Slow Cook", unit: "kg", avgPieceKg: 3.2, pricePerKg: 17, costPerKg: 10.5, reorderLevelKg: 50, shelfLifeDays: 16, yieldPct: 4 },
  { sku: "BF-OYB", name: "Oyster Blade", species: "Beef", category: "Roasting", unit: "kg", avgPieceKg: 1.6, pricePerKg: 24, costPerKg: 14.9, reorderLevelKg: 25, shelfLifeDays: 14, yieldPct: 2 },
  { sku: "BF-TOP", name: "Topside", species: "Beef", category: "Roasting", unit: "kg", avgPieceKg: 6.5, pricePerKg: 15, costPerKg: 9.3, reorderLevelKg: 70, shelfLifeDays: 18, yieldPct: 7 },
  { sku: "BF-SIL", name: "Silverside", species: "Beef", category: "Roasting", unit: "kg", avgPieceKg: 5.5, pricePerKg: 14, costPerKg: 8.7, reorderLevelKg: 60, shelfLifeDays: 18, yieldPct: 6 },
  { sku: "BF-OSS", name: "Osso Buco", species: "Beef", category: "Portioned", unit: "piece", avgPieceKg: 0.35, pricePerKg: 19, costPerKg: 11.8, reorderLevelKg: 20, shelfLifeDays: 12, yieldPct: 2 },
  { sku: "BF-SRB", name: "Beef Short Ribs", species: "Beef", category: "Slow Cook", unit: "piece", avgPieceKg: 0.65, pricePerKg: 22, costPerKg: 13.6, reorderLevelKg: 30, shelfLifeDays: 14, yieldPct: 3 },
  { sku: "BF-MNC", name: "Beef Mince (Premium)", species: "Beef", category: "Mince & Sausage", unit: "kg", avgPieceKg: 1, pricePerKg: 13, costPerKg: 8.1, reorderLevelKg: 120, shelfLifeDays: 6, yieldPct: 11 },
  { sku: "BF-DIC", name: "Beef Diced / Casserole", species: "Beef", category: "Portioned", unit: "kg", avgPieceKg: 1, pricePerKg: 17, costPerKg: 10.5, reorderLevelKg: 40, shelfLifeDays: 8, yieldPct: 2 },

  /* ------------------------------- LAMB ------------------------------- */
  { sku: "LB-RAK", name: "Lamb Rack (Frenched)", species: "Lamb", category: "Steak Cut", unit: "piece", avgPieceKg: 0.45, pricePerKg: 54, costPerKg: 33.5, reorderLevelKg: 25, shelfLifeDays: 12, yieldPct: 6 },
  { sku: "LB-LEG", name: "Lamb Leg (Bone-in)", species: "Lamb", category: "Roasting", unit: "piece", avgPieceKg: 2.6, pricePerKg: 22, costPerKg: 13.6, reorderLevelKg: 70, shelfLifeDays: 14, yieldPct: 20 },
  { sku: "LB-SHL", name: "Lamb Shoulder", species: "Lamb", category: "Slow Cook", unit: "kg", avgPieceKg: 2.1, pricePerKg: 17, costPerKg: 10.5, reorderLevelKg: 55, shelfLifeDays: 14, yieldPct: 14 },
  { sku: "LB-SHK", name: "Lamb Shank", species: "Lamb", category: "Portioned", unit: "piece", avgPieceKg: 0.35, pricePerKg: 16, costPerKg: 9.9, reorderLevelKg: 30, shelfLifeDays: 12, yieldPct: 6 },
  { sku: "LB-BST", name: "Lamb Backstrap", species: "Lamb", category: "Steak Cut", unit: "piece", avgPieceKg: 0.25, pricePerKg: 46, costPerKg: 28.5, reorderLevelKg: 20, shelfLifeDays: 10, yieldPct: 5 },
  { sku: "LB-CUT", name: "Lamb Cutlets", species: "Lamb", category: "Steak Cut", unit: "piece", avgPieceKg: 0.09, pricePerKg: 52, costPerKg: 32.2, reorderLevelKg: 20, shelfLifeDays: 10, yieldPct: 5 },
  { sku: "LB-MNC", name: "Lamb Mince", species: "Lamb", category: "Mince & Sausage", unit: "kg", avgPieceKg: 1, pricePerKg: 15, costPerKg: 9.3, reorderLevelKg: 45, shelfLifeDays: 6, yieldPct: 8 },
  { sku: "LB-RIB", name: "Lamb Ribs", species: "Lamb", category: "Slow Cook", unit: "kg", avgPieceKg: 0.9, pricePerKg: 13, costPerKg: 8.1, reorderLevelKg: 20, shelfLifeDays: 12, yieldPct: 4 },

  /* ------------------------------- GOAT ------------------------------- */
  { sku: "GT-LEG", name: "Goat Leg", species: "Goat", category: "Roasting", unit: "piece", avgPieceKg: 1.8, pricePerKg: 21, costPerKg: 13, reorderLevelKg: 30, shelfLifeDays: 14, yieldPct: 22 },
  { sku: "GT-SHL", name: "Goat Shoulder", species: "Goat", category: "Slow Cook", unit: "kg", avgPieceKg: 1.5, pricePerKg: 17, costPerKg: 10.5, reorderLevelKg: 25, shelfLifeDays: 14, yieldPct: 15 },
  { sku: "GT-CUR", name: "Goat Curry Cut (Bone-in)", species: "Goat", category: "Portioned", unit: "kg", avgPieceKg: 1, pricePerKg: 15, costPerKg: 9.3, reorderLevelKg: 35, shelfLifeDays: 10, yieldPct: 12 },
  { sku: "GT-RIB", name: "Goat Ribs", species: "Goat", category: "Slow Cook", unit: "kg", avgPieceKg: 0.8, pricePerKg: 12, costPerKg: 7.4, reorderLevelKg: 15, shelfLifeDays: 12, yieldPct: 6 },
  { sku: "GT-SHK", name: "Goat Shank", species: "Goat", category: "Portioned", unit: "piece", avgPieceKg: 0.3, pricePerKg: 14, costPerKg: 8.7, reorderLevelKg: 12, shelfLifeDays: 12, yieldPct: 5 },
  { sku: "GT-MNC", name: "Goat Mince", species: "Goat", category: "Mince & Sausage", unit: "kg", avgPieceKg: 1, pricePerKg: 14, costPerKg: 8.7, reorderLevelKg: 18, shelfLifeDays: 6, yieldPct: 4 },

  /* ------------------------------- PORK ------------------------------- */
  { sku: "PK-BEL", name: "Pork Belly", species: "Pork", category: "Slow Cook", unit: "kg", avgPieceKg: 3.4, pricePerKg: 18, costPerKg: 11.2, reorderLevelKg: 50, shelfLifeDays: 12, yieldPct: 14 },
  { sku: "PK-LOI", name: "Pork Loin", species: "Pork", category: "Roasting", unit: "kg", avgPieceKg: 3.1, pricePerKg: 16, costPerKg: 9.9, reorderLevelKg: 45, shelfLifeDays: 12, yieldPct: 12 },
  { sku: "PK-SHL", name: "Pork Shoulder", species: "Pork", category: "Slow Cook", unit: "kg", avgPieceKg: 4.2, pricePerKg: 12, costPerKg: 7.4, reorderLevelKg: 55, shelfLifeDays: 12, yieldPct: 16 },
  { sku: "PK-RIB", name: "Pork Ribs (American Style)", species: "Pork", category: "Slow Cook", unit: "piece", avgPieceKg: 0.85, pricePerKg: 15, costPerKg: 9.3, reorderLevelKg: 30, shelfLifeDays: 12, yieldPct: 7 },
  { sku: "PK-SCO", name: "Pork Scotch", species: "Pork", category: "Steak Cut", unit: "piece", avgPieceKg: 0.26, pricePerKg: 14, costPerKg: 8.7, reorderLevelKg: 30, shelfLifeDays: 10, yieldPct: 8 },
  { sku: "PK-HOC", name: "Ham Hock", species: "Pork", category: "Portioned", unit: "piece", avgPieceKg: 0.9, pricePerKg: 9, costPerKg: 5.6, reorderLevelKg: 20, shelfLifeDays: 14, yieldPct: 5 },
  { sku: "PK-MNC", name: "Pork Mince", species: "Pork", category: "Mince & Sausage", unit: "kg", avgPieceKg: 1, pricePerKg: 11, costPerKg: 6.8, reorderLevelKg: 50, shelfLifeDays: 6, yieldPct: 10 },
  { sku: "PK-FAT", name: "Pork Back Fat", species: "Pork", category: "Offal & Bones", unit: "kg", avgPieceKg: 1, pricePerKg: 4, costPerKg: 2.5, reorderLevelKg: 10, shelfLifeDays: 20, yieldPct: 4 },

  /* ----------------------------- POULTRY ------------------------------ */
  { sku: "PY-BRE", name: "Chicken Breast (Skinless)", species: "Poultry", category: "Portioned", unit: "piece", avgPieceKg: 0.22, pricePerKg: 13.5, costPerKg: 8.4, reorderLevelKg: 80, shelfLifeDays: 6, yieldPct: 22 },
  { sku: "PY-THI", name: "Chicken Thigh (Boneless)", species: "Poultry", category: "Portioned", unit: "piece", avgPieceKg: 0.13, pricePerKg: 11, costPerKg: 6.8, reorderLevelKg: 60, shelfLifeDays: 6, yieldPct: 14 },
  { sku: "PY-DRM", name: "Chicken Drumstick", species: "Poultry", category: "Portioned", unit: "piece", avgPieceKg: 0.11, pricePerKg: 7.5, costPerKg: 4.7, reorderLevelKg: 55, shelfLifeDays: 6, yieldPct: 13 },
  { sku: "PY-WNG", name: "Chicken Wings", species: "Poultry", category: "Portioned", unit: "piece", avgPieceKg: 0.09, pricePerKg: 8, costPerKg: 5, reorderLevelKg: 40, shelfLifeDays: 6, yieldPct: 9 },
  { sku: "PY-MRY", name: "Chicken Maryland", species: "Poultry", category: "Portioned", unit: "piece", avgPieceKg: 0.35, pricePerKg: 9, costPerKg: 5.6, reorderLevelKg: 35, shelfLifeDays: 6, yieldPct: 6 },
  { sku: "PY-TEN", name: "Chicken Tenderloin", species: "Poultry", category: "Portioned", unit: "piece", avgPieceKg: 0.06, pricePerKg: 15, costPerKg: 9.3, reorderLevelKg: 25, shelfLifeDays: 5, yieldPct: 4 },
  { sku: "PY-WHL", name: "Whole Chicken (Size 14)", species: "Poultry", category: "Primal", unit: "piece", avgPieceKg: 1.45, pricePerKg: 7, costPerKg: 4.3, reorderLevelKg: 30, shelfLifeDays: 7, yieldPct: 3 },
  { sku: "PY-MNC", name: "Chicken Mince", species: "Poultry", category: "Mince & Sausage", unit: "kg", avgPieceKg: 1, pricePerKg: 9, costPerKg: 5.6, reorderLevelKg: 30, shelfLifeDays: 5, yieldPct: 3 },
];

export const PRODUCTS: Product[] = RAW_PRODUCTS.map((p, i) => ({
  id: `prd-${String(i + 1).padStart(3, "0")}`,
  sku: p.sku,
  name: p.name,
  species: p.species,
  category: p.category,
  unit: p.unit,
  avgPieceKg: p.avgPieceKg,
  pricePerKg: p.pricePerKg,
  costPerKg: p.costPerKg,
  reorderLevelKg: p.reorderLevelKg,
  shelfLifeDays: p.shelfLifeDays,
  active: true,
}));

/** productId -> share of carcass weight, used by the processing engine. */
export const YIELD_MAP: Record<string, number> = Object.fromEntries(
  RAW_PRODUCTS.map((p, i) => [`prd-${String(i + 1).padStart(3, "0")}`, p.yieldPct]),
);

/** Non-saleable split of the carcass, per species (% of carcass weight). */
export const LOSS_PROFILE: Record<Species, { trim: number; bone: number; waste: number }> = {
  Beef: { trim: 8, bone: 17, waste: 3 },
  Lamb: { trim: 8, bone: 20, waste: 4 },
  Goat: { trim: 7, bone: 25, waste: 4 },
  Pork: { trim: 8, bone: 13, waste: 3 },
  Poultry: { trim: 4, bone: 18, waste: 4 },
};

/** Live-animal benchmarks used for the per-head yield analysis. */
export const LIVESTOCK_PROFILE: Record<
  Species,
  { liveKg: [number, number]; dressing: [number, number]; costPerLiveKg: [number, number]; headPerBatch: [number, number] }
> = {
  Beef: { liveKg: [520, 680], dressing: [0.53, 0.58], costPerLiveKg: [4.1, 4.8], headPerBatch: [2, 8] },
  Lamb: { liveKg: [42, 58], dressing: [0.44, 0.48], costPerLiveKg: [5.2, 6.4], headPerBatch: [15, 60] },
  Goat: { liveKg: [32, 48], dressing: [0.43, 0.47], costPerLiveKg: [5.8, 7.0], headPerBatch: [8, 30] },
  Pork: { liveKg: [92, 118], dressing: [0.7, 0.75], costPerLiveKg: [3.2, 3.9], headPerBatch: [6, 20] },
  Poultry: { liveKg: [2.1, 2.8], dressing: [0.68, 0.73], costPerLiveKg: [3.4, 4.2], headPerBatch: [120, 400] },
};

export const COLD_ROOMS: ColdRoom[] = [
  { id: "cr-1", name: "Hanging Room A", kind: "Hanging Room", targetTempC: 2, capacityKg: 4000 },
  { id: "cr-2", name: "Boning Chiller B", kind: "Chiller", targetTempC: 1, capacityKg: 2500 },
  { id: "cr-3", name: "Dispatch Chiller C", kind: "Chiller", targetTempC: 2, capacityKg: 1800 },
  { id: "cr-4", name: "Freezer 1", kind: "Freezer", targetTempC: -18, capacityKg: 3000 },
  { id: "cr-5", name: "Freezer 2", kind: "Freezer", targetTempC: -20, capacityKg: 2000 },
];

export const DEFAULT_SETTINGS: CompanySettings = {
  companyName: "Hobart Premium Meat Co. Pty Ltd",
  tradingName: "Hobart Premium Meat Co.",
  abn: "41 682 517 903",
  address: "14 Sunderland St, Moonah TAS 7009, Australia",
  phone: "(03) 6212 4480",
  email: "orders@hobartpremiummeat.com.au",
  licenceNo: "TAS-MPA-2214",
  currency: "AUD",
  lowStockAlerts: true,
  expiryWarningDays: 4,
};
