"use client";

import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ToastTone = "success" | "info" | "warning";
interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

const Ctx = createContext<{ push: (m: string, t?: ToastTone) => void }>({ push: () => {} });

export const useToast = () => useContext(Ctx);

const ICONS: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 size={16} style={{ color: "var(--good)" }} />,
  info: <Info size={16} style={{ color: "var(--s1)" }} />,
  warning: <TriangleAlert size={16} style={{ color: "var(--warning)" }} />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: ToastTone = "success") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3600);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className="animate-pop pointer-events-auto flex items-start gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-3 shadow-[var(--shadow-md)]"
          >
            <span className="mt-0.5 shrink-0">{ICONS[t.tone]}</span>
            <p className="flex-1 text-[13px] leading-snug text-ink">{t.message}</p>
            <button
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
              className="-mr-1 -mt-0.5 rounded p-1 text-ink-muted hover:text-ink"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
