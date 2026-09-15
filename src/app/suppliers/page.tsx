"use client";

import { Download, Pencil, Plus, Trash2, Truck } from "lucide-react";
import { useMemo, useState } from "react";

import { RankedBars } from "@/components/charts";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { StatTile } from "@/components/ui/StatTile";
import { useToast } from "@/components/ui/Toast";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  IconButton,
  Input,
  PageHeader,
  Select,
  Textarea,
  Toggle,
} from "@/components/ui/primitives";
import { SPECIES_COLOR, sum } from "@/lib/analytics";
import { downloadCSV } from "@/lib/csv";
import { compactKg, money, num } from "@/lib/format";
import { useStore } from "@/lib/store";
import { SPECIES, type Species, type Supplier } from "@/lib/types";

const TYPES: Supplier["type"][] = ["Farm", "Abattoir", "Saleyard", "Wholesaler"];

export default function SuppliersPage() {
  const suppliers = useStore((s) => s.suppliers);
  const intakes = useStore((s) => s.intakes);
  const upsert = useStore((s) => s.upsertSupplier);
  const remove = useStore((s) => s.removeSupplier);
  const newId = useStore((s) => s.newId);
  const { push } = useToast();

  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);

  const stats = useMemo(() => {
    const acc = new Map<string, { head: number; carcassKg: number; cost: number; batches: number; last: string }>();
    for (const b of intakes) {
      const cur = acc.get(b.supplierId) ?? { head: 0, carcassKg: 0, cost: 0, batches: 0, last: "" };
      cur.head += b.headCount;
      cur.carcassKg += b.carcassWeightKg;
      cur.cost += b.cost;
      cur.batches += 1;
      if (b.arrivalDate > cur.last) cur.last = b.arrivalDate;
      acc.set(b.supplierId, cur);
    }
    return acc;
  }, [intakes]);

  const totalSpend = sum([...stats.values()], (s) => s.cost);

  const columns: Column<Supplier>[] = [
    {
      key: "name",
      header: "Supplier",
      value: (s) => s.name,
      render: (s) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{s.name}</p>
          <p className="truncate text-[11px] text-ink-muted">
            {s.contactName} · ABN {s.abn}
          </p>
        </div>
      ),
    },
    { key: "type", header: "Type", value: (s) => s.type, hideBelow: "md", render: (s) => <Badge tone="neutral">{s.type}</Badge> },
    {
      key: "species",
      header: "Supplies",
      sortable: false,
      hideBelow: "lg",
      render: (s) => (
        <div className="flex flex-wrap gap-1">
          {s.species.map((sp) => (
            <span key={sp} className="inline-flex items-center gap-1 text-[11px] text-ink-2">
              <i className="h-2 w-2 rounded-[2px]" style={{ background: SPECIES_COLOR[sp] }} />
              {sp}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "batches",
      header: "Consignments",
      value: (s) => stats.get(s.id)?.batches ?? 0,
      align: "right",
      hideBelow: "sm",
      render: (s) => num(stats.get(s.id)?.batches ?? 0),
    },
    {
      key: "head",
      header: "Head supplied",
      value: (s) => stats.get(s.id)?.head ?? 0,
      align: "right",
      render: (s) => num(stats.get(s.id)?.head ?? 0),
    },
    {
      key: "carcass",
      header: "Carcass kg",
      value: (s) => stats.get(s.id)?.carcassKg ?? 0,
      align: "right",
      hideBelow: "md",
      render: (s) => num(stats.get(s.id)?.carcassKg ?? 0, 0),
    },
    {
      key: "spend",
      header: "Spend",
      value: (s) => stats.get(s.id)?.cost ?? 0,
      align: "right",
      render: (s) => <span className="font-semibold text-ink">{money(stats.get(s.id)?.cost ?? 0)}</span>,
    },
    {
      key: "rate",
      header: "$ / carcass kg",
      value: (s) => {
        const x = stats.get(s.id);
        return x && x.carcassKg ? x.cost / x.carcassKg : 0;
      },
      align: "right",
      hideBelow: "lg",
      render: (s) => {
        const x = stats.get(s.id);
        return x && x.carcassKg ? money(x.cost / x.carcassKg, true) : "—";
      },
    },
    {
      key: "active",
      header: "Status",
      value: (s) => (s.active ? 1 : 0),
      render: (s) => (s.active ? <Badge tone="good">Active</Badge> : <Badge tone="neutral">Dormant</Badge>),
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      align: "right",
      render: (s) => (
        <div className="flex justify-end gap-0.5">
          <IconButton label="Edit" onClick={(e) => { e.stopPropagation(); setEditing(s); }}>
            <Pencil size={14} />
          </IconButton>
          <IconButton label="Delete" onClick={(e) => { e.stopPropagation(); setDeleting(s); }}>
            <Trash2 size={14} />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Suppliers"
        subtitle="Farms, saleyards and service abattoirs supplying livestock"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                downloadCSV(
                  "suppliers",
                  suppliers.map((s) => ({
                    Name: s.name,
                    Type: s.type,
                    Contact: s.contactName,
                    Phone: s.phone,
                    Email: s.email,
                    Address: s.address,
                    ABN: s.abn,
                    Species: s.species.join(" / "),
                    Consignments: stats.get(s.id)?.batches ?? 0,
                    HeadSupplied: stats.get(s.id)?.head ?? 0,
                    SpendAUD: (stats.get(s.id)?.cost ?? 0).toFixed(2),
                    Active: s.active ? "Yes" : "No",
                  })),
                )
              }
            >
              <Download size={15} /> Export
            </Button>
            <Button variant="primary" onClick={() => setEditing(blankSupplier(newId("sup")))}>
              <Plus size={15} /> New supplier
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Suppliers"
          value={num(suppliers.length)}
          sub={`${num(suppliers.filter((s) => s.active).length)} active`}
          icon={<Truck size={16} />}
          accent="var(--s1)"
        />
        <StatTile label="Livestock spend" value={money(totalSpend)} sub="all time" accent="var(--s2)" />
        <StatTile label="Head supplied" value={num(sum([...stats.values()], (s) => s.head))} accent="var(--s3)" />
        <StatTile
          label="Carcass received"
          value={compactKg(sum([...stats.values()], (s) => s.carcassKg))}
          accent="var(--s4)"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card>
          <DataTable
            rows={suppliers}
            columns={columns}
            pageSize={12}
            searchPlaceholder="Search supplier, contact or ABN…"
            searchKeys={(s) => `${s.name} ${s.contactName} ${s.abn} ${s.type} ${s.species.join(" ")}`}
            onRowClick={(s) => setEditing(s)}
            initialSort={{ key: "spend", dir: "desc" }}
            emptyTitle="No suppliers yet"
          />
        </Card>

        <Card>
          <CardHeader title="Spend by supplier" subtitle="All recorded consignments" />
          <RankedBars
            rows={[...stats.entries()]
              .map(([id, v]) => ({
                id,
                label: suppliers.find((s) => s.id === id)?.name ?? "Unknown",
                sub: `${num(v.head)} head`,
                value: v.cost,
              }))
              .sort((a, b) => b.value - a.value)}
            fmt={(v) => money(v)}
          />
        </Card>
      </div>

      {editing && (
        <SupplierForm
          supplier={editing}
          onClose={() => setEditing(null)}
          onSave={(s) => {
            upsert(s);
            setEditing(null);
            push(`${s.name} saved.`);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete supplier?"
        body={`${deleting?.name} will be removed. Existing intake batches keep their reference.`}
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

function blankSupplier(id: string): Supplier {
  return {
    id,
    name: "",
    type: "Farm",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    abn: "",
    species: ["Beef"],
    active: true,
  };
}

function SupplierForm({
  supplier,
  onClose,
  onSave,
}: {
  supplier: Supplier;
  onClose: () => void;
  onSave: (s: Supplier) => void;
}) {
  const [form, setForm] = useState<Supplier>(supplier);
  const set = <K extends keyof Supplier>(k: K, v: Supplier[K]) => setForm((f) => ({ ...f, [k]: v }));

  const toggleSpecies = (sp: Species) =>
    setForm((f) => ({
      ...f,
      species: f.species.includes(sp) ? f.species.filter((x) => x !== sp) : [...f.species, sp],
    }));

  return (
    <Modal
      open
      onClose={onClose}
      title={supplier.name ? `Edit ${supplier.name}` : "New supplier"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!form.name || form.species.length === 0} onClick={() => onSave(form)}>
            Save supplier
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Supplier name" required className="sm:col-span-2">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Huon Valley Pastoral Co." />
        </Field>
        <Field label="Type">
          <Select value={form.type} onChange={(e) => set("type", e.target.value as Supplier["type"])}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="ABN">
          <Input value={form.abn} onChange={(e) => set("abn", e.target.value)} placeholder="72 114 553 208" />
        </Field>
        <Field label="Contact person">
          <Input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Address">
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-ink-2">
          Species supplied <span className="text-brand">*</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {SPECIES.map((sp) => {
            const on = form.species.includes(sp);
            return (
              <button
                key={sp}
                type="button"
                onClick={() => toggleSpecies(sp)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                  on ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong bg-surface text-ink-2 hover:bg-surface-2"
                }`}
              >
                <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: SPECIES_COLOR[sp] }} />
                {sp}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Notes" className="mt-4">
        <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="Delivery days, certifications, booking lead time…" />
      </Field>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-line bg-surface-2 px-3.5 py-3">
        <div>
          <p className="text-[13px] font-medium text-ink">Supplier active</p>
          <p className="text-[11px] text-ink-muted">Dormant suppliers stay off the intake form.</p>
        </div>
        <Toggle checked={form.active} onChange={(v) => set("active", v)} label="Supplier active" />
      </div>
    </Modal>
  );
}
