"use client";

import { Download, Pencil, Plus, Printer, ShoppingCart, Trash2, Truck } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type Column } from "@/components/ui/DataTable";
import { DateRangeBar } from "@/components/ui/DateRangeBar";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { StatTile } from "@/components/ui/StatTile";
import { useToast } from "@/components/ui/Toast";
import { OrderStatusBadge } from "@/components/ui/badges";
import {
  Badge,
  Button,
  Card,
  Field,
  IconButton,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { SPECIES_COLOR, orderKg, orderValue, salesSummary, stockRows, sum } from "@/lib/analytics";
import { downloadCSV } from "@/lib/csv";
import { addDays, inRange, todayISO } from "@/lib/dates";
import { compactMoney, dateLabel, kg, money, num, relativeDays } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useRange } from "@/lib/useRange";
import { ORDER_STATUSES, type Order, type OrderStatus } from "@/lib/types";

const RUNS: Order["deliveryRun"][] = [
  "Hobart CBD",
  "Eastern Shore",
  "Northern Suburbs",
  "Huon / South",
  "Pickup",
];

export default function OrdersPage() {
  const { preset, range, onChange } = useRange("last30");
  const orders = useStore((s) => s.orders);
  const customers = useStore((s) => s.customers);
  const removeOrder = useStore((s) => s.removeOrder);
  const setStatus = useStore((s) => s.setOrderStatus);
  const newId = useStore((s) => s.newId);
  const { push } = useToast();

  const [editing, setEditing] = useState<Order | null>(null);
  const [viewing, setViewing] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");

  const cname = (id: string) => customers.find((c) => c.id === id)?.name ?? "—";

  const rows = useMemo(
    () =>
      orders
        .filter((o) => inRange(o.orderDate, range))
        .filter((o) => statusFilter === "all" || o.status === statusFilter)
        .sort((a, b) => b.orderDate.localeCompare(a.orderDate)),
    [orders, range, statusFilter],
  );

  const stats = useMemo(() => salesSummary(orders, range), [orders, range]);

  const columns: Column<Order>[] = [
    {
      key: "orderNo",
      header: "Order",
      value: (o) => o.orderNo,
      render: (o) => (
        <div>
          <p className="font-medium text-ink">{o.orderNo}</p>
          <p className="truncate text-[11px] text-ink-muted">{cname(o.customerId)}</p>
        </div>
      ),
    },
    {
      key: "orderDate",
      header: "Ordered",
      value: (o) => o.orderDate,
      align: "right",
      hideBelow: "md",
      render: (o) => <span className="tabnum">{dateLabel(o.orderDate)}</span>,
    },
    {
      key: "deliveryDate",
      header: "Delivery",
      value: (o) => o.deliveryDate,
      align: "right",
      render: (o) => (
        <div className="text-right">
          <p className="tabnum text-ink">{dateLabel(o.deliveryDate)}</p>
          <p className="text-[11px] text-ink-muted">{relativeDays(o.deliveryDate)}</p>
        </div>
      ),
    },
    {
      key: "run",
      header: "Run",
      value: (o) => o.deliveryRun,
      hideBelow: "lg",
      render: (o) => <Badge tone="neutral">{o.deliveryRun}</Badge>,
    },
    { key: "lines", header: "Lines", value: (o) => o.lines.length, align: "right", hideBelow: "sm" },
    {
      key: "kg",
      header: "Weight",
      value: (o) => orderKg(o),
      align: "right",
      hideBelow: "sm",
      render: (o) => `${num(orderKg(o), 1)} kg`,
    },
    {
      key: "value",
      header: "Value",
      value: (o) => orderValue(o),
      align: "right",
      render: (o) => <span className="font-semibold text-ink">{money(orderValue(o))}</span>,
    },
    {
      key: "status",
      header: "Status",
      value: (o) => o.status,
      render: (o) => (
        <select
          value={o.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            const next = e.target.value as OrderStatus;
            setStatus(o.id, next);
            push(
              next === "Packed" && !o.stockApplied
                ? `${o.orderNo} packed — stock drawn from the cold rooms.`
                : `${o.orderNo} set to ${next}.`,
            );
          }}
          className="cursor-pointer rounded-md border border-line bg-surface px-1.5 py-1 text-[11px] font-medium text-ink focus:border-brand focus:outline-none"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      align: "right",
      render: (o) => (
        <div className="flex justify-end gap-0.5">
          <IconButton
            label="Edit order"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(o);
            }}
          >
            <Pencil size={14} />
          </IconButton>
          <IconButton
            label="Delete order"
            onClick={(e) => {
              e.stopPropagation();
              setDeleting(o);
            }}
          >
            <Trash2 size={14} />
          </IconButton>
        </div>
      ),
    },
  ];

  const openOrders = orders.filter(
    (o) => o.status !== "Delivered" && o.status !== "Cancelled" && o.deliveryDate >= todayISO(),
  );

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Wholesale orders from restaurants, pubs, hotels and retail butchers"
        actions={
          <>
            <DateRangeBar preset={preset} range={range} onChange={onChange} />
            <Button
              variant="secondary"
              onClick={() =>
                downloadCSV(
                  `orders-${range.from}_${range.to}`,
                  rows.map((o) => ({
                    Order: o.orderNo,
                    Customer: cname(o.customerId),
                    Ordered: o.orderDate,
                    Delivery: o.deliveryDate,
                    Run: o.deliveryRun,
                    Lines: o.lines.length,
                    WeightKg: orderKg(o).toFixed(1),
                    ValueAUD: orderValue(o).toFixed(2),
                    Status: o.status,
                  })),
                )
              }
            >
              <Download size={15} /> Export
            </Button>
            <Button variant="primary" onClick={() => setEditing(blankOrder(newId("ord"), customers[0]?.id ?? ""))}>
              <Plus size={15} /> New order
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Orders"
          value={num(stats.orderCount)}
          sub={`${num(stats.delivered)} delivered`}
          icon={<ShoppingCart size={16} />}
          accent="var(--s1)"
        />
        <StatTile label="Revenue" value={compactMoney(stats.revenue)} sub={money(stats.revenue)} accent="var(--s3)" />
        <StatTile label="Weight sold" value={`${num(stats.kg, 0)} kg`} accent="var(--s2)" />
        <StatTile
          label="Scheduled deliveries"
          value={num(openOrders.length)}
          sub="still to go out"
          icon={<Truck size={16} />}
          accent="var(--s4)"
        />
      </div>

      <Card className="mt-4">
        <DataTable
          rows={rows}
          columns={columns}
          pageSize={14}
          searchPlaceholder="Search order no. or customer…"
          searchKeys={(o) => `${o.orderNo} ${cname(o.customerId)} ${o.deliveryRun} ${o.status}`}
          onRowClick={(o) => setViewing(o)}
          initialSort={{ key: "orderDate", dir: "desc" }}
          emptyTitle="No orders in this period"
          toolbar={
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | OrderStatus)}
              className="h-9 rounded-lg border border-line-strong bg-surface px-2.5 text-[13px] text-ink focus:border-brand focus:outline-none"
            >
              <option value="all">All statuses</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          }
        />
      </Card>

      {viewing && (
        <OrderDetail
          order={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
          }}
        />
      )}

      {editing && (
        <OrderForm
          order={editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => push(msg)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete order?"
        body={`${deleting?.orderNo} for ${deleting ? cname(deleting.customerId) : ""} will be removed.`}
        onConfirm={() => {
          if (deleting) {
            removeOrder(deleting.id);
            push(`${deleting.orderNo} deleted.`, "info");
          }
        }}
      />
    </>
  );
}

function blankOrder(id: string, customerId: string): Order {
  const today = todayISO();
  return {
    id,
    orderNo: `SO-${today.slice(0, 4)}${today.slice(5, 7)}-${Math.floor(1000 + Math.random() * 8999)}`,
    customerId,
    orderDate: today,
    deliveryDate: addDays(today, 1),
    status: "Draft",
    lines: [],
    deliveryRun: "Hobart CBD",
  };
}

function OrderDetail({ order, onClose, onEdit }: { order: Order; onClose: () => void; onEdit: () => void }) {
  const customers = useStore((s) => s.customers);
  const products = useStore((s) => s.products);
  const settings = useStore((s) => s.settings);
  const c = customers.find((x) => x.id === order.customerId);
  const total = orderValue(order);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Order ${order.orderNo}`}
      subtitle={`${c?.name ?? "—"} · ${c?.suburb ?? ""}`}
      footer={
        <>
          <Button variant="ghost" onClick={() => window.print()}>
            <Printer size={15} /> Print docket
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={onEdit}>
            <Pencil size={15} /> Edit order
          </Button>
        </>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {[
          { l: "Status", v: <OrderStatusBadge status={order.status} /> },
          { l: "Ordered", v: dateLabel(order.orderDate) },
          { l: "Delivery", v: `${dateLabel(order.deliveryDate)}` },
          { l: "Run", v: order.deliveryRun },
        ].map((x) => (
          <div key={x.l} className="rounded-lg border border-line bg-surface-2 px-3 py-2">
            <p className="text-[10.5px] uppercase tracking-wide text-ink-muted">{x.l}</p>
            <p className="mt-1 text-[13px] font-medium text-ink">{x.v}</p>
          </div>
        ))}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
            <th className="py-2 text-left font-semibold">Cut</th>
            <th className="py-2 text-right font-semibold">Qty</th>
            <th className="py-2 text-right font-semibold">Pieces</th>
            <th className="py-2 text-right font-semibold">$ / kg</th>
            <th className="py-2 text-right font-semibold">Line total</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((l, i) => {
            const p = products.find((x) => x.id === l.productId);
            return (
              <tr key={`${l.productId}-${i}`} className="border-b border-line/60">
                <td className="py-2">
                  <span className="inline-flex items-center gap-2">
                    <i
                      className="h-2.5 w-2.5 rounded-[3px]"
                      style={{ background: p ? SPECIES_COLOR[p.species] : "var(--ink-muted)" }}
                    />
                    <span className="text-ink">{p?.name ?? "—"}</span>
                  </span>
                </td>
                <td className="py-2 text-right tabnum text-ink-2">{num(l.qtyKg, 1)} kg</td>
                <td className="py-2 text-right tabnum text-ink-2">{l.pieces ? num(l.pieces) : "—"}</td>
                <td className="py-2 text-right tabnum text-ink-2">{money(l.unitPrice, true)}</td>
                <td className="py-2 text-right tabnum font-medium text-ink">{money(l.qtyKg * l.unitPrice, true)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="text-[13px] font-semibold text-ink">
            <td className="pt-3" colSpan={3}>
              {num(orderKg(order), 1)} kg across {order.lines.length} lines
            </td>
            <td className="pt-3 text-right text-ink-muted">Subtotal</td>
            <td className="pt-3 text-right tabnum">{money(total, true)}</td>
          </tr>
          <tr className="text-[12px] text-ink-2">
            <td colSpan={4} className="py-1 text-right">
              GST (10%)
            </td>
            <td className="py-1 text-right tabnum">{money(total * 0.1, true)}</td>
          </tr>
          <tr className="text-[14px] font-bold text-ink">
            <td colSpan={4} className="border-t border-line pt-2 text-right">
              Total inc. GST
            </td>
            <td className="border-t border-line pt-2 text-right tabnum">{money(total * 1.1, true)}</td>
          </tr>
        </tfoot>
      </table>

      {order.notes ? (
        <p className="mt-4 rounded-lg border border-line bg-surface-2 px-3 py-2 text-[12px] text-ink-2">
          <span className="font-medium text-ink">Delivery note: </span>
          {order.notes}
        </p>
      ) : null}

      <p className="mt-4 text-[11px] text-ink-muted">
        {settings.tradingName} · ABN {settings.abn} · {settings.phone} · Payment terms {c?.paymentTerms ?? "—"}
      </p>
    </Modal>
  );
}

function OrderForm({ order, onClose, onSaved }: { order: Order; onClose: () => void; onSaved: (m: string) => void }) {
  const customers = useStore((s) => s.customers);
  const products = useStore((s) => s.products);
  const lots = useStore((s) => s.lots);
  const upsertOrder = useStore((s) => s.upsertOrder);
  const [form, setForm] = useState<Order>(order);
  const [picker, setPicker] = useState("");

  const stock = useMemo(() => new Map(stockRows(lots, products).map((r) => [r.product.id, r.kg])), [lots, products]);
  const set = <K extends keyof Order>(k: K, v: Order[K]) => setForm((f) => ({ ...f, [k]: v }));

  const addLine = (productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p || form.lines.some((l) => l.productId === productId)) return;
    setForm((f) => ({
      ...f,
      lines: [...f.lines, { productId, qtyKg: 5, pieces: p.unit === "piece" ? Math.round(5 / p.avgPieceKg) : 0, unitPrice: p.pricePerKg }],
    }));
    setPicker("");
  };

  const updateLine = (productId: string, patch: { qtyKg?: number; unitPrice?: number }) => {
    const p = products.find((x) => x.id === productId)!;
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l) =>
        l.productId === productId
          ? {
              ...l,
              ...patch,
              pieces:
                p.unit === "piece"
                  ? Math.max(0, Math.round((patch.qtyKg ?? l.qtyKg) / p.avgPieceKg))
                  : 0,
            }
          : l,
      ),
    }));
  };

  const total = sum(form.lines, (l) => l.qtyKg * l.unitPrice);

  return (
    <Modal
      open
      onClose={onClose}
      width="xl"
      title={order.lines.length ? `Edit ${form.orderNo}` : "New wholesale order"}
      subtitle="Stock is drawn from the cold rooms when the order is marked Packed."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!form.customerId || form.lines.length === 0}
            onClick={() => {
              upsertOrder(form);
              onSaved(`${form.orderNo} saved — ${money(total)} across ${form.lines.length} lines.`);
              onClose();
            }}
          >
            Save order
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Order number" required>
          <Input value={form.orderNo} onChange={(e) => set("orderNo", e.target.value)} />
        </Field>
        <Field label="Customer" required className="sm:col-span-2">
          <Select value={form.customerId} onChange={(e) => set("customerId", e.target.value)}>
            <option value="">Select customer…</option>
            {customers
              .filter((c) => c.active || c.id === form.customerId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.suburb}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Order date">
          <Input type="date" value={form.orderDate} onChange={(e) => set("orderDate", e.target.value)} />
        </Field>
        <Field label="Delivery date">
          <Input type="date" value={form.deliveryDate} onChange={(e) => set("deliveryDate", e.target.value)} />
        </Field>
        <Field label="Delivery run">
          <Select value={form.deliveryRun} onChange={(e) => set("deliveryRun", e.target.value as Order["deliveryRun"])}>
            {RUNS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => set("status", e.target.value as OrderStatus)}>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-5 rounded-xl border border-line bg-surface-2 p-3.5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-[13px] font-semibold text-ink">Order lines</h4>
          <select
            value={picker}
            onChange={(e) => addLine(e.target.value)}
            className="h-8 rounded-lg border border-line-strong bg-surface px-2 text-[12px] text-ink focus:border-brand focus:outline-none"
          >
            <option value="">+ Add a cut…</option>
            {products
              .filter((p) => p.active && !form.lines.some((l) => l.productId === p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {num(stock.get(p.id) ?? 0, 0)} kg on hand
                </option>
              ))}
          </select>
        </div>

        {form.lines.length === 0 ? (
          <p className="py-6 text-center text-xs text-ink-muted">No lines yet — add a cut above.</p>
        ) : (
          <div className="space-y-1.5">
            {form.lines.map((l) => {
              const p = products.find((x) => x.id === l.productId);
              const have = stock.get(l.productId) ?? 0;
              const short = l.qtyKg > have;
              return (
                <div
                  key={l.productId}
                  className="grid grid-cols-[1fr_5rem_6rem_auto_auto] items-center gap-2 rounded-lg bg-surface px-2.5 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-ink">{p?.name}</p>
                    <p className="text-[10.5px] text-ink-muted">
                      {num(have, 0)} kg on hand
                      {p?.unit === "piece" ? ` · ${num(l.pieces)} pcs` : ""}
                    </p>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={l.qtyKg}
                    onChange={(e) => updateLine(l.productId, { qtyKg: Number(e.target.value) })}
                    className={`h-8 w-full rounded-lg border bg-surface px-2 text-right text-[13px] tabnum text-ink focus:outline-none ${
                      short ? "border-[var(--critical)]" : "border-line-strong focus:border-brand"
                    }`}
                  />
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={l.unitPrice}
                    onChange={(e) => updateLine(l.productId, { unitPrice: Number(e.target.value) })}
                    className="h-8 w-full rounded-lg border border-line-strong bg-surface px-2 text-right text-[13px] tabnum text-ink focus:border-brand focus:outline-none"
                  />
                  <span className="w-20 text-right text-[12px] tabnum font-medium text-ink">
                    {money(l.qtyKg * l.unitPrice, true)}
                  </span>
                  <IconButton
                    label="Remove line"
                    onClick={() => setForm((f) => ({ ...f, lines: f.lines.filter((x) => x.productId !== l.productId) }))}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-3 text-[13px]">
          <span className="text-ink-muted">{kg(sum(form.lines, (l) => l.qtyKg), 1)}</span>
          <span className="font-semibold text-ink">Subtotal {money(total, true)}</span>
          <Badge tone="neutral">inc. GST {money(total * 1.1, true)}</Badge>
        </div>
      </div>

      <Field label="Delivery / internal note" className="mt-4">
        <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
      </Field>
    </Modal>
  );
}
