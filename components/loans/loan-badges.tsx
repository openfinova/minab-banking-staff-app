"use client";

import { StatusBadge } from "@/components/data/status-badge";
import type {
  ApplicationStatus,
  DelinquencyBucket,
  LoanStatus,
  ScheduleStatus,
} from "@/lib/api/modules/loans";

export function LoanStatusBadge({ status }: { status: LoanStatus }) {
  return <StatusBadge status={status} />;
}

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <StatusBadge status={status} />;
}

export function InstallmentStatusBadge({ status }: { status: ScheduleStatus }) {
  return <StatusBadge status={status} />;
}

export function DelinquencyBadge({ bucket }: { bucket: DelinquencyBucket | string }) {
  return <StatusBadge status={bucket} />;
}
