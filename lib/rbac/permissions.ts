// Permission catalog mirrors the BankingPermission contract referenced by the
// identity-api module. Strings must remain stable as they are extracted from
// the JWT `permissions` claim and matched at the UI layer.

export const Permissions = {
  AdminUsersRead: "admin:users:read",
  AdminUsersWrite: "admin:users:write",
  AdminRolesRead: "admin:roles:read",
  AdminRolesWrite: "admin:roles:write",
  AdminDoaRead: "admin:doa:read",
  AdminDoaWrite: "admin:doa:write",
  AdminConfigRead: "admin:config:read",
  AdminConfigWrite: "admin:config:write",
  AuditRead: "audit:read",
  AuditReadOwn: "audit:read:own",
  ReportGenerate: "report:generate",
  ProfileReadOwn: "profile:read:own",
  PasswordChangeOwn: "password:change:own",
  MfaManageOwn: "mfa:manage:own",
  HolidayRead: "holiday:read",
  FeeRead: "fee:read",
  VelocityLimitRead: "velocity-limit:read",
  CompensationRead: "compensation:read",
  PaymentInitiate: "payment:initiate",
  GlRead: "gl:read",
  GlApprove: "gl:approve",
} as const;

export type PermissionKey = keyof typeof Permissions;
export type PermissionString = (typeof Permissions)[PermissionKey];

export type PermissionMode = "all" | "any";

export function hasPermission(
  granted: ReadonlyArray<string> | undefined | null,
  required: ReadonlyArray<string>,
  mode: PermissionMode = "all",
): boolean {
  if (!required || required.length === 0) return true;
  if (!granted || granted.length === 0) return false;
  const set = new Set(granted);
  return mode === "all"
    ? required.every((p) => set.has(p))
    : required.some((p) => set.has(p));
}
