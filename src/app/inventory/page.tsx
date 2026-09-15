"use client";

import { Boxes, Download, Minus, Plus, Snowflake, Thermometer, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { StatTile } from "@/components/ui/StatTile";
import { useToast } from "@/components/ui/Toast";
import { LotStatusBadge } from "@/components/ui/badges";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Meter,
  PageHeader,
  Segmented,
  Select,
} from "@/components/ui/primitives";
import { SPECIES_COLOR, LIVE_LOT_STATUSES, expiringLots, stockRows, sum, type StockRow } from "@/lib/analytics";
import { downloadCSV } from "@/lib/csv";
import { addDays, daysBetween, todayISO } from "@/lib/dates";
import { compactKg, dateLabel, kg, money, num } from "@/lib/format";
import { useStore } from "@/lib/store";
import { PRODUCT_CATEGORIES, SPECIES, type ProductCategory, type Species, type StockLot } from "@/lib/types";

type Tab = "cuts" | "lots" | "rooms";

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>("cuts");
  const lots = useStore((s) => s.lots);
  const products = useStore((s) => s.products);
  const coldRooms = useStore((s) => s.coldRooms);
  const settings = useStore((s) => s.settings);

  const today = todayISO();
  const rows = useMemo(() => stockRows(lots, products), [lots, products]);
  const onHand = rows.filter((r) => r.kg > 0);
  const totalKg = sum(onHand, (r) => r.kg);
  const totalValue = sum(onHand, (r) => r.value);
  const low = rows.filter((r) => r.belowReorder);
  const expiring = useMemo(
    () => expiringLots(lots, settings.expiryWarningDays, today),
    [lots, settings.expiryWarningDays, today],
  );

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Every cut currently in the chillers and freezers, lot by lot"
        actions={
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: "cuts", label: "By cut" },
              { value: "lots", label: "Stock lots" },
              { value: "rooms", label: "Cold rooms" },
            ]}
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Stock on hand"
          value={compactKg(totalKg)}
          sub={`${num(onHand.length)} product lines`}
          icon={<Boxes size={16} />}
          accent="var(--s1)"
        />
        <StatTile label="Stock value" value={money(totalValue)} sub="at list price" accent="var(--s3)" />
        <StatTile
          label="Below re-order"
          value={num(low.length)}
          sub="product lines"
          icon={<TriangleAlert size={16} />}
          accent="var(--s2)"
        />
        <StatTile
          label={`Expiring ≤ ${settings.expiryWarningDays}d`}
          value={num(expiring.length)}
          sub={`${compactKg(sum(expiring, (l) => l.qtyKg))} at risk`}
          icon={<Snowflake size={16} />}
          accent="var(--s4)"
        />
      </div>

      <div className="mt-4">
        {tab === "cuts" && <CutsTab rows={rows} />}
        {tab === "lots" && <LotsTab />}
        {tab === "rooms" && <RoomsTab />}
      </div>

      {tab === "cuts" && expiring.length > 0 && (
        <Card className="mt-4">
          <CardHeader
            title="Lots nearing use-by"
            subtitle={`${expiring.length} lots within ${settings.expiryWarningDays} days`}
          />
          <ul className="divide-y divide-line">
            {expiring.slice(0, 8).map((l) => {
              const p = products.find((x) => x.id === l.productId);
              const room = coldRooms.find((c) => c.id === l.coldRoomId);
              const d = daysBetween(today, l.expiryDate);
              return (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink">{p?.name ?? "—"}</p>
                    <p className="truncate text-[11px] text-ink-muted">
                      {l.lotCode} · {kg(l.qtyKg)} · {room?.name ?? "—"}
                    </p>
                  </div>
                  <Badge tone={d <= 0 ? "critical" : d <= 2 ? "warning" : "neutral"}>
                    {d < 0 ? "Expired" : d === 0 ? "Use today" : `${d} day${d === 1 ? "" : "s"} left`}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}

/* ------------------------------- by cut ------------------------------- */

function CutsTab({ rows }: { rows: StockRow[] }) {
  const [species, setSpecies] = useState<"all" | Species>("all");
  const [category, setCategory] = useState<"all" | ProductCategory>("all");
  const [onlyLow, setOnlyLow] = useState(false);

  const filtered = rows
    .filter((r) => species === "all" || r.product.species === species)
    .filter((r) => category === "all" || r.product.category === category)
    .filter((r) => (onlyLow ? r.belowReorder : true));

  const columns: Column<StockRow & { id: string }>[] = [
    {
      key: "name",
      header: "Cut",
      value: (r) => r.product.name,
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <i className="h-6 w-1 shrink-0 rounded-full" style={{ background: SPECIES_COLOR[r.product.species] }} />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{r.product.name}</p>
            <p className="text-[11px] text-ink-muted">
              {r.product.sku} · {r.product.category}
            </p>
          </div>
        </div>
      ),
    },
    { key: "species", header: "Species", value: (r) => r.product.species, hideBelow: "md" },
    {
      key: "kg",
      header: "On hand",
      value: (r) => r.kg,
      align: "right",
      render: (r) => <span className="font-semibold text-ink">{num(r.kg, 1)} kg</span>,
    },
    {
      key: "pieces",
      header: "Pieces",
      value: (r) => r.pieces,
      align: "right",
      render: (r) => (r.product.unit === "piece" ? <span className="text-ink">{num(r.pieces)}</span> : <span className="text-ink-muted">—</span>),
    },
    { key: "lots", header: "Lots", value: (r) => r.lots, align: "right", hideBelow: "sm" },
    {
      key: "level",
      header: "Vs re-order",
      sortable: false,
      render: (r) => (
        <div className="min-w-[7rem]">
          <Meter
            value={Math.min(r.kg, r.product.reorderLevelKg * 2)}
            max={r.product.reorderLevelKg * 2}
            color={r.belowReorder ? "var(--critical)" : "var(--good)"}
          />
          <p className="mt-1 text-[10.5px] text-ink-muted">re-order at {r.product.reorderLevelKg} kg</p>
        </div>
      ),
      hideBelow: "lg",
    },
    {
      key: "value",
      header: "Value",
      value: (r) => r.value,
      align: "right",
      hideBelow: "md",
      render: (r) => money(r.value),
    },
    {
      key: "expiry",
      header: "Next expiry",
      value: (r) => r.nearestExpiry ?? "",
      align: "right",
      hideBelow: "lg",
      render: (r) => (r.nearestExpiry ? <span className="tabnum">{dateLabel(r.nearestExpiry)}</span> : <span className="text-ink-muted">—</span>),
    },
    {
      key: "status",
      header: "Status",
      value: (r) => (r.kg === 0 ? 0 : r.belowReorder ? 1 : 2),
      render: (r) =>
        r.kg === 0 ? (
          <Badge tone="critical">Out of stock</Badge>
        ) : r.belowReorder ? (
          <Badge tone="warning">Low</Badge>
        ) : (
          <Badge tone="good">OK</Badge>
        ),
    },
  ];

  const tableRows = filtered.map((r) => ({ ...r, id: r.product.id }));

  return (
    <Card>
      <DataTable
        rows={tableRows}
        columns={columns}
        pageSize={15}
        searchPlaceholder="Search cut or SKU…"
        searchKeys={(r) => `${r.product.name} ${r.product.sku} ${r.product.species} ${r.product.category}`}
        initialSort={{ key: "kg", dir: "desc" }}
        emptyTitle="No stock matches these filters"
        toolbar={
          <>
            <select
              value={species}
              onChange={(e) => setSpecies(e.target.value as "all" | Species)}
              className="h-9 rounded-lg border border-line-strong bg-surface px-2.5 text-[13px] text-ink focus:border-brand focus:outline-none"
            >
              <option value="all">All species</option>
              {SPECIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as "all" | ProductCategory)}
              className="h-9 rounded-lg border border-line-strong bg-surface px-2.5 text-[13px] text-ink focus:border-brand focus:outline-none"
            >
              <option value="all">All categories</option>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Button size="sm" variant={onlyLow ? "primary" : "secondary"} onClick={() => setOnlyLow((v) => !v)}>
              <TriangleAlert size={14} /> Low stock only
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                downloadCSV(
                  "stock-on-hand",
                  filtered.map((r) => ({
                    SKU: r.product.sku,
                    Cut: r.product.name,
                    Species: r.product.species,
                    Category: r.product.category,
                    OnHandKg: r.kg.toFixed(1),
                    Pieces: r.product.unit === "piece" ? r.pieces : "",
                    Lots: r.lots,
                    ValueAUD: r.value.toFixed(2),
                    ReorderLevelKg: r.product.reorderLevelKg,
                    NextExpiry: r.nearestExpiry ?? "",
                  })),
                )
              }
            >
              <Download size={14} /> CSV
            </Button>
          </>
        }
      />
    </Card>
  );
}

/* -------------------------------- lots -------------------------------- */

function LotsTab() {
  const lots = useStore((s) => s.lots);
  const products = useStore((s) => s.products);
  const coldRooms = useStore((s) => s.coldRooms);
  const adjustLot = useStore((s) => s.adjustLot);
  const upsertLot = useStore((s) => s.upsertLot);
  const newId = useStore((s) => s.newId);
  const { push } = useToast();

  const [statusFilter, setStatusFilter] = useState<"live" | "all">("live");
  const [roomFilter, setRoomFilter] = useState<"all" | string>("all");
  const [adjusting, setAdjusting] = useState<StockLot | null>(null);
  const [creating, setCreating] = useState<StockLot | null>(null);

  const pname = (id: string) => products.find((p) => p.id === id)?.name ?? "—";
  const rname = (id: string) => coldRooms.find((c) => c.id === id)?.name ?? "—";

  const rows = lots
    .filter((l) => (statusFilter === "live" ? LIVE_LOT_STATUSES.includes(l.status) && l.qtyKg > 0 : true))
    .filter((l) => roomFilter === "all" || l.coldRoomId === roomFilter)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  const columns: Column<StockLot>[] = [
    {
      key: "lotCode",
      header: "Lot",
      value: (l) => l.lotCode,
      render: (l) => (
        <div>
          <p className="font-medium text-ink">{pname(l.productId)}</p>
          <p className="text-[11px] text-ink-muted">{l.lotCode}</p>
        </div>
      ),
    },
    {
      key: "qtyKg",
      header: "Qty",
      value: (l) => l.qtyKg,
      align: "right",
      render: (l) => <span className="font-medium text-ink">{num(l.qtyKg, 1)} kg</span>,
    },
    {
      key: "pieces",
      header: "Pieces",
      value: (l) => l.pieces,
      align: "right",
      hideBelow: "sm",
      render: (l) => (l.pieces ? num(l.pieces) : <span className="text-ink-muted">—</span>),
    },
    { key: "room", header: "Cold room", value: (l) => rname(l.coldRoomId), hideBelow: "md" },
    {
      key: "producedDate",
      header: "Produced",
      value: (l) => l.producedDate,
      align: "right",
      hideBelow: "lg",
      render: (l) => <span className="tabnum">{dateLabel(l.producedDate)}</span>,
    },
    {
      key: "expiryDate",
      header: "Use by",
      value: (l) => l.expiryDate,
      align: "right",
      render: (l) => <span className="tabnum">{dateLabel(l.expiryDate)}</span>,
    },
    { key: "status", header: "Status", value: (l) => l.status, render: (l) => <LotStatusBadge status={l.status} /> },
    {
      key: "actions",
      header: "",
      sortable: false,
      align: "right",
      render: (l) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            setAdjusting(l);
          }}
        >
          Adjust
        </Button>
      ),
    },
  ];

  return (
    <>
      <Card>
        <DataTable
          rows={rows}
          columns={columns}
          pageSize={15}
          searchPlaceholder="Search lot code or cut…"
          searchKeys={(l) => `${l.lotCode} ${pname(l.productId)} ${rname(l.coldRoomId)}`}
          emptyTitle="No stock lots match"
          toolbar={
            <>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "live" | "all")}
                className="h-9 rounded-lg border border-line-strong bg-surface px-2.5 text-[13px] text-ink focus:border-brand focus:outline-none"
              >
                <option value="live">In stock &amp; reserved</option>
                <option value="all">All lots (incl. sold)</option>
              </select>
              <select
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
                className="h-9 rounded-lg border border-line-strong bg-surface px-2.5 text-[13px] text-ink focus:border-brand focus:outline-none"
              >
                <option value="all">All cold rooms</option>
                {coldRooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="primary"
                onClick={() =>
                  setCreating({
                    id: newId("lot"),
                    lotCode: `L-MAN-${Math.floor(1000 + Math.random() * 8999)}`,
                    productId: products[0]?.id ?? "",
                    runId: null,
                    coldRoomId: coldRooms[1]?.id ?? coldRooms[0]?.id ?? "",
                    qtyKg: 0,
                    pieces: 0,
                    producedDate: todayISO(),
                    expiryDate: addDays(todayISO(), 10),
                    status: "In Stock",
                  })
                }
              >
                <Plus size={14} /> Add lot
              </Button>
            </>
          }
        />
      </Card>

      {adjusting && (
        <AdjustLot
          lot={adjusting}
          onClose={() => setAdjusting(null)}
          onApply={(delta) => {
            adjustLot(adjusting.id, delta);
            push(`${adjusting.lotCode} adjusted by ${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg.`);
            setAdjusting(null);
          }}
        />
      )}

      {creating && (
        <LotForm
          lot={creating}
          onClose={() => setCreating(null)}
          onSave={(l) => {
            upsertLot(l);
            push(`Lot ${l.lotCode} added to ${rname(l.coldRoomId)}.`);
            setCreating(null);
          }}
        />
      )}
    </>
  );
}

function AdjustLot({
  lot,
  onClose,
  onApply,
}: {
  lot: StockLot;
  onClose: () => void;
  onApply: (delta: number) => void;
}) {
  const products = useStore((s) => s.products);
  const p = products.find((x) => x.id === lot.productId);
  const [delta, setDelta] = useState(0);

  return (
    <Modal
      open
      onClose={onClose}
      width="sm"
      title="Adjust stock lot"
      subtitle={`${p?.name ?? ""} · ${lot.lotCode}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!delta} onClick={() => onApply(delta)}>
            Apply adjustment
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-ink-2">
        Current quantity <span className="font-semibold text-ink">{kg(lot.qtyKg)}</span>
        {p?.unit === "piece" ? ` (${num(lot.pieces)} pieces)` : ""}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={() => setDelta((d) => Number((d - 1).toFixed(1)))}>
          <Minus size={15} />
        </Button>
        <Input
          type="number"
          step="0.1"
          value={delta}
          onChange={(e) => setDelta(Number(e.target.value))}
          className="text-center"
        />
        <Button variant="secondary" onClick={() => setDelta((d) => Number((d + 1).toFixed(1)))}>
          <Plus size={15} />
        </Button>
      </div>
      <p className="mt-3 text-xs text-ink-muted">
        New quantity will be{" "}
        <span className="font-medium text-ink">{kg(Math.max(0, lot.qtyKg + delta))}</span>. Use a negative
        number to write stock off.
      </p>
    </Modal>
  );
}

function LotForm({ lot, onClose, onSave }: { lot: StockLot; onClose: () => void; onSave: (l: StockLot) => void }) {
  const products = useStore((s) => s.products);
  const coldRooms = useStore((s) => s.coldRooms);
  const [form, setForm] = useState<StockLot>(lot);
  const set = <K extends keyof StockLot>(k: K, v: StockLot[K]) => setForm((f) => ({ ...f, [k]: v }));
  const product = products.find((p) => p.id === form.productId);

  return (
    <Modal
      open
      onClose={onClose}
      title="Add stock lot"
      subtitle="Use this for stock counted in manually or received already portioned."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!form.productId || form.qtyKg <= 0}
            onClick={() =>
              onSave({
                ...form,
                pieces:
                  product?.unit === "piece" ? Math.max(0, Math.round(form.qtyKg / product.avgPieceKg)) : 0,
              })
            }
          >
            Add lot
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Lot code" required>
          <Input value={form.lotCode} onChange={(e) => set("lotCode", e.target.value)} />
        </Field>
        <Field label="Product" required>
          <Select
            value={form.productId}
            onChange={(e) => {
              const pid = e.target.value;
              const p = products.find((x) => x.id === pid);
              setForm((f) => ({
                ...f,
                productId: pid,
                expiryDate: addDays(f.producedDate, p?.shelfLifeDays ?? 10),
              }));
            }}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Quantity (kg)" required hint={product?.unit === "piece" ? `≈ ${num(Math.round(form.qtyKg / (product.avgPieceKg || 1)))} pieces` : undefined}>
          <Input type="number" step="0.1" value={form.qtyKg} onChange={(e) => set("qtyKg", Number(e.target.value))} />
        </Field>
        <Field label="Cold room">
          <Select value={form.coldRoomId} onChange={(e) => set("coldRoomId", e.target.value)}>
            {coldRooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.targetTempC}°C)
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Produced date">
          <Input
            type="date"
            value={form.producedDate}
            onChange={(e) => {
              const d = e.target.value;
              setForm((f) => ({ ...f, producedDate: d, expiryDate: addDays(d, product?.shelfLifeDays ?? 10) }));
            }}
          />
        </Field>
        <Field label="Use-by date">
          <Input type="date" value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/* ------------------------------ cold rooms ---------------------------- */

function RoomsTab() {
  const coldRooms = useStore((s) => s.coldRooms);
  const lots = useStore((s) => s.lots);
  const products = useStore((s) => s.products);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {coldRooms.map((room) => {
        const inRoom = lots.filter(
          (l) => l.coldRoomId === room.id && LIVE_LOT_STATUSES.includes(l.status) && l.qtyKg > 0,
        );
        const used = sum(inRoom, (l) => l.qtyKg);
        const byProduct = new Map<string, number>();
        for (const l of inRoom) byProduct.set(l.productId, (byProduct.get(l.productId) ?? 0) + l.qtyKg);
        const top = [...byProduct.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
        const fill = (used / room.capacityKg) * 100;

        return (
          <Card key={room.id}>
            <CardHeader
              title={room.name}
              subtitle={`${room.kind} · target ${room.targetTempC}°C`}
              right={
                <Badge tone={room.kind === "Freezer" ? "info" : "neutral"}>
                  <Thermometer size={11} />
                  {room.targetTempC}°C
                </Badge>
              }
            />
            <p className="text-2xl font-semibold tracking-[-0.02em] text-ink">{num(used, 0)} kg</p>
            <p className="mb-3 text-[11px] text-ink-muted">
              of {num(room.capacityKg)} kg capacity · {inRoom.length} lots
            </p>
            <Meter
              value={used}
              max={room.capacityKg}
              color={fill > 90 ? "var(--critical)" : fill > 70 ? "var(--warning)" : "var(--good)"}
            />
            <ul className="mt-4 space-y-1.5">
              {top.length === 0 && <li className="text-xs text-ink-muted">Empty.</li>}
              {top.map(([pid, q]) => (
                <li key={pid} className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="truncate text-ink-2">{products.find((p) => p.id === pid)?.name ?? "—"}</span>
                  <span className="shrink-0 tabnum text-ink-muted">{num(q, 0)} kg</span>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
