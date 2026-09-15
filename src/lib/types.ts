/* ------------------------------------------------------------------ *
 * Hobart Premium Meat Co. — Inventory & Processing System
 * Domain model
 * ------------------------------------------------------------------ */

export type Species = "Beef" | "Lamb" | "Goat" | "Pork" | "Poultry";

export const SPECIES: Species[] = ["Beef", "Lamb", "Goat", "Pork", "Poultry"];

/** What the live animal is called on the kill floor / intake docket. */
export const SPECIES_ANIMAL: Record<Species, string> = {
  Beef: "Cattle",
  Lamb: "Sheep / Lamb",
  Goat: "Goat",
  Pork: "Pig",
  Poultry: "Chicken",
};

export type Unit = "kg" | "piece";

export type ProductCategory =
  | "Primal"
  | "Steak Cut"
  | "Roasting"
  | "Slow Cook"
  | "Mince & Sausage"
  | "Portioned"
  | "Offal & Bones";

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "Primal",
  "Steak Cut",
  "Roasting",
  "Slow Cook",
  "Mince & Sausage",
  "Portioned",
  "Offal & Bones",
];

/* ----------------------------- Master data ----------------------------- */

export interface Product {
  id: string;
  sku: string;
  name: string;
  species: Species;
  category: ProductCategory;
  /** Primary stock unit. `piece` items still carry a weight for yield maths. */
  unit: Unit;
  /** Average weight of one piece in kg (used when unit === "piece"). */
  avgPieceKg: number;
  pricePerKg: number;
  costPerKg: number;
  /** Re-order trigger, in kg. */
  reorderLevelKg: number;
  shelfLifeDays: number;
  active: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  type: "Farm" | "Abattoir" | "Saleyard" | "Wholesaler";
  contactName: string;
  phone: string;
  email: string;
  address: string;
  abn: string;
  species: Species[];
  active: boolean;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  type: "Restaurant" | "Pub / Bistro" | "Hotel" | "Cafe" | "Retail Butcher" | "Caterer";
  contactName: string;
  phone: string;
  email: string;
  address: string;
  suburb: string;
  paymentTerms: "COD" | "7 days" | "14 days" | "30 days";
  creditLimit: number;
  active: boolean;
  notes?: string;
}

export interface ColdRoom {
  id: string;
  name: string;
  kind: "Chiller" | "Freezer" | "Hanging Room";
  targetTempC: number;
  capacityKg: number;
}

/* --------------------------- Livestock intake -------------------------- */

export type IntakeStatus = "Received" | "In Processing" | "Processed";

export interface IntakeBatch {
  id: string;
  batchCode: string;
  supplierId: string;
  species: Species;
  headCount: number;
  /** Total live weight received, kg. */
  liveWeightKg: number;
  /** Total hot carcass weight after slaughter/dressing, kg. */
  carcassWeightKg: number;
  /** Total purchase cost, AUD. */
  cost: number;
  arrivalDate: string; // ISO yyyy-mm-dd
  invoiceNo: string;
  nvdNumber: string; // National Vendor Declaration
  status: IntakeStatus;
  notes?: string;
}

/* ---------------------------- Processing run --------------------------- */

export interface RunOutput {
  productId: string;
  qtyKg: number;
  pieces: number;
}

export interface ProcessingRun {
  id: string;
  runCode: string;
  intakeBatchId: string;
  species: Species;
  date: string; // ISO yyyy-mm-dd
  /** Head actually broken down in this run. */
  headProcessed: number;
  /** Carcass weight fed into the boning room, kg. */
  carcassInputKg: number;
  outputs: RunOutput[];
  trimKg: number;
  boneKg: number;
  wasteKg: number;
  labourHours: number;
  operator: string;
  notes?: string;
}

/* ------------------------------ Stock lots ----------------------------- */

export type LotStatus = "In Stock" | "Reserved" | "Sold" | "Expired" | "Written Off";

export interface StockLot {
  id: string;
  lotCode: string;
  productId: string;
  runId: string | null;
  coldRoomId: string;
  qtyKg: number;
  pieces: number;
  producedDate: string;
  expiryDate: string;
  status: LotStatus;
}

/* -------------------------------- Orders ------------------------------- */

export type OrderStatus =
  | "Draft"
  | "Confirmed"
  | "Packed"
  | "Out for Delivery"
  | "Delivered"
  | "Cancelled";

export const ORDER_STATUSES: OrderStatus[] = [
  "Draft",
  "Confirmed",
  "Packed",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

export interface OrderLine {
  productId: string;
  qtyKg: number;
  pieces: number;
  unitPrice: number; // per kg
}

export interface Order {
  id: string;
  orderNo: string;
  customerId: string;
  orderDate: string;
  deliveryDate: string;
  status: OrderStatus;
  lines: OrderLine[];
  deliveryRun: "Hobart CBD" | "Eastern Shore" | "Northern Suburbs" | "Huon / South" | "Pickup";
  /** True once this order has drawn its stock out of the cold rooms. */
  stockApplied?: boolean;
  notes?: string;
}

/* ------------------------------- Wastage ------------------------------- */

export type WasteReason =
  | "Trim"
  | "Bone"
  | "Spoilage"
  | "Expiry"
  | "Damage"
  | "Customer Return"
  | "QA Reject";

export const WASTE_REASONS: WasteReason[] = [
  "Trim",
  "Bone",
  "Spoilage",
  "Expiry",
  "Damage",
  "Customer Return",
  "QA Reject",
];

export interface WasteRecord {
  id: string;
  date: string;
  species: Species;
  productId: string | null;
  runId: string | null;
  reason: WasteReason;
  qtyKg: number;
  costValue: number;
  recordedBy: string;
  notes?: string;
}

/* ------------------------------ Settings ------------------------------- */

export interface CompanySettings {
  companyName: string;
  tradingName: string;
  abn: string;
  address: string;
  phone: string;
  email: string;
  licenceNo: string;
  currency: string;
  lowStockAlerts: boolean;
  expiryWarningDays: number;
}

/* --------------------------- Derived / helper -------------------------- */

export interface DateRange {
  from: string; // ISO yyyy-mm-dd inclusive
  to: string; // ISO yyyy-mm-dd inclusive
}

export type RangePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisWeek"
  | "thisMonth"
  | "lastMonth"
  | "last90"
  | "thisYear"
  | "custom";
