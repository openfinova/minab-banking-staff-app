"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CopyableUuid } from "@/components/data/copyable-uuid";
import { StatusBadge } from "@/components/data/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { customersApi } from "@/lib/api/modules/customers";
import { customerPartyLabel } from "@/components/customers/customer-party-link";

const PANEL_WIDTH = 224;
const VIEWPORT_GAP = 8;

function useCustomerById(customerId: string | undefined | null, enabled: boolean) {
  const id = customerId?.trim() ?? "";
  return useQuery({
    queryKey: ["customers", id],
    queryFn: () => customersApi.get(id),
    enabled: enabled && id.length > 0,
    staleTime: 5 * 60_000,
  });
}

function computePanelStyle(
  anchor: HTMLElement,
  panelHeight: number,
): React.CSSProperties {
  const rect = anchor.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const openAbove = spaceBelow < panelHeight + VIEWPORT_GAP && rect.top > spaceBelow;
  const top = openAbove
    ? rect.top - panelHeight - VIEWPORT_GAP
    : rect.bottom + VIEWPORT_GAP;
  const left = Math.min(
    Math.max(VIEWPORT_GAP, rect.left),
    window.innerWidth - PANEL_WIDTH - VIEWPORT_GAP,
  );

  return { top, left, width: PANEL_WIDTH };
}

export function CustomerPartyHoverCell({ customerPartyId }: { customerPartyId?: string | null }) {
  const id = customerPartyId?.trim() ?? "";
  const [hover, setHover] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = React.useState<React.CSSProperties | null>(null);
  const q = useCustomerById(id, hover);

  const reposition = React.useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const panelHeight = panelRef.current?.offsetHeight ?? 120;
    setPanelStyle(computePanelStyle(anchor, panelHeight));
  }, []);

  React.useLayoutEffect(() => {
    if (!hover) {
      setPanelStyle(null);
      return;
    }

    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [hover, reposition, q.data, q.isLoading]);

  if (!id) {
    return <span>—</span>;
  }

  const panel =
    hover && panelStyle && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            className="fixed z-[100] rounded-md border bg-popover p-2 text-xs text-popover-foreground shadow-md"
            style={panelStyle}
            role="tooltip"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
          >
            {q.isLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : q.data ? (
              <div className="space-y-1">
                <p className="font-medium leading-snug">{customerPartyLabel(q.data)}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{q.data.customerNumber}</p>
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  <StatusBadge status={q.data.status} />
                  {q.data.type ? (
                    <span className="text-[10px] text-muted-foreground">{q.data.type}</span>
                  ) : null}
                </div>
                {q.data.kycStatus ? (
                  <p className="text-[10px] text-muted-foreground">KYC {q.data.kycStatus}</p>
                ) : null}
                <Link
                  href={`/customers/${id}`}
                  className="inline-block pt-0.5 text-[10px] text-primary hover:underline"
                >
                  Open customer
                </Link>
              </div>
            ) : (
              <p className="text-muted-foreground">Could not load customer details.</p>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        ref={anchorRef}
        className="inline-flex"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <CopyableUuid value={id} href={`/customers/${id}`} stopPropagation />
      </div>
      {panel}
    </>
  );
}
