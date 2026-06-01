"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-provider";
import { Permissions } from "@/lib/rbac/permissions";
import { glApprovalsApi, glAuditApi, glSuspenseApi } from "@/lib/api/modules/operations";
import { compensationApi } from "@/lib/api/modules/transaction-processing";

export function TopbarNotificationsBell() {
  const { can } = useAuth();
  const canGlApprove = can([Permissions.GlApprove], "all");
  const canGlRead = can([Permissions.GlRead], "all");
  const canComp = can([Permissions.CompensationRead], "all");

  const queue = useQuery({
    queryKey: ["notif", "gl-queue"],
    queryFn: glApprovalsApi.myQueue,
    enabled: canGlApprove,
    refetchInterval: 60_000,
  });

  const failed = useQuery({
    queryKey: ["notif", "comp-failed"],
    queryFn: compensationApi.failed,
    enabled: canComp,
    refetchInterval: 60_000,
  });

  const today = new Date().toISOString().slice(0, 10);
  const recentAudit = useQuery({
    queryKey: ["notif", "gl-audit", today],
    queryFn: () => glAuditApi.recent(today),
    enabled: canGlRead,
    refetchInterval: 120_000,
  });

  const aml = useQuery({
    queryKey: ["notif", "aml-queue"],
    queryFn: glSuspenseApi.amlReview,
    enabled: canGlRead,
    refetchInterval: 90_000,
  });

  const qCount = canGlApprove ? (queue.data?.length ?? 0) : 0;
  const fCount = canComp ? (failed.data?.length ?? 0) : 0;
  const amlCount = canGlRead ? (aml.data?.length ?? 0) : 0;
  const totalBadge = qCount + fCount + amlCount;

  if (!canGlApprove && !canComp && !canGlRead) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Operational notifications${totalBadge ? `: ${totalBadge} items need attention` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {totalBadge ? (
            <span className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-[5px] text-[10px] font-semibold leading-none text-destructive-foreground">
              {totalBadge > 99 ? "99+" : totalBadge}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Operational signals</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canGlApprove ? (
          <div className="px-2 py-1.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span>GL postings awaiting your signature</span>
              <Badge>{qCount}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {qCount ? (
                <Link href="/operations/gl-approvals" className="text-primary hover:underline">
                  Open approvals queue →
                </Link>
              ) : (
                "Maker-checker queue clear."
              )}
            </p>
          </div>
        ) : null}
        {canComp ? (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>Failed compensation workflows</span>
                <Badge variant={fCount ? "destructive" : "secondary"}>{fCount}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {fCount ? (
                  <Link
                    href="/transaction-processing/compensation/workflows"
                    className="text-primary hover:underline"
                  >
                    Triage saga failures →
                  </Link>
                ) : (
                  "No remediation backlog."
                )}
              </p>
            </div>
          </>
        ) : null}
        {canGlRead ? (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>AML suspense referrals</span>
                <Badge variant={amlCount ? "destructive" : "secondary"}>{amlCount}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {amlCount ? (
                  <Link href="/compliance/aml-review" className="text-primary hover:underline">
                    Review queue →
                  </Link>
                ) : (
                  "No GL suspense AML flags right now."
                )}
              </p>
            </div>
          </>
        ) : null}
        {canGlRead && Boolean(recentAudit.data?.length) ? (
          <>
            <DropdownMenuSeparator />
            <p className="px-2 py-1 text-xs text-muted-foreground">
              {recentAudit.data!.length} GL audit event(s) today —{" "}
              <Link href="/general-ledger/audit" className="text-primary hover:underline">
                Audit explorer
              </Link>
            </p>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
