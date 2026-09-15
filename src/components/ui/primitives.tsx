"use client";

import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ButtonHTMLAttributes } from "react";

/* -------------------------------- Card -------------------------------- */

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={`rounded-xl border border-line bg-surface shadow-[var(--shadow-sm)] ${padded ? "p-4 sm:p-5" : ""} ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  right,
  className = "",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`mb-4 flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p> : null}
      </div>
      {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
    </header>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-2">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 no-print">{actions}</div> : null}
    </div>
  );
}

/* ------------------------------- Button ------------------------------- */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-hover border border-transparent shadow-[var(--shadow-sm)]",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-surface-2 shadow-[var(--shadow-sm)]",
  subtle: "bg-surface-3 text-ink border border-transparent hover:bg-line",
  ghost: "bg-transparent text-ink-2 border border-transparent hover:bg-surface-3 hover:text-ink",
  danger: "bg-[var(--critical)] text-white border border-transparent hover:opacity-90",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-2.5 text-[13px] gap-1.5 rounded-lg",
  md: "h-9.5 px-3.5 text-sm gap-2 rounded-lg",
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  label,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* -------------------------------- Form -------------------------------- */

export function Field({
  label,
  hint,
  children,
  className = "",
  required,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-ink-2">
        {label}
        {required ? <span className="text-brand"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-ink-muted">{hint}</span> : null}
    </label>
  );
}

const CONTROL =
  "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted transition-colors focus:border-brand focus:outline-none disabled:opacity-50";

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${CONTROL} ${className}`} {...rest} />;
}

export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${CONTROL} cursor-pointer pr-8 ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${CONTROL} min-h-20 resize-y ${className}`} {...rest} />;
}

/* -------------------------------- Badge ------------------------------- */

export type Tone = "neutral" | "good" | "warning" | "critical" | "info" | "brand";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-3 text-ink-2 border-line",
  good: "bg-[var(--good-soft)] text-[var(--good)] border-[color-mix(in_srgb,var(--good)_28%,transparent)]",
  warning:
    "bg-[var(--warning-soft)] text-[color-mix(in_srgb,var(--warning)_78%,var(--ink))] border-[color-mix(in_srgb,var(--warning)_35%,transparent)]",
  critical:
    "bg-[var(--critical-soft)] text-[var(--critical)] border-[color-mix(in_srgb,var(--critical)_30%,transparent)]",
  info: "bg-[var(--info-soft)] text-[var(--s1)] border-[color-mix(in_srgb,var(--s1)_28%,transparent)]",
  brand: "bg-brand-soft text-brand-ink border-[color-mix(in_srgb,var(--brand)_28%,transparent)]",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
  dot,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium ${TONES[tone]} ${className}`}
    >
      {dot ? <i className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} /> : null}
      {children}
    </span>
  );
}

/* ------------------------------- Toggle ------------------------------- */

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-5.5 w-10 shrink-0 rounded-full border transition-colors ${
        checked ? "border-transparent bg-brand" : "border-line-strong bg-surface-3"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
          checked ? "left-[1.3rem]" : "left-0.5"
        }`}
      />
    </button>
  );
}

/* ------------------------- Segmented control -------------------------- */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  size?: Size;
}) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-surface-3 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-[6px] font-medium transition-colors ${
            size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3 py-1.5 text-[13px]"
          } ${
            value === o.value
              ? "bg-surface text-ink shadow-[var(--shadow-sm)]"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ Empty --------------------------------- */

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-surface-2 px-6 py-12 text-center">
      {icon ? <div className="text-ink-muted">{icon}</div> : null}
      <p className="text-sm font-medium text-ink">{title}</p>
      {body ? <p className="max-w-sm text-xs text-ink-muted">{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/* ------------------------------ Progress ------------------------------ */

export function Meter({
  value,
  max,
  color = "var(--brand)",
  className = "",
}: {
  value: number;
  max: number;
  color?: string;
  className?: string;
}) {
  const p = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-surface-3 ${className}`}>
      <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, background: color }} />
    </div>
  );
}
