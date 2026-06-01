"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  /** Stable row ids for checkbox selection — required when enabling selection. */
  getRowId: (row: T, index: number) => string;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  footer?: React.ReactNode;
  emptyLabel?: string;
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  rowSelection,
  onRowSelectionChange,
  footer,
  emptyLabel = "No rows",
}: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    state: rowSelection !== undefined ? { rowSelection } : undefined,
    onRowSelectionChange,
    enableRowSelection: Boolean(onRowSelectionChange),
    getRowId,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-2">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className="whitespace-nowrap">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyLabel}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {footer}
    </div>
  );
}
