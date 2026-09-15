"use client";

import { Download, Pencil, Plus, Slice, Trash2, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";

import { RankedBars } from "@/components/charts";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { DateRangeBar } from "@/components/ui/DateRangeBar";
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
  Meter,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { LOSS_PROFILE, YIELD_MAP } from "@/data/catalog";
import { SPECIES_COLOR, cutOutputs, productionSummary, runSaleableKg, sum } from "@/lib/analytics";
import { downloadCSV } from "@/lib/csv";
import { inRange, todayISO } from "@/lib/dates";
import { compactKg, dateLabel, kg, num, pct } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useRange } from "@/lib/useRange";
import { SPECIES, type ProcessingRun, type Species } from "@/lib/types";

const OPERATORS = ["Dave Mitchell", "Sam Reilly", "Priya Naidu", "Tom Clarke", "Jess Whitten", "Liam O'Connor"];

export default function ProcessingPage() {
  const { preset, range, onChange } = useRange("last30");
  const runs = useStore((s) => s.runs);
  const intakes = useStore((s) => s.intakes);
  const products = useStore((s) => s.products);
  const removeRun = useStore((s) => s.removeRun);
  const newId = useStore((s) => s.newId);
  const { push } = useToast();

  const [editing, setEditing] = useState<ProcessingRun | null>(null);
  const [deleting, setDeleting] = useState<ProcessingRun | null>(null);
  const [speciesFilter, setSpeciesFilter] = useState<"all" | Species>("all");

  const rows = useMemo(
    () =>
      runs
        .filter((r) => inRange(r.date, range))
        .filter((r) => speciesFilter === "all" || r.species === speciesFilter)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [runs, range, speciesFilter],
  );

  const prod = useMemo(() => productionSummary(rows), [rows]);
  const cuts = useMemo(() => cutOutputs(rows, products), [rows, products]);
  const batchCode = (id: string) => intakes.find((b) => b.id === id)?.batchCode ?? "—";

  const columns: Column<ProcessingRun>[] = [
    {
      key: "runCode",
      header: "Run",
      value: (r) => r.runCode,
      render: (r) => (
        <div>
          <p className="font-medium text-ink">{r.runCode}</p>
          <p className="text-[11px] text-ink-muted">from {batchCode(r.intakeBatchId)}</p>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      value: (r) => r.date,
      render: (r) => <span className="tabnum">{dateLabel(r.date)}</span>,
    },
    {
      key: "species",
      header: "Species",
      value: (r) => r.species,
      render: (r) => (
        <span className="inline-flex items-center gap-2 text-ink">
          <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: SPECIES_COLOR[r.species] }} />
          {r.species}
        </span>
      ),
    },
    { key: "headProcessed", header: "Head", value: (r) => r.headProcessed, align: "right" },
    {
      key: "carcassInputKg",
      header: "Carcass in",
      value: (r) => r.carcassInputKg,
      align: "right",
      render: (r) => num(r.carcassInputKg, 0),
    },
    {
      key: "saleable",
      header: "Saleable out",
      value: (r) => runSaleableKg(r),
      align: "right",
      render: (r) => <span className="font-medium text-ink">{num(runSaleableKg(r), 0)}</span>,
    },
    {
      key: "yield",
      header: "Yield",
      value: (r) => (r.carcassInputKg ? (runSaleableKg(r) / r.carcassInputKg) * 100 : 0),
      align: "right",
      render: (r) => {
        const y = r.carcassInputKg ? (runSaleableKg(r) / r.carcassInputKg) * 100 : 0;
        return <Badge tone={y >= 70 ? "good" : y >= 60 ? "warning" : "critical"}>{pct(y)}</Badge>;
      },
    },
    {
      key: "operator",
      header: "Operator",
      value: (r) => r.operator,
      hideBelow: "lg",
      render: (r) => <span className="text-ink-2">{r.operator}</span>,
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-0.5">
          <IconButton
            label="Edit run"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(r);
            }}
          >
            <Pencil size={14} />
          </IconButton>
          <IconButton
            label="Delete run"
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
        title="Processing Runs"
        subtitle="Boning-room breakdown — what each carcass actually turned into"
        actions={
          <>
            <DateRangeBar preset={preset} range={range} onChange={onChange} />
            <Button
              variant="secondary"
              onClick={() =>
                downloadCSV(
                  `processing-runs-${range.from}_${range.to}`,
                  rows.map((r) => ({
                    Run: r.runCode,
                    Date: r.date,
                    Species: r.species,
                    Batch: batchCode(r.intakeBatchId),
                    Head: r.headProcessed,
                    CarcassInKg: r.carcassInputKg,
                    SaleableKg: runSaleableKg(r).toFixed(1),
                    TrimKg: r.trimKg,
                    BoneKg: r.boneKg,
                    WasteKg: r.wasteKg,
                    YieldPct: r.carcassInputKg ? ((runSaleableKg(r) / r.carcassInputKg) * 100).toFixed(1) : "",
                    LabourHours: r.labourHours,
                    Operator: r.operator,
                  })),
                )
              }
            >
              <Download size={15} /> Export
            </Button>
            <Button variant="primary" onClick={() => setEditing(newRun(newId("run")))}>
              <Plus size={15} /> New run
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Runs" value={num(prod.runCount)} icon={<Slice size={16} />} accent="var(--s1)" />
        <StatTile label="Head broken down" value={num(prod.headProcessed)} accent="var(--s2)" />
        <StatTile
          label="Saleable produced"
          value={compactKg(prod.saleableKg)}
          sub={`from ${compactKg(prod.carcassInKg)} carcass`}
          accent="var(--s3)"
        />
        <StatTile
          label="Average boning yield"
          value={pct(prod.boningYieldPct)}
          sub={`${compactKg(prod.trimKg + prod.boneKg + prod.wasteKg)} trim, bone & waste`}
          accent="var(--s4)"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <DataTable
            rows={rows}
            columns={columns}
            searchPlaceholder="Search run, batch or operator…"
            searchKeys={(r) => `${r.runCode} ${r.species} ${r.operator} ${batchCode(r.intakeBatchId)}`}
            onRowClick={(r) => setEditing(r)}
            initialSort={{ key: "date", dir: "desc" }}
            emptyTitle="No processing runs in this period"
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

        <div className="space-y-4">
          <Card>
            <CardHeader title="Where the carcass went" subtitle="Share of total carcass weight in" />
            {prod.carcassInKg > 0 ? (
              <ul className="space-y-3">
                {[
                  { label: "Saleable cuts", v: prod.saleableKg, c: "var(--s3)" },
                  { label: "Trim", v: prod.trimKg, c: "var(--s4)" },
                  { label: "Bone", v: prod.boneKg, c: "var(--s1)" },
                  { label: "Waste", v: prod.wasteKg, c: "var(--s2)" },
                ].map((x) => (
                  <li key={x.label}>
                    <div className="mb-1 flex items-baseline justify-between text-[13px]">
                      <span className="text-ink">{x.label}</span>
                      <span className="tabnum text-ink-2">
                        {kg(x.v, 0)} · {pct((x.v / prod.carcassInKg) * 100)}
                      </span>
                    </div>
                    <Meter value={x.v} max={prod.carcassInKg} color={x.c} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-xs text-ink-muted">No runs in this period.</p>
            )}
          </Card>

          <Card>
            <CardHeader title="Top cuts produced" subtitle={`${cuts.length} distinct cuts`} />
            <RankedBars
              rows={cuts.slice(0, 8).map((c) => ({
                id: c.product.id,
                label: c.product.name,
                sub: c.product.unit === "piece" ? `${num(c.pieces)} pcs` : undefined,
                value: c.kg,
                color: SPECIES_COLOR[c.product.species],
              }))}
              fmt={(v) => kg(v, 0)}
            />
          </Card>
        </div>
      </div>

      {editing && <RunForm run={editing} onClose={() => setEditing(null)} onSaved={(m) => push(m)} />}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete processing run?"
        body={`${deleting?.runCode} and any stock lots created by it will be removed.`}
        onConfirm={() => {
          if (deleting) {
            removeRun(deleting.id);
            push(`${deleting.runCode} deleted.`, "info");
          }
        }}
      />
    </>
  );
}

function newRun(id: string): ProcessingRun {
  const today = todayISO();
  return {
    id,
    runCode: `PR-${today.slice(2, 4)}${today.slice(5, 7)}-${Math.floor(1000 + Math.random() * 8999)}`,
    intakeBatchId: "",
    species: "Beef",
    date: today,
    headProcessed: 0,
    carcassInputKg: 0,
    outputs: [],
    trimKg: 0,
    boneKg: 0,
    wasteKg: 0,
    labourHours: 0,
    operator: OPERATORS[0],
  };
}

function RunForm({
  run,
  onClose,
  onSaved,
}: {
  run: ProcessingRun;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const intakes = useStore((s) => s.intakes);
  const products = useStore((s) => s.products);
  const upsertRun = useStore((s) => s.upsertRun);
  const [form, setForm] = useState<ProcessingRun>(run);
  const isNew = run.outputs.length === 0 && !run.intakeBatchId;

  const set = <K extends keyof ProcessingRun>(k: K, v: ProcessingRun[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const openBatches = intakes
    .filter((b) => b.status !== "Processed" || b.id === form.intakeBatchId)
    .sort((a, b) => b.arrivalDate.localeCompare(a.arrivalDate))
    .slice(0, 60);

  const speciesProducts = products.filter((p) => p.species === form.species && p.active);
  const outMap = new Map(form.outputs.map((o) => [o.productId, o]));
  const saleable = sum(form.outputs, (o) => o.qtyKg);
  const yieldPct = form.carcassInputKg ? (saleable / form.carcassInputKg) * 100 : 0;
  const accounted = saleable + form.trimKg + form.boneKg + form.wasteKg;

  const pickBatch = (id: string) => {
    const b = intakes.find((x) => x.id === id);
    if (!b) return set("intakeBatchId", id);
    setForm((f) => ({
      ...f,
      intakeBatchId: id,
      species: b.species,
      headProcessed: b.headCount,
      carcassInputKg: b.carcassWeightKg,
      outputs: [],
    }));
  };

  const autoFill = () => {
    const loss = LOSS_PROFILE[form.species];
    const outputs = products
      .filter((p) => p.species === form.species && p.active && YIELD_MAP[p.id])
      .map((p) => {
        const qtyKg = Number((form.carcassInputKg * (YIELD_MAP[p.id] / 100)).toFixed(1));
        return {
          productId: p.id,
          qtyKg,
          pieces: p.unit === "piece" ? Math.max(0, Math.round(qtyKg / p.avgPieceKg)) : 0,
        };
      });
    setForm((f) => ({
      ...f,
      outputs,
      trimKg: Number((f.carcassInputKg * (loss.trim / 100)).toFixed(1)),
      boneKg: Number((f.carcassInputKg * (loss.bone / 100)).toFixed(1)),
      wasteKg: Number((f.carcassInputKg * (loss.waste / 100)).toFixed(1)),
    }));
  };

  const setOutput = (productId: string, qtyKg: number) => {
    const p = products.find((x) => x.id === productId)!;
    const pieces = p.unit === "piece" ? Math.max(0, Math.round(qtyKg / p.avgPieceKg)) : 0;
    setForm((f) => {
      const rest = f.outputs.filter((o) => o.productId !== productId);
      return qtyKg > 0 ? { ...f, outputs: [...rest, { productId, qtyKg, pieces }] } : { ...f, outputs: rest };
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "New processing run" : `Edit ${form.runCode}`}
      subtitle="Enter what came off the boning table. Stock lots are created automatically for new runs."
      width="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!form.intakeBatchId || form.carcassInputKg <= 0 || form.outputs.length === 0}
            onClick={() => {
              upsertRun(form, isNew);
              onSaved(
                isNew
                  ? `Run ${form.runCode} saved — ${form.outputs.length} stock lots created.`
                  : `Run ${form.runCode} updated.`,
              );
              onClose();
            }}
          >
            Save run
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Run code" required>
          <Input value={form.runCode} onChange={(e) => set("runCode", e.target.value)} />
        </Field>
        <Field label="Processing date" required>
          <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Operator">
          <Select value={form.operator} onChange={(e) => set("operator", e.target.value)}>
            {OPERATORS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Source intake batch" required className="sm:col-span-2">
          <Select value={form.intakeBatchId} onChange={(e) => pickBatch(e.target.value)}>
            <option value="">Select a batch…</option>
            {openBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.batchCode} · {b.species} · {b.headCount} head · {b.carcassWeightKg} kg carcass
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Labour hours">
          <Input
            type="number"
            step="0.1"
            value={form.labourHours}
            onChange={(e) => set("labourHours", Number(e.target.value))}
          />
        </Field>
        <Field label="Head processed">
          <Input
            type="number"
            value={form.headProcessed}
            onChange={(e) => set("headProcessed", Number(e.target.value))}
          />
        </Field>
        <Field label="Carcass weight in (kg)" required>
          <Input
            type="number"
            step="0.1"
            value={form.carcassInputKg}
            onChange={(e) => set("carcassInputKg", Number(e.target.value))}
          />
        </Field>
        <div className="flex items-end">
          <Button variant="secondary" className="w-full" onClick={autoFill} disabled={!form.carcassInputKg}>
            <Wand2 size={15} /> Auto-fill standard yield
          </Button>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-line bg-surface-2 p-3.5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-[13px] font-semibold text-ink">Cut output</h4>
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">{kg(saleable, 1)} saleable</Badge>
            <Badge tone={yieldPct >= 70 ? "good" : yieldPct >= 60 ? "warning" : "critical"}>
              {pct(yieldPct)} yield
            </Badge>
            {form.carcassInputKg > 0 && (
              <Badge tone={Math.abs(accounted - form.carcassInputKg) < form.carcassInputKg * 0.02 ? "good" : "warning"}>
                {kg(accounted, 1)} of {kg(form.carcassInputKg, 1)} accounted
              </Badge>
            )}
          </div>
        </div>

        <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {speciesProducts.map((p) => {
            const o = outMap.get(p.id);
            return (
              <div
                key={p.id}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-lg bg-surface px-2.5 py-1.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-ink">{p.name}</p>
                  <p className="text-[10.5px] text-ink-muted">
                    {p.sku} · target {YIELD_MAP[p.id] ?? 0}% of carcass
                  </p>
                </div>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={o?.qtyKg ?? ""}
                  placeholder="0"
                  onChange={(e) => setOutput(p.id, Number(e.target.value))}
                  className="h-8 w-24 rounded-lg border border-line-strong bg-surface px-2 text-right text-[13px] tabnum text-ink focus:border-brand focus:outline-none"
                />
                <span className="w-20 text-right text-[11px] tabnum text-ink-muted">
                  {p.unit === "piece" ? `${num(o?.pieces ?? 0)} pcs` : "kg"}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Trim (kg)">
            <Input type="number" step="0.1" value={form.trimKg} onChange={(e) => set("trimKg", Number(e.target.value))} />
          </Field>
          <Field label="Bone (kg)">
            <Input type="number" step="0.1" value={form.boneKg} onChange={(e) => set("boneKg", Number(e.target.value))} />
          </Field>
          <Field label="Waste (kg)">
            <Input type="number" step="0.1" value={form.wasteKg} onChange={(e) => set("wasteKg", Number(e.target.value))} />
          </Field>
        </div>
      </div>

      <Field label="Run notes" className="mt-4">
        <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
      </Field>
    </Modal>
  );
}
