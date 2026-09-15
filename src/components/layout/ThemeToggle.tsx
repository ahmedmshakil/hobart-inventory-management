"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";
const KEY = "hpm-theme";

function apply(mode: Mode) {
  const dark =
    mode === "dark" ||
    (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as Mode) || "system";
    setMode(saved);
    apply(saved);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((localStorage.getItem(KEY) as Mode) === "system") apply("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const set = (m: Mode) => {
    setMode(m);
    try {
      localStorage.setItem(KEY, m);
    } catch {
      /* ignore */
    }
    apply(m);
  };

  const opts: { value: Mode; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "system", icon: Monitor, label: "System" },
    { value: "dark", icon: Moon, label: "Dark" },
  ];

  return (
    <div className="inline-flex rounded-lg border border-line bg-surface-3 p-0.5 no-print">
      {opts.map((o) => {
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            onClick={() => set(o.value)}
            aria-label={`${o.label} theme`}
            title={`${o.label} theme`}
            aria-pressed={mode === o.value}
            className={`rounded-[6px] p-1.5 transition-colors ${
              mode === o.value
                ? "bg-surface text-ink shadow-[var(--shadow-sm)]"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
