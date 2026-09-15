"use client";

import { Download, Mail, MapPin, Pencil, Phone, Plus, Store, Trash2 } from "lucide-react";
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
import { REVENUE_STATUSES, orderValue, sum } from "@/lib/analytics";
import { downloadCSV } from "@/lib/csv";
import { presetRange } from "@/lib/dates";
import { initials, money, num } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Customer } from "@/lib/types";

const TYPES: Customer["type"][] = [
  "Restaurant",
  "Pub / Bistro",
  "Hotel",
  "Cafe",
  "Retail Butcher",
  "Caterer",
];
const TERMS: Customer["paymentTerms"][] = ["COD", "7 days", "14 days", "30 days"];

export default function CustomersPage() {
  const customers = useStore((s) => s.customers);
  const orders = useStore((s) => s.orders);
  const upsert = useStore((s) => s.upsertCustomer);
  const remove = useStore((s) => s.removeCustomer);
  const newId = useStore((s) => s.newId);
  const { push } = useToast();

  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);

  const range90 = useMemo(() => presetRange("last90"), []);
  const spend = useMemo(() => {
    const acc = new Map<string, { revenue: number; orders: number; last: string }>();
    for (const o of orders) {
      if (!REVENUE_STATUSES.includes(o.status)) continue;
      const cur = acc.get(o.customerId) ?? { revenue: 0, orders: 0, last: "" };
      cur.revenue += orderValue(o);
      cur.orders += 1;
      if (o.orderDate > cur.last) cur.last = o.orderDate;
      acc.set(o.customerId, cur);
    }
    return acc;
  }, [orders]);

  const recent = useMemo(() => {
    const acc = new Map<string, number>();
    for (const o of orders) {
      if (o.orderDate < range90.from || !REVENUE_STATUSES.includes(o.status)) continue;
      acc.set(o.customerId, (acc.get(o.customerId) ?? 0) + orderValue(o));
    }
    return [...acc.entries()]
      .map(([id, v]) => ({ id, v }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 8);
  }, [orders, range90]);

  const active = customers.filter((c) => c.active);
  const totalRevenue = sum([...spend.values()], (s) => s.revenue);

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Account",
      value: (c) => c.name,
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-3 text-[11px] font-semibold text-ink-2">
            {initials(c.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{c.name}</p>
            <p className="truncate text-[11px] text-ink-muted">{c.contactName}</p>
          </div>
        </div>
      ),
    },
    { key: "type", header: "Type", value: (c) => c.type, hideBelow: "md", render: (c) => <Badge tone="neutral">{c.type}</Badge> },
    { key: "suburb", header: "Suburb", value: (c) => c.suburb, hideBelow: "sm" },
    {
      key: "terms",
      header: "Terms",
      value: (c) => c.paymentTerms,
      hideBelow: "lg",
      render: (c) => <span className="text-ink-2">{c.paymentTerms}</span>,
    },
    {
      key: "orders",
      header: "Orders",
      value: (c) => spend.get(c.id)?.orders ?? 0,
      align: "right",
      hideBelow: "sm",
      render: (c) => num(spend.get(c.id)?.orders ?? 0),
    },
    {
      key: "revenue",
      header: "Lifetime value",
      value: (c) => spend.get(c.id)?.revenue ?? 0,
      align: "right",
      render: (c) => <span className="font-semibold text-ink">{money(spend.get(c.id)?.revenue ?? 0)}</span>,
    },
    {
      key: "credit",
      header: "Credit limit",
      value: (c) => c.creditLimit,
      align: "right",
      hideBelow: "lg",
      render: (c) => money(c.creditLimit),
    },
    {
      key: "active",
      header: "Status",
      value: (c) => (c.active ? 1 : 0),
      render: (c) => (c.active ? <Badge tone="good">Active</Badge> : <Badge tone="neutral">On hold</Badge>),
    },
    {
      key: "actions",
      header: "",
      sortable: false,
      align: "right",
      render: (c) => (
        <div className="flex justify-end gap-0.5">
          <IconButton label="Edit" onClick={(e) => { e.stopPropagation(); setEditing(c); }}>
            <Pencil size={14} />
          </IconButton>
          <IconButton label="Delete" onClick={(e) => { e.stopPropagation(); setDeleting(c); }}>
            <Trash2 size={14} />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Wholesale accounts across greater Hobart"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                downloadCSV(
                  "customers",
                  customers.map((c) => ({
                    Name: c.name,
                    Type: c.type,
                    Contact: c.contactName,
                    Phone: c.phone,
                    Email: c.email,
                    Address: `${c.address}, ${c.suburb}`,
                    Terms: c.paymentTerms,
                    CreditLimit: c.creditLimit,
                    LifetimeValue: (spend.get(c.id)?.revenue ?? 0).toFixed(2),
                    Active: c.active ? "Yes" : "No",
                  })),
                )
              }
            >
              <Download size={15} /> Export
            </Button>
            <Button variant="primary" onClick={() => setEditing(blankCustomer(newId("cus")))}>
              <Plus size={15} /> New customer
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Accounts" value={num(customers.length)} sub={`${num(active.length)} active`} icon={<Store size={16} />} accent="var(--s1)" />
        <StatTile label="Lifetime revenue" value={money(totalRevenue)} accent="var(--s3)" />
        <StatTile
          label="Avg account value"
          value={money(active.length ? totalRevenue / active.length : 0)}
          accent="var(--s2)"
        />
        <StatTile label="Total credit extended" value={money(sum(active, (c) => c.creditLimit))} accent="var(--s4)" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card>
          <DataTable
            rows={customers}
            columns={columns}
            pageSize={12}
            searchPlaceholder="Search account, contact or suburb…"
            searchKeys={(c) => `${c.name} ${c.contactName} ${c.suburb} ${c.type} ${c.email}`}
            onRowClick={(c) => setEditing(c)}
            initialSort={{ key: "revenue", dir: "desc" }}
            emptyTitle="No customers yet"
            emptyBody="Add your first wholesale account to start taking orders."
          />
        </Card>

        <Card>
          <CardHeader title="Top accounts — last 90 days" subtitle="By order value" />
          <RankedBars
            rows={recent.map((r) => ({
              id: r.id,
              label: customers.find((c) => c.id === r.id)?.name ?? "Unknown",
              value: r.v,
            }))}
            fmt={(v) => money(v)}
          />
        </Card>
      </div>

      {editing && (
        <CustomerForm
          customer={editing}
          onClose={() => setEditing(null)}
          onSave={(c) => {
            upsert(c);
            setEditing(null);
            push(`${c.name} saved.`);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete customer?"
        body={`${deleting?.name} will be removed. Their past orders stay in the system.`}
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

function blankCustomer(id: string): Customer {
  return {
    id,
    name: "",
    type: "Restaurant",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    suburb: "",
    paymentTerms: "14 days",
    creditLimit: 5000,
    active: true,
  };
}

function CustomerForm({
  customer,
  onClose,
  onSave,
}: {
  customer: Customer;
  onClose: () => void;
  onSave: (c: Customer) => void;
}) {
  const [form, setForm] = useState<Customer>(customer);
  const set = <K extends keyof Customer>(k: K, v: Customer[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal
      open
      onClose={onClose}
      title={customer.name ? `Edit ${customer.name}` : "New customer account"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!form.name} onClick={() => onSave(form)}>
            Save customer
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name" required className="sm:col-span-2">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Salamanca Grill House" />
        </Field>
        <Field label="Account type">
          <Select value={form.type} onChange={(e) => set("type", e.target.value as Customer["type"])}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Contact person">
          <Input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(03) 6223 1140" />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Street address">
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="Suburb">
          <Input value={form.suburb} onChange={(e) => set("suburb", e.target.value)} placeholder="Battery Point" />
        </Field>
        <Field label="Payment terms">
          <Select value={form.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value as Customer["paymentTerms"])}>
            {TERMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Credit limit (AUD)">
          <Input type="number" value={form.creditLimit} onChange={(e) => set("creditLimit", Number(e.target.value))} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="Cut specs, delivery access, allergies…" />
        </Field>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-line bg-surface-2 px-3.5 py-3">
        <div>
          <p className="text-[13px] font-medium text-ink">Account active</p>
          <p className="text-[11px] text-ink-muted">Inactive accounts can&apos;t be selected on new orders.</p>
        </div>
        <Toggle checked={form.active} onChange={(v) => set("active", v)} label="Account active" />
      </div>

      {(form.phone || form.email || form.address) && (
        <div className="mt-3 flex flex-wrap gap-3 text-[11.5px] text-ink-muted">
          {form.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone size={12} /> {form.phone}
            </span>
          )}
          {form.email && (
            <span className="inline-flex items-center gap-1">
              <Mail size={12} /> {form.email}
            </span>
          )}
          {form.address && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} /> {form.address}, {form.suburb}
            </span>
          )}
        </div>
      )}
    </Modal>
  );
}
