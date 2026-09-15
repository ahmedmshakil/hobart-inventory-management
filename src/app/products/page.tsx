"use client";

import { Beef, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type Column } from "@/components/ui/DataTable";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { StatTile } from "@/components/ui/StatTile";
import { useToast } from "@/components/ui/Toast";
import {
  Badge,
  Button,
  Card,
  Field,
  IconButton,
  Input,
  PageHeader,
  Select,
  Toggle,
} from "@/components/ui/primitives";
import { SPECIES_COLOR, stockRows } from "@/lib/analytics";
import { downloadCSV } from "@/lib/csv";
import { money, num, pct } from "@/lib/format";
import { useStore } from "@/lib/store";
import {
  PRODUCT_CATEGORIES,
  SPECIES,
  type Product,
  type ProductCategory,
  type Species,
  type Unit,
} from "@/lib/types";

export default function ProductsPage() {
  const products = useStore((s) => s.products);
  const lots = useStore((s) => s.lots);
  const upsert = useStore((s) => s.upsertProduct);
  const remove = useStore((s) => s.removeProduct);
  const newId = useStore((s) => s.newId);
  const { push } = useToast();

  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [species, setSpecies] = useState<"all" | Species>("all");

  const stock = useMemo(() => new Map(stockRows(lots, products).map((r) => [r.product.id, r])), [lots, products]);
  const rows = products.filter((p) => species === "all" || p.species === species);

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Cut",
      value: (p) => p.name,
      render: (p) => (
        <div className="flex items-center gap-2.5">
          <i className="h-6 w-1 shrink-0 rounded-full" style={{ background: SPECIES_COLOR[p.species] }} />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{p.name}</p>
            <p className="text-[11px] text-ink-muted">{p.sku}</p>
          </div>
        </div>
      ),
    },
    { key: "species", header: "Species", value: (p) => p.species, hideBelow: "md" },
    {
      key: "category",
      header: "Category",
      value: (p) => p.category,
      hideBelow: "lg",
      render: (p) => <Badge tone="neutral">{p.category}</Badge>,
    },
    {
      key: "unit",
      header: "Sold by",
      value: (p) => p.unit,
      hideBelow: "sm",
      render: (p) => (
        <span className="text-ink-2">
          {p.unit === "piece" ? `piece (≈${p.avgPieceKg} kg)` : "kilogram"}
        </span>
      ),
    },
    {
      key: "price",
      header: "$ / kg",
      value: (p) => p.pricePerKg,
      align: "right",
      render: (p) => <span className="font-semibold text-ink">{money(p.pricePerKg, true)}</span>,
    },
    {
      key: "margin",
      header: "Margin",
      value: (p) => (p.pricePerKg ? ((p.pricePerKg - p.costPerKg) / p.pricePerKg) * 100 : 0),
      align: "right",
      hideBelow: "md",
      render: (p) => {
        const m = p.pricePerKg ? ((p.pricePerKg - p.costPerKg) / p.pricePerKg) * 100 : 0;
        return <Badge tone={m >= 35 ? "good" : m >= 25 ? "warning" : "critical"}>{pct(m, 0)}</Badge>;
      },
    },
    {
      key: "onHand",
      header: "On hand",
      value: (p) => stock.get(p.id)?.kg ?? 0,
      align: "right",
      render: (p) => {
        const s = stock.get(p.id);
        return (
          <span className={s && s.belowReorder ? "font-medium text-[var(--critical)]" : "text-ink"}>
            {num(s?.kg ?? 0, 1)} kg
          </span>
        );
      },
    },
    {
      key: "reorder",
      header: "Re-order",
      value: (p) => p.reorderLevelKg,
      align: "right",
      hideBelow: "lg",
      render: (p) => `${p.reorderLevelKg} kg`,
    },
    {
      key: "shelf",
      header: "Shelf life",
      value: (p) => p.shelfLifeDays,
      align: "right",
      hideBelow: "lg",
      render: (p) => `${p.shelfLifeDays} d`,
    },
    {
      key: "active",
      header: "",
      sortable: false,
      align: "right",
      render: (p) => (
        <div className="flex items-center justify-end gap-0.5">
          {!p.active && <Badge tone="neutral">Inactive</Badge>}
          <IconButton label="Edit" onClick={(e) => { e.stopPropagation(); setEditing(p); }}>
            <Pencil size={14} />
          </IconButton>
          <IconButton label="Delete" onClick={(e) => { e.stopPropagation(); setDeleting(p); }}>
            <Trash2 size={14} />
          </IconButton>
        </div>
      ),
    },
  ];

  const bySpecies = SPECIES.map((s) => ({ s, n: products.filter((p) => p.species === s).length }));

  return (
    <>
      <PageHeader
        title="Cuts & Products"
        subtitle="The catalogue of everything the boning room can produce and sell"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                downloadCSV(
                  "product-catalogue",
                  products.map((p) => ({
                    SKU: p.sku,
                    Name: p.name,
                    Species: p.species,
                    Category: p.category,
                    Unit: p.unit,
                    AvgPieceKg: p.avgPieceKg,
                    PricePerKg: p.pricePerKg,
                    CostPerKg: p.costPerKg,
                    ReorderLevelKg: p.reorderLevelKg,
                    ShelfLifeDays: p.shelfLifeDays,
                    Active: p.active ? "Yes" : "No",
                  })),
                )
              }
            >
              <Download size={15} /> Export
            </Button>
            <Button variant="primary" onClick={() => setEditing(blankProduct(newId("prd")))}>
              <Plus size={15} /> New cut
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Catalogue lines"
          value={num(products.length)}
          sub={`${num(products.filter((p) => p.active).length)} active`}
          icon={<Beef size={16} />}
          accent="var(--s1)"
        />
        <StatTile
          label="Sold by piece"
          value={num(products.filter((p) => p.unit === "piece").length)}
          sub="portioned lines"
          accent="var(--s2)"
        />
        <StatTile
          label="Average margin"
          value={pct(
            products.length
              ? products.reduce((a, p) => a + (p.pricePerKg ? ((p.pricePerKg - p.costPerKg) / p.pricePerKg) * 100 : 0), 0) /
                  products.length
              : 0,
            0,
          )}
          accent="var(--s3)"
        />
        <StatTile
          label="Species covered"
          value={num(bySpecies.filter((b) => b.n > 0).length)}
          sub={bySpecies.map((b) => `${b.s} ${b.n}`).join(" · ")}
          accent="var(--s4)"
        />
      </div>

      <Card className="mt-4">
        <DataTable
          rows={rows}
          columns={columns}
          pageSize={15}
          searchPlaceholder="Search cut, SKU or category…"
          searchKeys={(p) => `${p.name} ${p.sku} ${p.species} ${p.category}`}
          onRowClick={(p) => setEditing(p)}
          initialSort={{ key: "name", dir: "asc" }}
          emptyTitle="No products match"
          toolbar={
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
          }
        />
      </Card>

      {editing && (
        <ProductForm
          product={editing}
          onClose={() => setEditing(null)}
          onSave={(p) => {
            upsert(p);
            setEditing(null);
            push(`${p.name} saved.`);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete product?"
        body={`${deleting?.name} will be removed from the catalogue. Historic runs and orders keep their records.`}
        onConfirm={() => {
          if (deleting) {
            remove(deleting.id);
            push(`${deleting.name} deleted.`, "info");
          }
        }}
      />
    </>
  );
}

function blankProduct(id: string): Product {
  return {
    id,
    sku: "",
    name: "",
    species: "Beef",
    category: "Steak Cut",
    unit: "kg",
    avgPieceKg: 1,
    pricePerKg: 0,
    costPerKg: 0,
    reorderLevelKg: 20,
    shelfLifeDays: 12,
    active: true,
  };
}

function ProductForm({
  product,
  onClose,
  onSave,
}: {
  product: Product;
  onClose: () => void;
  onSave: (p: Product) => void;
}) {
  const [form, setForm] = useState<Product>(product);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setForm((f) => ({ ...f, [k]: v }));
  const margin = form.pricePerKg ? ((form.pricePerKg - form.costPerKg) / form.pricePerKg) * 100 : 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={product.name ? `Edit ${product.name}` : "New cut"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!form.name || !form.sku} onClick={() => onSave(form)}>
            Save cut
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cut name" required>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Scotch Fillet" />
        </Field>
        <Field label="SKU" required>
          <Input value={form.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} placeholder="BF-SCO" />
        </Field>
        <Field label="Species">
          <Select value={form.species} onChange={(e) => set("species", e.target.value as Species)}>
            {SPECIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Category">
          <Select value={form.category} onChange={(e) => set("category", e.target.value as ProductCategory)}>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Stock unit">
          <Select value={form.unit} onChange={(e) => set("unit", e.target.value as Unit)}>
            <option value="kg">Kilogram</option>
            <option value="piece">Piece / portion</option>
          </Select>
        </Field>
        <Field
          label="Average piece weight (kg)"
          hint={form.unit === "piece" ? "Used to convert kg to piece counts." : "Only used for piece-counted lines."}
        >
          <Input
            type="number"
            step="0.01"
            value={form.avgPieceKg}
            onChange={(e) => set("avgPieceKg", Number(e.target.value))}
            disabled={form.unit !== "piece"}
          />
        </Field>
        <Field label="Sell price ($ / kg)">
          <Input type="number" step="0.01" value={form.pricePerKg} onChange={(e) => set("pricePerKg", Number(e.target.value))} />
        </Field>
        <Field label="Cost ($ / kg)" hint={form.pricePerKg ? `Gross margin ${pct(margin, 1)}` : undefined}>
          <Input type="number" step="0.01" value={form.costPerKg} onChange={(e) => set("costPerKg", Number(e.target.value))} />
        </Field>
        <Field label="Re-order level (kg)">
          <Input type="number" value={form.reorderLevelKg} onChange={(e) => set("reorderLevelKg", Number(e.target.value))} />
        </Field>
        <Field label="Shelf life (days)">
          <Input type="number" value={form.shelfLifeDays} onChange={(e) => set("shelfLifeDays", Number(e.target.value))} />
        </Field>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-line bg-surface-2 px-3.5 py-3">
        <div>
          <p className="text-[13px] font-medium text-ink">Active in catalogue</p>
          <p className="text-[11px] text-ink-muted">Inactive cuts stay out of new runs and orders.</p>
        </div>
        <Toggle checked={form.active} onChange={(v) => set("active", v)} label="Active" />
      </div>
    </Modal>
  );
}
