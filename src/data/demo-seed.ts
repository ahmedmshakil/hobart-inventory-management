/* ==================================================================== *
 *                    ⚠  DEMO / SAMPLE DATA ONLY  ⚠
 * ====================================================================
 *
 * Everything produced by this file is fabricated sample data used so the
 * system can be demonstrated before real trading data exists.
 *
 * TO GO LIVE (remove all sample data):
 *   Option 1 — flip the switch below:  DEMO_DATA_ENABLED = false
 *   Option 2 — Settings ▸ Data Management ▸ "Clear all data"
 *   Option 3 — delete this file and the single import of it in
 *              `src/lib/store.ts` (the store falls back to empty state).
 *
 * Nothing else in the codebase depends on this file.
 * ==================================================================== */

import { COLD_ROOMS, LIVESTOCK_PROFILE, LOSS_PROFILE, PRODUCTS, YIELD_MAP } from "@/data/catalog";
import type {
  Customer,
  IntakeBatch,
  Order,
  OrderLine,
  OrderStatus,
  ProcessingRun,
  RunOutput,
  Species,
  StockLot,
  Supplier,
  WasteRecord,
  WasteReason,
} from "@/lib/types";

export const DEMO_DATA_ENABLED = true;

/** How much history the demo generates. */
const DAYS_OF_HISTORY = 180;
const LOT_HISTORY_DAYS = 32; // lots older than this are assumed sold & purged
const WASTE_HISTORY_DAYS = 120;

/* ------------------------- deterministic RNG ------------------------- */

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260914);
const rnd = (min: number, max: number) => min + rand() * (max - min);
const rndInt = (min: number, max: number) => Math.floor(rnd(min, max + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const chance = (p: number) => rand() < p;
const round = (n: number, d = 1) => Number(n.toFixed(d));

/* ------------------------------ dates -------------------------------- */

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function iso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function dayOffset(n: number) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + n);
  return d;
}

/* ---------------------------- master parties -------------------------- */

export const DEMO_SUPPLIERS: Supplier[] = [
  { id: "sup-1", name: "Huon Valley Pastoral Co.", type: "Farm", contactName: "Gerard Pike", phone: "(03) 6264 1187", email: "gerard@huonvalleypastoral.com.au", address: "Glen Huon Rd, Huonville TAS 7109", abn: "72 114 553 208", species: ["Beef", "Lamb"], active: true, notes: "Grass-fed, MSA graded. Delivers Tue & Fri." },
  { id: "sup-2", name: "Midlands Prime Livestock", type: "Saleyard", contactName: "Annette Rowe", phone: "(03) 6391 2260", email: "annette@midlandsprime.com.au", address: "Bass Hwy, Powranna TAS 7300", abn: "55 902 441 776", species: ["Beef", "Lamb", "Goat"], active: true },
  { id: "sup-3", name: "Derwent Meadows Farm", type: "Farm", contactName: "Keith Danvers", phone: "(03) 6261 3345", email: "keith@derwentmeadows.com.au", address: "Back Tea Tree Rd, Richmond TAS 7025", abn: "18 447 230 915", species: ["Pork", "Poultry"], active: true, notes: "Free range pork, RSPCA approved poultry." },
  { id: "sup-4", name: "Bruny Channel Abattoir", type: "Abattoir", contactName: "Marcus Teoh", phone: "(03) 6293 7712", email: "bookings@brunychannelabattoir.com.au", address: "Ferry Rd, Kettering TAS 7155", abn: "90 336 118 402", species: ["Beef", "Lamb", "Goat", "Pork"], active: true, notes: "Service kills. Booking required 10 days ahead." },
  { id: "sup-5", name: "Tasman Peninsula Goat Co.", type: "Farm", contactName: "Rhona Blackwell", phone: "(03) 6250 2098", email: "rhona@tasmangoat.com.au", address: "Nubeena Rd, Koonya TAS 7187", abn: "63 771 904 225", species: ["Goat"], active: true },
  { id: "sup-6", name: "Coal River Poultry", type: "Farm", contactName: "Simon Oakley", phone: "(03) 6260 4471", email: "simon@coalriverpoultry.com.au", address: "Brinktop Rd, Penna TAS 7171", abn: "27 508 663 140", species: ["Poultry"], active: true },
  { id: "sup-7", name: "Southern Cross Meat Wholesale", type: "Wholesaler", contactName: "Dianne Frost", phone: "(03) 6272 8890", email: "sales@scmeatwholesale.com.au", address: "Lampton Ave, Derwent Park TAS 7009", abn: "84 219 665 337", species: ["Beef", "Pork"], active: false, notes: "Backup supplier — account dormant since March." },
];

export const DEMO_CUSTOMERS: Customer[] = [
  { id: "cus-01", name: "Salamanca Grill House", type: "Restaurant", contactName: "Elise Marchetti", phone: "(03) 6223 1140", email: "kitchen@salamancagrill.com.au", address: "18 Salamanca Pl", suburb: "Battery Point", paymentTerms: "14 days", creditLimit: 12000, active: true, notes: "Wants Scotch Fillet portioned at 300g exactly." },
  { id: "cus-02", name: "Derwent Quay Bistro", type: "Pub / Bistro", contactName: "Nathan Quill", phone: "(03) 6234 9922", email: "nathan@derwentquay.com.au", address: "4 Murray St", suburb: "Hobart CBD", paymentTerms: "30 days", creditLimit: 18000, active: true },
  { id: "cus-03", name: "Sandy Bay Steakhouse", type: "Restaurant", contactName: "Priya Raghavan", phone: "(03) 6225 7781", email: "orders@sandybaysteak.com.au", address: "221 Sandy Bay Rd", suburb: "Sandy Bay", paymentTerms: "14 days", creditLimit: 25000, active: true, notes: "Biggest steak account. Delivery before 7am." },
  { id: "cus-04", name: "North Hobart Smokehouse", type: "Restaurant", contactName: "Cody Bell", phone: "(03) 6231 5540", email: "cody@nhsmokehouse.com.au", address: "339 Elizabeth St", suburb: "North Hobart", paymentTerms: "14 days", creditLimit: 15000, active: true, notes: "Brisket & short rib heavy." },
  { id: "cus-05", name: "Wellington Lodge Kitchen", type: "Hotel", contactName: "Margaret Soo", phone: "(03) 6220 3311", email: "procurement@wellingtonlodge.com.au", address: "2 Pinnacle Rd", suburb: "Fern Tree", paymentTerms: "30 days", creditLimit: 30000, active: true },
  { id: "cus-06", name: "Bellerive Boathouse Tavern", type: "Pub / Bistro", contactName: "Dale Hutchins", phone: "(03) 6244 6607", email: "dale@bellerivetavern.com.au", address: "7 Cambridge Rd", suburb: "Bellerive", paymentTerms: "14 days", creditLimit: 10000, active: true },
  { id: "cus-07", name: "Huon Valley Table", type: "Restaurant", contactName: "Imogen Hart", phone: "(03) 6264 8823", email: "imogen@huonvalleytable.com.au", address: "51 Main Rd", suburb: "Huonville", paymentTerms: "7 days", creditLimit: 8000, active: true },
  { id: "cus-08", name: "Kingston Beach Cafe", type: "Cafe", contactName: "Ben Arndt", phone: "(03) 6229 1102", email: "ben@kingstonbeachcafe.com.au", address: "12 Osborne Esp", suburb: "Kingston", paymentTerms: "COD", creditLimit: 3000, active: true },
  { id: "cus-09", name: "Moonah Family Butchery", type: "Retail Butcher", contactName: "Tony Cirillo", phone: "(03) 6272 4418", email: "tony@moonahbutchery.com.au", address: "89 Main Rd", suburb: "Moonah", paymentTerms: "7 days", creditLimit: 14000, active: true, notes: "Buys whole primals, breaks down in store." },
  { id: "cus-10", name: "Constitution Dock Catering", type: "Caterer", contactName: "Sarah Lidgard", phone: "(03) 6231 7790", email: "sarah@conndockcatering.com.au", address: "1 Franklin Wharf", suburb: "Hobart CBD", paymentTerms: "30 days", creditLimit: 22000, active: true, notes: "Event driven — large spikes around regatta week." },
  { id: "cus-11", name: "Glenorchy Charcoal Grill", type: "Restaurant", contactName: "Hakan Yilmaz", phone: "(03) 6273 2265", email: "hakan@glenorchycharcoal.com.au", address: "402 Main Rd", suburb: "Glenorchy", paymentTerms: "14 days", creditLimit: 11000, active: true, notes: "Halal goat & lamb only. Segregated delivery." },
  { id: "cus-12", name: "Richmond Bridge Inn", type: "Pub / Bistro", contactName: "Fiona Kelso", phone: "(03) 6260 2033", email: "fiona@richmondbridgeinn.com.au", address: "50 Bridge St", suburb: "Richmond", paymentTerms: "14 days", creditLimit: 9000, active: true },
  { id: "cus-13", name: "Lindisfarne Bay Kitchen", type: "Restaurant", contactName: "Aaron Petrov", phone: "(03) 6243 1194", email: "aaron@lindisfarnebay.com.au", address: "16 Lincoln St", suburb: "Lindisfarne", paymentTerms: "14 days", creditLimit: 7500, active: true },
  { id: "cus-14", name: "Cambridge Aero Catering", type: "Caterer", contactName: "Julie Nguyen", phone: "(03) 6248 5512", email: "julie@cambridgeaero.com.au", address: "6 Kennedy Dr", suburb: "Cambridge", paymentTerms: "30 days", creditLimit: 20000, active: true },
  { id: "cus-15", name: "Battery Point Providore", type: "Retail Butcher", contactName: "Ruth Calvert", phone: "(03) 6223 8840", email: "ruth@bpprovidore.com.au", address: "31 Hampden Rd", suburb: "Battery Point", paymentTerms: "7 days", creditLimit: 6000, active: false, notes: "Closed for renovation — account on hold." },
];

const OPERATORS = ["Dave Mitchell", "Sam Reilly", "Priya Naidu", "Tom Clarke", "Jess Whitten", "Liam O'Connor"];
const DELIVERY_RUNS: Order["deliveryRun"][] = ["Hobart CBD", "Eastern Shore", "Northern Suburbs", "Huon / South", "Pickup"];

const SPECIES_WEIGHTS: [Species, number][] = [
  ["Beef", 0.3],
  ["Lamb", 0.26],
  ["Poultry", 0.22],
  ["Pork", 0.14],
  ["Goat", 0.08],
];

function pickSpecies(): Species {
  const r = rand();
  let acc = 0;
  for (const [s, w] of SPECIES_WEIGHTS) {
    acc += w;
    if (r <= acc) return s;
  }
  return "Beef";
}

const productsBySpecies = (s: Species) => PRODUCTS.filter((p) => p.species === s);

/* ---------------------------- generation ----------------------------- */

interface Generated {
  intakes: IntakeBatch[];
  runs: ProcessingRun[];
  lots: StockLot[];
  orders: Order[];
  wastage: WasteRecord[];
}

function generate(): Generated {
  const intakes: IntakeBatch[] = [];
  const runs: ProcessingRun[] = [];
  const lots: StockLot[] = [];
  const orders: Order[] = [];
  const wastage: WasteRecord[] = [];

  let batchSeq = 0;
  let runSeq = 0;
  let lotSeq = 0;
  let orderSeq = 0;
  let wasteSeq = 0;

  for (let back = DAYS_OF_HISTORY; back >= 0; back--) {
    const date = dayOffset(-back);
    const dow = date.getDay(); // 0 Sun .. 6 Sat
    const dateStr = iso(date);
    if (dow === 0) continue; // closed Sundays

    /* ---------------- livestock intake ---------------- */
    const batchesToday = dow === 6 ? rndInt(0, 1) : rndInt(1, 3);
    for (let b = 0; b < batchesToday; b++) {
      const species = pickSpecies();
      const prof = LIVESTOCK_PROFILE[species];
      const supplier = pick(DEMO_SUPPLIERS.filter((s) => s.active && s.species.includes(species)));
      const head = rndInt(prof.headPerBatch[0], prof.headPerBatch[1]);
      const avgLive = rnd(prof.liveKg[0], prof.liveKg[1]);
      const liveWeightKg = round(head * avgLive, 1);
      const dressing = rnd(prof.dressing[0], prof.dressing[1]);
      const carcassWeightKg = round(liveWeightKg * dressing, 1);
      const cost = round(liveWeightKg * rnd(prof.costPerLiveKg[0], prof.costPerLiveKg[1]), 2);
      batchSeq++;
      const code = `IB-${dateStr.slice(2, 4)}${dateStr.slice(5, 7)}-${String(batchSeq).padStart(4, "0")}`;
      intakes.push({
        id: `int-${String(batchSeq).padStart(4, "0")}`,
        batchCode: code,
        supplierId: supplier.id,
        species,
        headCount: head,
        liveWeightKg,
        carcassWeightKg,
        cost,
        arrivalDate: dateStr,
        invoiceNo: `INV-${supplier.id.slice(-1)}${String(10500 + batchSeq)}`,
        nvdNumber: `NVD${String(rndInt(400000, 999999))}`,
        status: "Received",
        notes: chance(0.12) ? pick(["MSA graded, chilled on arrival.", "Two head held back for vet check.", "Truck arrived 40 min late — temp logged at 3.1°C.", "Halal certified consignment.", "Excellent fat cover on this line."]) : undefined,
      });
    }

    /* ------------- processing runs (from earlier intakes) ------------- */
    // Everything that has finished hanging gets broken down, oldest first,
    // up to the boning room's daily capacity.
    const ready = intakes
      .filter((i) => {
        if (i.status === "Processed") return false;
        const gapDays = (new Date(dateStr).getTime() - new Date(i.arrivalDate).getTime()) / 86400000;
        const hang = i.species === "Beef" ? 3 : i.species === "Poultry" ? 1 : 2;
        return gapDays >= hang;
      })
      .sort((a, b) => a.arrivalDate.localeCompare(b.arrivalDate))
      .slice(0, dow === 6 ? 2 : 3);

    for (const batch of ready) {
      const species = batch.species;
      const loss = LOSS_PROFILE[species];
      const carcassInputKg = round(batch.carcassWeightKg, 1);
      const cuts = productsBySpecies(species);

      const outputs: RunOutput[] = cuts.map((p) => {
        const base = (YIELD_MAP[p.id] ?? 0) / 100;
        const variance = rnd(0.9, 1.1);
        const qtyKg = round(carcassInputKg * base * variance, 1);
        const pieces = p.unit === "piece" ? Math.max(1, Math.round(qtyKg / p.avgPieceKg)) : 0;
        return { productId: p.id, qtyKg, pieces };
      });

      const trimKg = round(carcassInputKg * (loss.trim / 100) * rnd(0.92, 1.08), 1);
      const boneKg = round(carcassInputKg * (loss.bone / 100) * rnd(0.95, 1.05), 1);
      const wasteKg = round(carcassInputKg * (loss.waste / 100) * rnd(0.8, 1.25), 1);

      batch.status = "Processed";
      runSeq++;
      const runId = `run-${String(runSeq).padStart(4, "0")}`;
      runs.push({
        id: runId,
        runCode: `PR-${dateStr.slice(2, 4)}${dateStr.slice(5, 7)}-${String(runSeq).padStart(4, "0")}`,
        intakeBatchId: batch.id,
        species,
        date: dateStr,
        headProcessed: batch.headCount,
        carcassInputKg,
        outputs,
        trimKg,
        boneKg,
        wasteKg,
        labourHours: round(rnd(0.6, 1.4) * Math.max(2, carcassInputKg / 110), 1),
        operator: pick(OPERATORS),
        notes: chance(0.1) ? pick(["Blade change mid-run, 20 min downtime.", "Yield above target on this line.", "Two carcasses trimmed heavily — bruising.", "Vac-pack machine serviced after run."]) : undefined,
      });

      /* -------- stock lots (only recent runs still hold stock) -------- */
      if (back <= LOT_HISTORY_DAYS) {
        for (const o of outputs) {
          const product = PRODUCTS.find((p) => p.id === o.productId)!;
          // most of an older run's output has already shipped
          const sellThrough = back <= 3 ? rnd(0, 0.25) : back <= 10 ? rnd(0.35, 0.7) : rnd(0.75, 0.97);
          const remainKg = round(o.qtyKg * (1 - sellThrough), 1);
          if (remainKg < 1.5) continue;
          const produced = new Date(dateStr);
          const expiry = new Date(produced);
          const frozen = chance(0.28);
          expiry.setDate(expiry.getDate() + (frozen ? product.shelfLifeDays * 8 : product.shelfLifeDays));
          const expired = expiry.getTime() < TODAY.getTime();
          lotSeq++;
          lots.push({
            id: `lot-${String(lotSeq).padStart(5, "0")}`,
            lotCode: `L${dateStr.replace(/-/g, "").slice(2)}-${product.sku}-${String(lotSeq).padStart(4, "0")}`,
            productId: product.id,
            runId,
            coldRoomId: frozen ? pick(["cr-4", "cr-5"]) : pick(["cr-2", "cr-3"]),
            qtyKg: remainKg,
            pieces: product.unit === "piece" ? Math.max(1, Math.round(remainKg / product.avgPieceKg)) : 0,
            producedDate: dateStr,
            expiryDate: iso(expiry),
            status: expired ? "Expired" : chance(0.1) ? "Reserved" : "In Stock",
          });
        }
      }

      /* --------------------- wastage records --------------------- */
      if (back <= WASTE_HISTORY_DAYS) {
        const unitCost = cuts.length ? cuts.reduce((a, c) => a + c.costPerKg, 0) / cuts.length : 8;
        wastage.push({
          id: `wst-${String(++wasteSeq).padStart(4, "0")}`,
          date: dateStr,
          species,
          productId: null,
          runId,
          reason: "Trim",
          qtyKg: trimKg,
          costValue: round(trimKg * unitCost * 0.35, 2),
          recordedBy: pick(OPERATORS),
        });
        wastage.push({
          id: `wst-${String(++wasteSeq).padStart(4, "0")}`,
          date: dateStr,
          species,
          productId: null,
          runId,
          reason: "Bone",
          qtyKg: boneKg,
          costValue: round(boneKg * unitCost * 0.12, 2),
          recordedBy: pick(OPERATORS),
        });
        if (chance(0.22)) {
          const p = pick(cuts);
          const q = round(rnd(1.5, 14), 1);
          wastage.push({
            id: `wst-${String(++wasteSeq).padStart(4, "0")}`,
            date: dateStr,
            species,
            productId: p.id,
            runId: null,
            reason: pick<WasteReason>(["Spoilage", "Expiry", "Damage", "Customer Return", "QA Reject"]),
            qtyKg: q,
            costValue: round(q * p.costPerKg, 2),
            recordedBy: pick(OPERATORS),
            notes: chance(0.4) ? pick(["Vac seal failed.", "Chiller door left open overnight.", "Returned by customer — colour.", "Dropped during loading."]) : undefined,
          });
        }
      }
    }

    /* --------------------------- sales orders --------------------------- */
    const ordersToday = dow === 6 ? rndInt(1, 3) : rndInt(3, 8);
    for (let o = 0; o < ordersToday; o++) {
      const customer = pick(DEMO_CUSTOMERS.filter((c) => c.active));
      const lineCount = rndInt(2, 7);
      const usedIds = new Set<string>();
      const lines: OrderLine[] = [];
      for (let l = 0; l < lineCount; l++) {
        let product = pick(PRODUCTS);
        if (customer.notes?.includes("Halal")) {
          product = pick(PRODUCTS.filter((p) => p.species === "Goat" || p.species === "Lamb" || p.species === "Poultry"));
        }
        if (usedIds.has(product.id)) continue;
        usedIds.add(product.id);
        const qtyKg = round(rnd(3, 45) * (product.category === "Mince & Sausage" ? 1.8 : 1), 1);
        lines.push({
          productId: product.id,
          qtyKg,
          pieces: product.unit === "piece" ? Math.max(1, Math.round(qtyKg / product.avgPieceKg)) : 0,
          unitPrice: round(product.pricePerKg * rnd(0.95, 1.02), 2),
        });
      }
      if (!lines.length) continue;

      const delivery = dayOffset(-back + rndInt(1, 2));
      let status: OrderStatus;
      if (back > 3) status = chance(0.04) ? "Cancelled" : "Delivered";
      else if (back === 3 || back === 2) status = chance(0.85) ? "Delivered" : "Out for Delivery";
      else if (back === 1) status = pick<OrderStatus>(["Delivered", "Out for Delivery", "Packed"]);
      else status = pick<OrderStatus>(["Draft", "Confirmed", "Confirmed", "Packed", "Out for Delivery"]);

      orderSeq++;
      orders.push({
        id: `ord-${String(orderSeq).padStart(4, "0")}`,
        orderNo: `SO-${dateStr.slice(0, 4)}${dateStr.slice(5, 7)}-${String(orderSeq).padStart(4, "0")}`,
        customerId: customer.id,
        orderDate: dateStr,
        deliveryDate: iso(delivery),
        status,
        lines,
        deliveryRun: customer.suburb === "Hobart CBD" || customer.suburb === "Battery Point" ? "Hobart CBD" : customer.suburb === "Bellerive" || customer.suburb === "Lindisfarne" || customer.suburb === "Cambridge" ? "Eastern Shore" : customer.suburb === "Glenorchy" || customer.suburb === "Moonah" ? "Northern Suburbs" : pick(DELIVERY_RUNS),
        notes: chance(0.13) ? pick(["Deliver before 7am — kitchen prep.", "Split invoice to head office.", "Cryovac all steak cuts.", "Call on arrival, rear laneway access.", "Chef wants consistent 300g portions."]) : undefined,
      });
    }
  }

  // Anything not yet broken down is either still hanging or just off the truck.
  const todayIso = iso(TODAY);
  for (const b of intakes) {
    if (b.status === "Processed") continue;
    b.status = b.arrivalDate >= todayIso ? "Received" : "In Processing";
  }

  return { intakes, runs, lots, orders, wastage };
}

let cache: Generated | null = null;
function data(): Generated {
  if (!cache) cache = generate();
  return cache;
}

export const demoSeed = () => {
  const d = data();
  return {
    suppliers: DEMO_SUPPLIERS,
    customers: DEMO_CUSTOMERS,
    coldRooms: COLD_ROOMS,
    products: PRODUCTS,
    intakes: d.intakes,
    runs: d.runs,
    lots: d.lots,
    orders: d.orders,
    wastage: d.wastage,
  };
};
