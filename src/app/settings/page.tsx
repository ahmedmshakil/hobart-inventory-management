"use client";

import { AlertTriangle, Database, Download, RefreshCw, Save, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  PageHeader,
  Toggle,
} from "@/components/ui/primitives";
import { DEMO_DATA_ENABLED } from "@/data/demo-seed";
import { downloadJSON } from "@/lib/csv";
import { num } from "@/lib/format";
import { STORAGE_KEY, useStore } from "@/lib/store";
import type { CompanySettings } from "@/lib/types";

export default function SettingsPage() {
  const store = useStore();
  const { push } = useToast();
  const [form, setForm] = useState<CompanySettings>(store.settings);
  const [confirm, setConfirm] = useState<"reset" | "clear" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof CompanySettings>(k: K, v: CompanySettings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const counts = [
    { label: "Products / cuts", n: store.products.length },
    { label: "Suppliers", n: store.suppliers.length },
    { label: "Customers", n: store.customers.length },
    { label: "Intake batches", n: store.intakes.length },
    { label: "Processing runs", n: store.runs.length },
    { label: "Stock lots", n: store.lots.length },
    { label: "Orders", n: store.orders.length },
    { label: "Wastage records", n: store.wastage.length },
  ];

  const exportAll = () =>
    downloadJSON(`hobart-meat-backup-${new Date().toISOString().slice(0, 10)}`, {
      exportedAt: new Date().toISOString(),
      settings: store.settings,
      products: store.products,
      suppliers: store.suppliers,
      customers: store.customers,
      coldRooms: store.coldRooms,
      intakes: store.intakes,
      runs: store.runs,
      lots: store.lots,
      orders: store.orders,
      wastage: store.wastage,
    });

  const importFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        store.importData(data);
        push("Backup imported successfully.");
      } catch {
        push("That file could not be read as a valid backup.", "warning");
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Company details, alert thresholds and data management"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Company details" subtitle="Printed on order dockets and reports" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Registered name" className="sm:col-span-2">
              <Input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
            </Field>
            <Field label="Trading name">
              <Input value={form.tradingName} onChange={(e) => set("tradingName", e.target.value)} />
            </Field>
            <Field label="ABN">
              <Input value={form.abn} onChange={(e) => set("abn", e.target.value)} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Meat processing licence">
              <Input value={form.licenceNo} onChange={(e) => set("licenceNo", e.target.value)} />
            </Field>
            <Field label="Currency">
              <Input value={form.currency} onChange={(e) => set("currency", e.target.value)} />
            </Field>
          </div>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => {
              store.updateSettings(form);
              push("Company details saved.");
            }}
          >
            <Save size={15} /> Save details
          </Button>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Alerts" subtitle="What the bell in the top bar watches for" />
            <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface-2 px-3.5 py-3">
              <div>
                <p className="text-[13px] font-medium text-ink">Low stock alerts</p>
                <p className="text-[11px] text-ink-muted">Flag cuts that fall under their re-order level.</p>
              </div>
              <Toggle
                checked={form.lowStockAlerts}
                onChange={(v) => {
                  set("lowStockAlerts", v);
                  store.updateSettings({ lowStockAlerts: v });
                }}
                label="Low stock alerts"
              />
            </div>
            <Field label="Expiry warning window (days)" className="mt-4" hint="Lots inside this window show as expiring soon.">
              <Input
                type="number"
                min={1}
                max={30}
                value={form.expiryWarningDays}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  set("expiryWarningDays", v);
                  store.updateSettings({ expiryWarningDays: v });
                }}
              />
            </Field>
          </Card>

          <Card>
            <CardHeader
              title="Cold rooms"
              subtitle={`${store.coldRooms.length} rooms configured`}
            />
            <ul className="divide-y divide-line">
              {store.coldRooms.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-[13px] font-medium text-ink">{c.name}</p>
                    <p className="text-[11px] text-ink-muted">
                      {c.kind} · {num(c.capacityKg)} kg capacity
                    </p>
                  </div>
                  <Badge tone={c.kind === "Freezer" ? "info" : "neutral"}>{c.targetTempC}°C</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Data management"
          subtitle="Everything lives in this browser. Export a backup before clearing anything."
          right={
            DEMO_DATA_ENABLED ? (
              <Badge tone="brand">Demo dataset active</Badge>
            ) : (
              <Badge tone="good">Live data mode</Badge>
            )
          }
        />

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {counts.map((c) => (
            <div key={c.label} className="rounded-lg border border-line bg-surface-2 px-3 py-2.5">
              <p className="text-[10.5px] uppercase tracking-wide text-ink-muted">{c.label}</p>
              <p className="mt-0.5 text-lg font-semibold tabnum text-ink">{num(c.n)}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportAll}>
            <Download size={15} /> Export backup (JSON)
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Import backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importFile(f);
              e.target.value = "";
            }}
          />
          <Button variant="secondary" onClick={() => setConfirm("reset")}>
            <RefreshCw size={15} /> Reload demo dataset
          </Button>
          <Button variant="danger" onClick={() => setConfirm("clear")}>
            <Trash2 size={15} /> Clear all data
          </Button>
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-[color-mix(in_srgb,var(--warning)_35%,transparent)] bg-[var(--warning-soft)] px-3.5 py-3">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: "var(--warning)" }} />
          <div className="text-[12px] leading-relaxed text-ink-2">
            <p className="font-medium text-ink">Going live with real data</p>
            <p className="mt-0.5">
              Every record shown in this build is fabricated sample data. To remove it permanently, set{" "}
              <code className="rounded bg-surface-3 px-1 py-0.5 text-[11px]">DEMO_DATA_ENABLED = false</code> in{" "}
              <code className="rounded bg-surface-3 px-1 py-0.5 text-[11px]">src/data/demo-seed.ts</code> (or delete
              that file), then use <strong>Clear all data</strong> here to wipe what is already stored in this browser
              under <code className="rounded bg-surface-3 px-1 py-0.5 text-[11px]">{STORAGE_KEY}</code>. The cut
              catalogue and cold rooms in <code className="rounded bg-surface-3 px-1 py-0.5 text-[11px]">src/data/catalog.ts</code>{" "}
              are real configuration and are kept.
            </p>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader title="About this build" subtitle="Frontend prototype — no backend required" />
        <dl className="grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
          {[
            ["Stack", "Next.js (App Router) · TypeScript · Tailwind CSS · Recharts"],
            ["State", "Zustand, persisted to browser localStorage"],
            ["Data", "Deterministic demo dataset, ~6 months of trading history"],
            ["Deployment target", "inventory.shakilahmed.tech"],
            ["Storage key", STORAGE_KEY],
            ["Backend", "None yet — the store is a drop-in seam for a real API"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-line/60 py-1.5">
              <dt className="text-ink-muted">{k}</dt>
              <dd className="text-right font-medium text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-ink-muted">
          <Database size={12} /> All data stays in this browser. Nothing is sent anywhere.
        </p>
      </Card>

      <ConfirmDialog
        open={confirm === "reset"}
        onClose={() => setConfirm(null)}
        title="Reload the demo dataset?"
        body="Any records you added or edited in this browser will be replaced with a freshly generated demo dataset."
        confirmLabel="Reload demo data"
        danger={false}
        onConfirm={() => {
          store.resetDemoData();
          push("Demo dataset reloaded.");
        }}
      />
      <ConfirmDialog
        open={confirm === "clear"}
        onClose={() => setConfirm(null)}
        title="Clear all data?"
        body="Suppliers, customers, intake, runs, stock, orders and wastage will all be deleted from this browser. The cut catalogue and cold rooms are kept. This cannot be undone."
        confirmLabel="Clear everything"
        onConfirm={() => {
          store.clearAllData();
          push("All trading data cleared. The system is now empty.", "info");
        }}
      />
    </>
  );
}
