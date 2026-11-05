import type { ReactNode } from "react";

import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

export type DataColumn<T> = { key: string; header: string; className?: string; cell: (row: T) => ReactNode };

export function DataTable<T>({ rows, columns, getRowKey, emptyTitle = "No records found", className }: { rows: T[]; columns: DataColumn<T>[]; getRowKey: (row: T) => string; emptyTitle?: string; className?: string }) {
  if (!rows.length) return <EmptyState title={emptyTitle} description="Try changing your filters or add a new record." />;
  return <div className={cn("overflow-x-auto", className)}><table className="w-full min-w-[720px] text-sm"><thead className="bg-muted/70 text-xs"><tr>{columns.map((column) => <th key={column.key} className={cn("px-4 py-3 text-start font-semibold", column.className)}>{column.header}</th>)}</tr></thead><tbody>{rows.map((row) => <tr className="border-t transition-colors hover:bg-muted/40" key={getRowKey(row)}>{columns.map((column) => <td key={column.key} className={cn("px-4 py-3", column.className)}>{column.cell(row)}</td>)}</tr>)}</tbody></table></div>;
}
