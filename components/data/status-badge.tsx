import { Badge, type BadgeProps } from "@/components/ui/badge";

interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: string | undefined | null;
  variantOverride?: BadgeProps["variant"];
}

const STATUS_VARIANTS: Record<string, BadgeProps["variant"]> = {
  ACTIVE: "success",
  APPROVED: "success",
  COMPLETED: "success",
  ENABLED: "success",
  OPEN: "success",
  VERIFIED: "success",
  IN_REVIEW: "warning",
  PROSPECT: "muted",
  INACTIVE: "muted",
  ADJUSTING: "warning",
  LOCKED: "destructive",
  PENDING: "warning",
  IN_PROGRESS: "warning",
  PAUSED: "warning",
  REOPENED: "warning",
  BLOCKED: "destructive",
  EXPIRED: "warning",
  ANONYMIZED: "muted",
  PRIMARY: "secondary",
  FAILED: "destructive",
  REVOKED: "destructive",
  CANCELLED: "muted",
  DISABLED: "muted",
  CLOSED: "muted",
};

export function StatusBadge({ status, variantOverride, ...props }: StatusBadgeProps) {
  const key = status?.toUpperCase();
  const variant = variantOverride ?? (key ? STATUS_VARIANTS[key] : "muted") ?? "muted";
  return (
    <Badge variant={variant} {...props}>
      {status ?? "-"}
    </Badge>
  );
}
