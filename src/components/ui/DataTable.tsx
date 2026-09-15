"use client";

import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { EmptyState } from "@/components/ui/primitives";

export interface Column<T> {
  key: string;
  header: string;
  /** Value used for sorting / CSV. */
  value?: (row: T) => string | number;
  render?: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  width?: string;
  sortable?: boolean;
  hideBelow?: "sm" | "md" | "lg";
}

const HIDE: Record<string, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  searchable = true,
  searchKeys,
  searchPlaceholder = "Search…",
  pageSize = 12,
  onRowClick,
  emptyTitle = "Nothing here yet",
  emptyBody,
  toolbar,
  initialSort,
  dense = false,
}: {
  rows: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchKeys?: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyBody?: string;
  toolbar?: ReactNode;
  initialSort?: { key: string; dir: "asc" | "desc" };
  dense?: boolean;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(initialSort ?? null);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) => {
      const hay = searchKeys ? searchKeys(r) : JSON.stringify(r);
      return hay.toLowerCase().includes(needle);
    });
  }, [rows, q, searchKeys]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.value) return filtered;
    const get = col.value;
    return [...filtered].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      const r = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? r : -r;
    });
  }, [filtered, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const slice = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const pad = dense ? "px-3 py-2 whitespace-nowrap" : "px-3 py-2.5 whitespace-nowrap";

  return (
    <div>
      {(searchable || toolbar) && (
        <div className="no-print mb-3 flex flex-wrap items-center gap-2">
          {searchable && (
            <div className="relative min-w-[12rem] flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-lg border border-line-strong bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
              />
            </div>
          )}
          {toolbar}
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState title={emptyTitle} body={emptyBody} />
      ) : (
        <>
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[42rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line">
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      style={c.width ? { width: c.width } : undefined}
                      className={`${pad} text-[11px] font-semibold uppercase tracking-wide text-ink-muted ${
                        c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                      } ${c.hideBelow ? HIDE[c.hideBelow] : ""}`}
                    >
                      {c.sortable !== false && c.value ? (
                        <button
                          onClick={() =>
                            setSort((s) =>
                              s?.key === c.key
                                ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" }
                                : { key: c.key, dir: "asc" },
                            )
                          }
                          className={`inline-flex items-center gap-1 transition-colors hover:text-ink ${
                            sort?.key === c.key ? "text-ink" : ""
                          }`}
                        >
                          {c.header}
                          {sort?.key === c.key ? (
                            sort.dir === "asc" ? (
                              <ArrowUp size={11} />
                            ) : (
                              <ArrowDown size={11} />
                            )
                          ) : null}
                        </button>
                      ) : (
                        c.header
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slice.map((row) => (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={`border-b border-line/70 last:border-0 ${
                      onRowClick ? "cursor-pointer transition-colors hover:bg-surface-2" : ""
                    }`}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={`${pad} align-middle text-ink-2 ${
                          c.align === "right"
                            ? "text-right tabnum"
                            : c.align === "center"
                              ? "text-center"
                              : "text-left"
                        } ${c.hideBelow ? HIDE[c.hideBelow] : ""} ${c.className ?? ""}`}
                      >
                        {c.render ? c.render(row) : String(c.value?.(row) ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="no-print mt-3 flex items-center justify-between gap-3 text-xs text-ink-muted">
              <span>
                {safePage * pageSize + 1}–{Math.min(sorted.length, (safePage + 1) * pageSize)} of{" "}
                {sorted.length.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="rounded-lg border border-line p-1.5 transition-colors hover:bg-surface-3 disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-1 tabnum">
                  {safePage + 1} / {pages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                  disabled={safePage >= pages - 1}
                  className="rounded-lg border border-line p-1.5 transition-colors hover:bg-surface-3 disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
