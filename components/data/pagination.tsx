"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalElements?: number;
}

export function Pagination({ page, totalPages, onPageChange, totalElements }: PaginationProps) {
  const hasPrev = page > 0;
  const hasNext = page + 1 < totalPages;

  if (totalPages <= 1 && !totalElements) return null;

  return (
    <div className="mt-3 flex items-center justify-between">
      <p className="text-xs text-muted-foreground">
        Page {page + 1} of {Math.max(totalPages, 1)}
        {totalElements !== undefined ? ` - ${totalElements} total` : ""}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous page"
          disabled={!hasPrev}
          onClick={() => onPageChange(Math.max(0, page - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next page"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
