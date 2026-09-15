"use client";

import { Download, Pencil, Plus, Recycle, Trash2, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { ChartCard, Donut, MultiLine, RankedBars } from "@/components/charts";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { DateRangeBar } from "@/components/ui/DateRangeBar";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { StatTile } from "@/components/ui/StatTile";
import { useToast } from "@/components/ui/Toast";
import { WasteReasonBadge } from "@/components/ui/badges";
import {
  Button,
  Card,
  CardHeader,
  Field,
  IconButton,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { SPECIES_COLOR, productionSummary, trendSeries, wastageSummary } from "@/lib/analytics";
import { downloadCSV } from "@/lib/csv";
import { autoBucket, bucketLabel, inRange, todayISO } from "@/lib/dates";
import { compactKg, dateLabel, kg, money, num, pct } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useRange } from "@/lib/useRange";
import { SPECIES, WASTE_REASONS, type Species, type WasteReason, type WasteRecord } from "@/lib/types";

export default function WastagePage() {
  const { preset, range, onChange } = useRange("last30");
  const wastage = useStore((s) => s.wastage);
  const runs = useStore((s) => s.runs);
  const orders = useStore((s) => s.orders);
  const products = useStore((s) => s.products);
  const upsert = useStore((s) => s.upsertWaste);
  const remove = useStore((s) => s.removeWaste);
  const newId = useStore((s) => s.newId);
  const { push } = useToast();

  const [editing, setEditing] = useState<WasteRecord | null>(null);
  const [deleting, setDeleting] = useState<WasteRecord | null>(null);
  const [reasonFilter, setReasonFilter] = useState<"all" | WasteReason>("all");

  const rows = useMemo(
    () =>
      wastage
        .filter((w) => inRange(w.date, range))
        .filter((w) => reasonFilter === "all" || w.reason === reasonFilter)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [wastage, range, reasonFilter],
  );

  const summary = useMemo(() => wastageSummary(wastage, range), [wastage, range]);
  const prod = useMemo(() => productionSummary(runs, range), [runs, range]);
  const bucket = autoBucket(range);
  const trend = useMemo(
    () => trendSeries(range, bucket, runs, orders, wastage, (k) => bucketLabel(k, bucket)),
    [range, bucket, runs, orders, wastage],
  );

  const pname = (id: string | null) => (id ? (products.find((p) => p.id === id)?.name ?? "—") : "Whole run");

  const bySpecies = SPECIES.map((s) => ({
    name: s,
    value: rows.filter((w) => w.species === s).reduce((a, w) => a + w.qtyKg, 0),
    color: SPECIES_COLOR[s],
  }));

  const columns: Column<WasteRecord>[] = [
    {
      key: "date",
      header: "Date",
      value: (w) => w.date,
      render: (w) => <span className="tabnum text-ink">{dateLabel(w.date)}</span>,
    },
    {
      key: "reason",
      header: "Reason",
      value: (w) => w.reason,
      render: (w) => <WasteReasonBadge reason={w.reason} />,
    },
    {
      key: "species",
      header: "Species",
      value: (w) => w.species,
      hideBelow: "md",
      render: (w) => (
        <span className="inline-flex items-center gap-2 text-ink-2">
          <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: SPECIES_COLOR[w.species] }} />
          {w.species}
        </span>
      ),
    },
    {
      key: "product",
      header: "Product / source",
      value: (w) => pname(w.productId),
      hideBelow: "sm",
      render: (w) => <span className="text-ink-2">{pname(w.productId)}</span>,
    },
    {
      key: "qtyKg",
      header: "Quantity",
      value: (w) => w.qtyKg,
      align: "right",
      render: (w) => <span className="font-semibold text-ink">{num(w.qtyKg, 1)} kg</span>,
    },
    {
      key: "costValue",
      header: "Value",
      value: (w) => w.costValue,
      align: "right",
      render: (w) => money(w.costValue),
    },
    {
      key: "recordedBy",
      header: "Recorded by",
      value: (w) => w.recordedBy,
      hideBelow: "lg",
      render: (w) => <span className="text-ink-2">{w.recordedBy}</span>,
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      align: "right",
      render: (w) => (
        <div className="flex justify-end gap-0.5">
          <IconButton label="Edit" onClick={(e) => { e.stopPropagation(); setEditing(w); }}>
            <Pencil size={14} />
          </IconButton>
          <IconButton label="Delete" onClick={(e) => { e.stopPropagation(); setDeleting(w); }}>
            <Trash2 size={14} />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Wastage & Trim"
        subtitle="Everything that did not become a saleable cut — and what it cost"
        actions={
          <>
            <DateRangeBar preset={preset} range={range} onChange={onChange} />
            <Button
              variant="secondary"
              onClick={() =>
                downloadCSV(
                  `wastage-${range.from}_${range.to}`,
                  rows.map((w) => ({
                    Date: w.date,
                    Reason: w.reason,
                    Species: w.species,
                    Product: pname(w.productId),
                    QtyKg: w.qtyKg,
                    ValueAUD: w.costValue,
                    RecordedBy: w.recordedBy,
                    Notes: w.notes ?? "",
                  })),
                )
              }
            >
              <Download size={15} /> Export
            </Button>
            <Button variant="primary" onClick={() => setEditing(blankWaste(newId("wst")))}>
              <Plus size={15} /> Record wastage
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total loss"
          value={compactKg(summary.totalKg)}
          sub={`${pct(prod.carcassInKg ? (summary.totalKg / prod.carcassInKg) * 100 : 0)} of carcass in`}
          icon={<Recycle size={16} />}
          accent="var(--s1)"
        />
        <StatTile
          label="Avoidable loss"
          value={compactKg(summary.avoidableKg)}
          sub="excludes trim & bone"
          icon={<TriangleAlert size={16} />}
          accent="var(--s2)"
        />
        <StatTile label="Value written off" value={money(summary.avoidableValue)} sub="avoidable only" accent="var(--s8)" />
        <StatTile label="Records" value={num(summary.count)} sub={`${num(rows.length)} in view`} accent="var(--s4)" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Loss trend"
          subtitle={`${bucket === "day" ? "Daily" : bucket === "week" ? "Weekly" : "Monthly"} total loss`}
          legend={[{ key: "wasteKg", label: "Loss (kg)", color: "var(--s2)" }]}
          height={230}
          table={
            <table className="w-full text-[12px]">
              <tbody className="tabnum">
                {trend.map((t) => (
                  <tr key={t.key} className="border-b border-line/60">
                    <td className="py-1.5 text-ink-2">{t.label}</td>
                    <td className="py-1.5 text-right font-medium text-ink">{num(t.wasteKg, 0)} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <MultiLine data={trend} keys={[{ key: "wasteKg", label: "Loss (kg)", color: "var(--s2)" }]} fmt={compactKg} />
        </ChartCard>

        <ChartCard
          title="By species"
          subtitle="Share of recorded loss"
          height={230}
          legend={bySpecies.map((b) => ({ key: b.name, label: b.name, color: b.color }))}
          table={
            <table className="w-full text-[12px]">
              <tbody className="tabnum">
                {bySpecies.map((b) => (
                  <tr key={b.name} className="border-b border-line/60">
                    <td className="py-1.5 text-ink-2">{b.name}</td>
                    <td className="py-1.5 text-right font-medium text-ink">{num(b.value, 0)} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <Donut
            data={bySpecies}
            centerValue={compactKg(summary.totalKg)}
            centerLabel="total loss"
            fmt={(v) => `${num(v, 0)} kg`}
          />
        </ChartCard>

        <Card>
          <CardHeader title="By reason" subtitle="Weight and written-off value" />
          <RankedBars
            rows={summary.byReason.map((r) => ({
              id: r.reason,
              label: r.reason,
              sub: money(r.value),
              value: r.kg,
            }))}
            fmt={(v) => kg(v, 0)}
          />
        </Card>
      </div>

      <Card className="mt-4">
        <DataTable
          rows={rows}
          columns={columns}
          pageSize={14}
          searchPlaceholder="Search reason, product or operator…"
          searchKeys={(w) => `${w.reason} ${w.species} ${pname(w.productId)} ${w.recordedBy} ${w.notes ?? ""}`}
          onRowClick={(w) => setEditing(w)}
          initialSort={{ key: "date", dir: "desc" }}
          emptyTitle="No wastage recorded in this period"
          toolbar={
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value as "all" | WasteReason)}
              className="h-9 rounded-lg border border-line-strong bg-surface px-2.5 text-[13px] text-ink focus:border-brand focus:outline-none"
            >
              <option value="all">All reasons</option>
              {WASTE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          }
        />
      </Card>

      {editing && (
        <WasteForm
          record={editing}
          onClose={() => setEditing(null)}
          onSave={(w) => {
            upsert(w);
            setEditing(null);
            push(`${w.reason} loss of ${kg(w.qtyKg)} recorded.`);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete wastage record?"
        body="This record will be removed from loss reporting."
        onConfirm={() => {
          if (deleting) {
            remove(deleting.id);
            push("Wastage record deleted.", "info");
          }
        }}
      />
    </>
  );
}

function blankWaste(id: string): WasteRecord {
  return {
    id,
    date: todayISO(),
    species: "Beef",
    productId: null,
    runId: null,
    reason: "Spoilage",
    qtyKg: 0,
    costValue: 0,
    recordedBy: "Dave Mitchell",
  };
}

function WasteForm({
  record,
  onClose,
  onSave,
}: {
  record: WasteRecord;
  onClose: () => void;
  onSave: (w: WasteRecord) => void;
}) {
  const products = useStore((s) => s.products);
  const [form, setForm] = useState<WasteRecord>(record);
  const set = <K extends keyof WasteRecord>(k: K, v: WasteRecord[K]) => setForm((f) => ({ ...f, [k]: v }));
  const speciesProducts = products.filter((p) => p.species === form.species);

  return (
    <Modal
      open
      onClose={onClose}
      title={record.qtyKg ? "Edit wastage record" : "Record wastage"}
      subtitle="Trim and bone are normal by-products; everything else is avoidable loss."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={form.qtyKg <= 0} onClick={() => onSave(form)}>
            Save record
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" required>
          <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Reason" required>
          <Select value={form.reason} onChange={(e) => set("reason", e.target.value as WasteReason)}>
            {WASTE_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Species">
          <Select
            value={form.species}
            onChange={(e) => setForm((f) => ({ ...f, species: e.target.value as Species, productId: null }))}
          >
            {SPECIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Product" hint="Leave blank for whole-run trim or bone.">
          <Select value={form.productId ?? ""} onChange={(e) => set("productId", e.target.value || null)}>
            <option value="">— none (whole run) —</option>
            {speciesProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Quantity (kg)" required>
          <Input
            type="number"
            step="0.1"
            value={form.qtyKg}
            onChange={(e) => {
              const q = Number(e.target.value);
              const p = products.find((x) => x.id === form.productId);
              setForm((f) => ({ ...f, qtyKg: q, costValue: p ? Number((q * p.costPerKg).toFixed(2)) : f.costValue }));
            }}
          />
        </Field>
        <Field label="Value written off (AUD)">
          <Input type="number" step="0.01" value={form.costValue} onChange={(e) => set("costValue", Number(e.target.value))} />
        </Field>
        <Field label="Recorded by">
          <Input value={form.recordedBy} onChange={(e) => set("recordedBy", e.target.value)} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
