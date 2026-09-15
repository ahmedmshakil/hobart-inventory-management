"use client";

import { Download, Pencil, Plus, Trash2, Truck } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type Column } from "@/components/ui/DataTable";
import { DateRangeBar } from "@/components/ui/DateRangeBar";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { StatTile } from "@/components/ui/StatTile";
import { IntakeStatusBadge } from "@/components/ui/badges";
import { Badge, Button, Card, Field, IconButton, Input, PageHeader, Select, Textarea } from "@/components/ui/primitives";
import { SPECIES_COLOR, sum } from "@/lib/analytics";
import { downloadCSV } from "@/lib/csv";
import { inRange, todayISO } from "@/lib/dates";
import { compactKg, dateLabel, kg, money, num, pct } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { useRange } from "@/lib/useRange";
import { SPECIES, SPECIES_ANIMAL, type IntakeBatch, type IntakeStatus, type Species } from "@/lib/types";

const STATUSES: IntakeStatus[] = ["Received", "In Processing", "Processed"];

function blank(id: string): IntakeBatch {
  const today = todayISO();
  return {
    id,
    batchCode: `IB-${today.slice(2, 4)}${today.slice(5, 7)}-${Math.floor(1000 + Math.random() * 8999)}`,
    supplierId: "",
    species: "Beef",
    headCount: 1,
    liveWeightKg: 0,
    carcassWeightKg: 0,
    cost: 0,
    arrivalDate: today,
    invoiceNo: "",
    nvdNumber: "",
    status: "Received",
  };
}

export default function IntakePage() {
  const { preset, range, onChange } = useRange("last30");
  const intakes = useStore((s) => s.intakes);
  const suppliers = useStore((s) => s.suppliers);
  const upsert = useStore((s) => s.upsertIntake);
  const remove = useStore((s) => s.removeIntake);
  const newId = useStore((s) => s.newId);
  const { push } = useToast();

  const [editing, setEditing] = useState<IntakeBatch | null>(null);
  const [deleting, setDeleting] = useState<IntakeBatch | null>(null);
  const [speciesFilter, setSpeciesFilter] = useState<"all" | Species>("all");

  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "—";

  const rows = useMemo(
    () =>
      intakes
        .filter((b) => inRange(b.arrivalDate, range))
        .filter((b) => speciesFilter === "all" || b.species === speciesFilter)
        .sort((a, b) => b.arrivalDate.localeCompare(a.arrivalDate)),
    [intakes, range, speciesFilter],
  );

  const totals = useMemo(
    () => ({
      head: sum(rows, (r) => r.headCount),
      live: sum(rows, (r) => r.liveWeightKg),
      carcass: sum(rows, (r) => r.carcassWeightKg),
      cost: sum(rows, (r) => r.cost),
    }),
    [rows],
  );

  const columns: Column<IntakeBatch>[] = [
    {
      key: "batchCode",
      header: "Batch",
      value: (r) => r.batchCode,
      render: (r) => (
        <div>
          <p className="font-medium text-ink">{r.batchCode}</p>
          <p className="text-[11px] text-ink-muted">NVD {r.nvdNumber || "—"}</p>
        </div>
      ),
    },
    {
      key: "arrivalDate",
      header: "Arrived",
      value: (r) => r.arrivalDate,
      render: (r) => <span className="tabnum">{dateLabel(r.arrivalDate)}</span>,
    },
    {
      key: "species",
      header: "Species",
      value: (r) => r.species,
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: SPECIES_COLOR[r.species] }} />
          <span className="text-ink">{r.species}</span>
          <span className="hidden text-[11px] text-ink-muted lg:inline">{SPECIES_ANIMAL[r.species]}</span>
        </span>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
      value: (r) => supplierName(r.supplierId),
      hideBelow: "md",
      render: (r) => <span className="text-ink-2">{supplierName(r.supplierId)}</span>,
    },
    { key: "headCount", header: "Head", value: (r) => r.headCount, align: "right" },
    {
      key: "liveWeightKg",
      header: "Live wt",
      value: (r) => r.liveWeightKg,
      align: "right",
      hideBelow: "sm",
      render: (r) => num(r.liveWeightKg, 0),
    },
    {
      key: "carcassWeightKg",
      header: "Carcass wt",
      value: (r) => r.carcassWeightKg,
      align: "right",
      render: (r) => num(r.carcassWeightKg, 0),
    },
    {
      key: "dressing",
      header: "Dressing",
      value: (r) => (r.liveWeightKg ? (r.carcassWeightKg / r.liveWeightKg) * 100 : 0),
      align: "right",
      hideBelow: "lg",
      render: (r) => pct(r.liveWeightKg ? (r.carcassWeightKg / r.liveWeightKg) * 100 : 0),
    },
    {
      key: "cost",
      header: "Cost",
      value: (r) => r.cost,
      align: "right",
      hideBelow: "md",
      render: (r) => money(r.cost),
    },
    {
      key: "status",
      header: "Status",
      value: (r) => r.status,
      render: (r) => <IntakeStatusBadge status={r.status} />,
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-0.5">
          <IconButton
            label="Edit batch"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(r);
            }}
          >
            <Pencil size={14} />
          </IconButton>
          <IconButton
            label="Delete batch"
            onClick={(e) => {
              e.stopPropagation();
              setDeleting(r);
            }}
          >
            <Trash2 size={14} />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Livestock Intake"
        subtitle="Every consignment received from farms, saleyards and service abattoirs"
        actions={
          <>
            <DateRangeBar preset={preset} range={range} onChange={onChange} />
            <Button
              variant="secondary"
              onClick={() =>
                downloadCSV(
                  `livestock-intake-${range.from}_${range.to}`,
                  rows.map((r) => ({
                    Batch: r.batchCode,
                    Arrived: r.arrivalDate,
                    Species: r.species,
                    Supplier: supplierName(r.supplierId),
                    Head: r.headCount,
                    LiveWeightKg: r.liveWeightKg,
                    CarcassWeightKg: r.carcassWeightKg,
                    DressingPct: r.liveWeightKg ? ((r.carcassWeightKg / r.liveWeightKg) * 100).toFixed(1) : "",
                    CostAUD: r.cost,
                    Invoice: r.invoiceNo,
                    NVD: r.nvdNumber,
                    Status: r.status,
                  })),
                )
              }
            >
              <Download size={15} /> Export
            </Button>
            <Button variant="primary" onClick={() => setEditing(blank(newId("int")))}>
              <Plus size={15} /> Record intake
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Consignments" value={num(rows.length)} icon={<Truck size={16} />} accent="var(--s1)" />
        <StatTile label="Head received" value={num(totals.head)} accent="var(--s2)" />
        <StatTile
          label="Carcass weight in"
          value={compactKg(totals.carcass)}
          sub={`live ${compactKg(totals.live)} · dressing ${pct(totals.live ? (totals.carcass / totals.live) * 100 : 0)}`}
          accent="var(--s3)"
        />
        <StatTile
          label="Livestock spend"
          value={money(totals.cost)}
          sub={totals.carcass ? `${money(totals.cost / totals.carcass, true)} / carcass kg` : undefined}
          accent="var(--s4)"
        />
      </div>

      <Card className="mt-4" padded>
        <DataTable
          rows={rows}
          columns={columns}
          searchPlaceholder="Search batch, NVD or invoice…"
          searchKeys={(r) => `${r.batchCode} ${r.nvdNumber} ${r.invoiceNo} ${r.species} ${supplierName(r.supplierId)}`}
          onRowClick={(r) => setEditing(r)}
          initialSort={{ key: "arrivalDate", dir: "desc" }}
          emptyTitle="No intake in this period"
          emptyBody="Widen the date range or record a new consignment."
          toolbar={
            <select
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value as "all" | Species)}
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
        <IntakeForm
          batch={editing}
          onClose={() => setEditing(null)}
          onSave={(b) => {
            upsert(b);
            setEditing(null);
            push(`Intake batch ${b.batchCode} saved.`);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete intake batch?"
        body={`${deleting?.batchCode} will be removed. Processing runs linked to it stay, but lose their source batch.`}
        onConfirm={() => {
          if (deleting) {
            remove(deleting.id);
            push(`${deleting.batchCode} deleted.`, "info");
          }
        }}
      />
    </>
  );
}

function IntakeForm({
  batch,
  onClose,
  onSave,
}: {
  batch: IntakeBatch;
  onClose: () => void;
  onSave: (b: IntakeBatch) => void;
}) {
  const suppliers = useStore((s) => s.suppliers);
  const [form, setForm] = useState<IntakeBatch>(batch);
  const set = <K extends keyof IntakeBatch>(k: K, v: IntakeBatch[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const eligible = suppliers.filter((s) => s.species.includes(form.species));
  const dressing = form.liveWeightKg ? (form.carcassWeightKg / form.liveWeightKg) * 100 : 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={batch.supplierId ? `Edit ${batch.batchCode}` : "Record livestock intake"}
      subtitle="Weights are consignment totals, not per head."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onSave(form)} disabled={!form.batchCode || !form.supplierId}>
            Save batch
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Batch code" required>
          <Input value={form.batchCode} onChange={(e) => set("batchCode", e.target.value)} />
        </Field>
        <Field label="Arrival date" required>
          <Input type="date" value={form.arrivalDate} onChange={(e) => set("arrivalDate", e.target.value)} />
        </Field>
        <Field label="Species" required>
          <Select
            value={form.species}
            onChange={(e) => {
              const sp = e.target.value as Species;
              setForm((f) => ({ ...f, species: sp, supplierId: "" }));
            }}
          >
            {SPECIES.map((s) => (
              <option key={s} value={s}>
                {s} ({SPECIES_ANIMAL[s]})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Supplier" required hint={eligible.length ? undefined : "No supplier is set up for this species yet."}>
          <Select value={form.supplierId} onChange={(e) => set("supplierId", e.target.value)}>
            <option value="">Select supplier…</option>
            {eligible.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Head count" required>
          <Input
            type="number"
            min={1}
            value={form.headCount}
            onChange={(e) => set("headCount", Number(e.target.value))}
          />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => set("status", e.target.value as IntakeStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Total live weight (kg)">
          <Input
            type="number"
            step="0.1"
            value={form.liveWeightKg}
            onChange={(e) => set("liveWeightKg", Number(e.target.value))}
          />
        </Field>
        <Field label="Total carcass weight (kg)" hint={form.liveWeightKg ? `Dressing ${pct(dressing)}` : undefined}>
          <Input
            type="number"
            step="0.1"
            value={form.carcassWeightKg}
            onChange={(e) => set("carcassWeightKg", Number(e.target.value))}
          />
        </Field>
        <Field label="Purchase cost (AUD)">
          <Input type="number" step="0.01" value={form.cost} onChange={(e) => set("cost", Number(e.target.value))} />
        </Field>
        <Field label="Supplier invoice no.">
          <Input value={form.invoiceNo} onChange={(e) => set("invoiceNo", e.target.value)} />
        </Field>
        <Field label="NVD number" hint="National Vendor Declaration">
          <Input value={form.nvdNumber} onChange={(e) => set("nvdNumber", e.target.value)} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </div>

      {form.headCount > 0 && form.carcassWeightKg > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 rounded-lg border border-line bg-surface-2 px-3.5 py-3">
          <Badge tone="info">{num(form.carcassWeightKg / form.headCount, 1)} kg carcass / head</Badge>
          <Badge tone="neutral">{kg(form.liveWeightKg)} live in</Badge>
          {form.cost > 0 && (
            <Badge tone="brand">{money(form.cost / form.carcassWeightKg, true)} per carcass kg</Badge>
          )}
        </div>
      )}
    </Modal>
  );
}
