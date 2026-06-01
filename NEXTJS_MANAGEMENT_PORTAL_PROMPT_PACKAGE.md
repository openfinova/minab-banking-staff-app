# Next.js Management Portal Prompt Package (Minab Banking)

This document is a reusable planning/prompt artifact for building a separate Next.js management portal project against the Minab open-source banking APIs.

## 1) Management Module Inventory (Confirmed)

Use only these management-focused API modules/endpoints:

- Identity administration:
  - `/api/v1/identity/users` via `identity/identity-service/src/main/java/com/openfinova/banking/identity/controller/UserManagementController.java`
  - `/api/v1/identity/roles` via `identity/identity-service/src/main/java/com/openfinova/banking/identity/controller/RoleManagementController.java`
  - `/api/v1/identity/delegations` via `identity/identity-service/src/main/java/com/openfinova/banking/identity/controller/DelegationOfAuthorityController.java`
  - `/api/v1/identity/approval-workflows` via `identity/identity-service/src/main/java/com/openfinova/banking/identity/controller/IdentityApprovalWorkflowController.java`
- Audit and compliance:
  - `/api/v1/identity/audit` via `identity/identity-service/src/main/java/com/openfinova/banking/identity/controller/SecurityAuditController.java`
  - `/api/v1/identity/compliance/reports` via `identity/identity-service/src/main/java/com/openfinova/banking/identity/controller/ComplianceReportController.java`
- Security self-service for admins/staff:
  - `/api/v1/identity/me` (+ `/password`, `/mfa/setup`, `/mfa/verify`) via `identity/identity-service/src/main/java/com/openfinova/banking/identity/controller/MeController.java`
- Platform configuration:
  - `/api/v1/bank` via `common/setup-service/src/main/java/com/openfinova/banking/setup/controller/BankController.java`
  - `/api/v1/holidays` via `common/setup-service/src/main/java/com/openfinova/banking/setup/controller/HolidayController.java`
  - `/api/v1/fees` via `transaction-processing/transaction-processing-service/src/main/java/com/openfinova/banking/tp/controller/FeeManagementController.java`
  - `/api/v1/velocity-limits` via `transaction-processing/transaction-processing-service/src/main/java/com/openfinova/banking/tp/controller/VelocityLimitController.java`
- Operations oversight:
  - `/api/v1/compensation/workflows` via `transaction-processing/transaction-processing-service/src/main/java/com/openfinova/banking/tp/controller/CompensationWorkflowController.java`
  - `/api/v1/gl/approvals` via `general-ledger/general-ledger-service/src/main/java/com/openfinova/banking/gl/controller/ApprovalController.java`
  - `/api/v1/gl/fiscal-periods` via `general-ledger/general-ledger-service/src/main/java/com/openfinova/banking/gl/controller/FiscalPeriodController.java`
  - `/api/v1/gl/reports` via `general-ledger/general-ledger-service/src/main/java/com/openfinova/banking/gl/controller/FinancialStatementController.java`

Out of scope for this portal version:
- Public registration or onboarding pages
- Customer self-service experience
- Retail customer channels

## 2) Auth, 2FA, and Access Control Model (Exact)

### Login model
- Login-only (no registration), OAuth2 Authorization Code + PKCE.
- Identity server config source: `identity/identity-service/src/main/java/com/openfinova/banking/identity/config/AuthorizationServerConfig.java`.
- Frontend redirects unauthenticated users to login flow.

### 2FA model
- Mandatory second factor in login UX for admin/staff users.
- MFA implementation references:
  - Browser/session challenge logic: `identity/identity-service/src/main/java/com/openfinova/banking/identity/security/MfaChallengeFilter.java`
  - MFA setup/verify/disable endpoints: `identity/identity-service/src/main/java/com/openfinova/banking/identity/controller/MeController.java`
- Support both TOTP and recovery code flows.

### Authorization model
- Enforce permissions from JWT `permissions` claim (not role-name-only checks).
- Permission source: `identity/identity-api/src/main/java/com/openfinova/banking/identity/api/permission/BankingPermission.java`.
- Token claims source: `identity/identity-service/src/main/java/com/openfinova/banking/identity/config/TokenCustomizerConfig.java`.
- API-side permission extraction reference:
  - `banking-app/src/main/java/com/openfinova/banking/config/SecurityConfiguration.java`
- Frontend must implement:
  - Route-level guards
  - Menu-level guards
  - Component/action-level guards (buttons, bulk actions, exports)

### Session hardening
- Token refresh and expiry handling
- Idle timeout warning + logout
- Handle `force_password_change` token claim with mandatory password update path before normal module access

## 3) Modern UI System Requirements (Priority)

The portal must look and feel like a modern fintech operations product:

- Clean, minimal, high-contrast enterprise UI
- Responsive layout with strong desktop workflow support
- Left sidebar + accordion submenus by category
- Advanced tables (server pagination, sticky headers, saved filters, column controls)
- Smooth UX states (skeleton loaders, empty states, optimistic updates where safe)
- Dark mode support
- WCAG-aware keyboard and focus behavior
- Consistent design tokens (spacing, radius, typography, semantic colors)

Suggested stack:
- Next.js App Router + TypeScript
- Tailwind CSS + modern accessible component primitives
- TanStack Query for API data
- Zod for runtime validation and typed API contracts

## 4) Information Architecture (Sidebar + Accordion)

- Dashboard
- Identity and Access
  - Users
  - Roles and Permissions
  - Delegations
  - Approval Workflows
- Security and Compliance
  - Security Audit Events
  - Compliance Reports
  - Login Activity / SoD (if exposed by API environment)
- Configuration
  - Bank Profile
  - Holidays
  - Fees
  - Velocity Limits
- Operations Oversight
  - Compensation Workflows
  - GL Approvals Queue
  - Fiscal Periods
  - Financial Statements
- My Security
  - Change Password
  - MFA Setup / Verify / Disable

All sidebar sections, submenu items, page routes, and page-level actions must be permission-driven.

## 5) Daily Workflow Specification (Admin and Staff)

### A) User administration
- Search/filter users, provision user, update profile/access, lock/unlock, suspend/reactivate, deprovision.
- Assign/remove roles and enforce assignment boundaries.
- Required permissions are primarily `admin:users:*` and `admin:roles:*`.

### B) Role and permission governance
- Create/update roles.
- Attach/detach permissions.
- View permission catalog and role dependencies.

### C) Delegation and approval workflows
- Create/revoke delegation of authority.
- View approval queues, approve/reject/cancel with required rationale fields.
- Enforce maker-checker behavior at UI action layer.

### D) Security and compliance operations
- Search audit events with paging and time filters.
- Generate/report compliance views (user access, permission changes, login activity, SoD if available).
- Export-friendly UX for operations and audits.

### E) Platform configuration management
- Manage holidays and inspect bank profile.
- Configure fees and velocity limits.
- Require confirmation modals and change rationale for sensitive writes.

### F) Operations oversight
- Monitor compensation workflows and intervene through approved actions.
- Track GL approval queue, fiscal periods, and financial statements.

## 6) Permission Matrix Blueprint

Use these as baseline page gates and action gates:

- Users page: `admin:users:read`
- User mutation actions: `admin:users:write`
- Roles page: `admin:roles:read`
- Role mutation actions: `admin:roles:write`
- Delegations read: `admin:doa:read`
- Delegations/actions write: `admin:doa:write`
- Security audits: `audit:read`
- Compliance reports: `report:generate`
- Bank profile read: `admin:config:read`
- Holiday create/update/delete: `admin:config:write` (or stricter deployment policies)
- Fees and velocity configuration writes: `admin:config:write`
- Compensation dashboard read/interventions: use API authority contracts from compensation endpoints
- GL approvals/fiscal/report pages: use GL endpoint authority contracts (`gl:*`)
- My Security actions:
  - profile read own: `profile:read:own`
  - change password: `password:change:own`
  - manage MFA: `mfa:manage:own`
  - read own audit: `audit:read:own`

Implement three guard layers:
- `RouteGuard(requiredPermissions[])`
- `NavGuard(requiredPermissions[])`
- `Can(requiredPermissions[], mode='all|any')` for action-level control

## 7) Delivery Plan for a New Session/Project

1. Bootstrap project and app shell (auth layout + sidebar accordion).
2. Implement OIDC login flow and callback handling.
3. Implement MFA-required login UX and My Security module.
4. Implement permission extraction and guard infrastructure.
5. Build Identity and Access pages.
6. Build Security and Compliance pages.
7. Build Configuration pages.
8. Build Operations Oversight pages.
9. Add global UX quality (loading/empty/error, accessibility, dark mode).
10. Add test coverage for auth + role-based access + critical write operations.

Definition of done:
- All scoped modules are visible only when authorized.
- Admin/staff login with 2FA works end-to-end.
- Every sensitive action is guard-protected.
- UI meets modern visual/accessibility expectations.

## 8) Integration Risks and Assumptions

- GL checker finalization path may require confirmation in target deployment if approve/post action is not exposed in the same way as queue reads.
- Identity server in this repository includes development-oriented setup (client registration and key management assumptions); production setup must use persistent clients and stable signing keys.
- Browser-centric MFA flow is explicit; headless/token-only step-up policies must be clarified in deployment architecture.

## 9) Master Copy/Paste Prompt

Use this exact prompt in a fresh session/project:

Create a production-grade modern UI management portal using Next.js App Router, React, and TypeScript for the Minab open-source banking API.

Scope strictly to management services:
- Identity admin: users, roles, delegations, approval workflows
- Security/compliance: audit events, compliance reports
- Configuration: bank profile, holidays, fees, velocity limits
- Operations oversight: compensation workflows, GL approvals queue, fiscal periods, financial statements
- My Security: password change, MFA setup/verify/disable

Non-negotiable requirements:
1) Login only (no registration).
2) Mandatory 2FA login flow (TOTP + recovery code).
3) Admin and staff role-based access with permission-driven guards from JWT `permissions` claim.
4) Left sidebar with accordion submenus by categories; menu/page/action visibility must be permission-aware.
5) Modern fintech UI with responsive layout, dark mode, polished tables/forms/filters, skeleton loading, and accessible keyboard-first behavior.
6) Secure session model: token refresh, idle timeout warning, forced password-change handling.
7) Reusable architecture: centralized API client, typed contracts, TanStack Query data layer, Zod validation, route/menu/action guard components.

Deliver these artifacts:
- Route map and sidebar map
- Permission matrix (page and action level)
- API integration layer and typed models
- Screen specs for each scoped management module
- End-to-end auth + MFA + RBAC flow
- Test plan for role scenarios and high-risk admin operations

Constraints:
- Do not include customer self-service flows.
- Do not include signup or public onboarding.
- Keep all UX and workflows focused on internal admin/staff daily operations.

## 10) API and DTO Contract Pack (Compact)

Use this section as the implementation-grade contract appendix in new sessions.

### 10.1 Management API Matrix (method + path + authority)

#### Identity and Access
- `POST /api/v1/identity/users` -> `admin:users:write`
- `GET /api/v1/identity/users` -> `admin:users:read`
- `GET /api/v1/identity/users/{id}` -> `admin:users:read`
- `GET /api/v1/identity/users/search` -> `admin:users:read`
- `PUT /api/v1/identity/users/{id}` -> `admin:users:write`
- `PUT /api/v1/identity/users/{id}/roles` -> `admin:users:write`
- `PATCH /api/v1/identity/users/{id}/enabled` -> `admin:users:write`
- `PATCH /api/v1/identity/users/{id}/lock` -> `admin:users:write`
- `PATCH /api/v1/identity/users/{id}/unlock` -> `admin:users:write`
- `PATCH /api/v1/identity/users/{id}/password` -> `admin:users:write`
- `POST /api/v1/identity/users/{id}/force-password-change` -> `admin:users:write`
- `POST /api/v1/identity/users/{id}/provisioning/approve` -> `admin:users:write`
- `POST /api/v1/identity/users/{id}/provisioning/reject` -> `admin:users:write`
- `PATCH /api/v1/identity/users/{id}/suspend` -> `admin:users:write`
- `PATCH /api/v1/identity/users/{id}/reactivate` -> `admin:users:write`
- `POST /api/v1/identity/users/{id}/deprovision` -> `admin:users:write`
- `DELETE /api/v1/identity/users/{id}` -> `admin:users:write`

- `GET /api/v1/identity/roles` -> `admin:roles:read`
- `GET /api/v1/identity/roles/{id}` -> `admin:roles:read`
- `GET /api/v1/identity/roles/permissions` -> `admin:roles:read`
- `POST /api/v1/identity/roles` -> `admin:roles:write`
- `PUT /api/v1/identity/roles/{id}` -> `admin:roles:write`
- `DELETE /api/v1/identity/roles/{id}` -> `admin:roles:write`
- `PUT /api/v1/identity/roles/{id}/permissions` -> `admin:roles:write`
- `PATCH /api/v1/identity/roles/{id}/permissions/add` -> `admin:roles:write`
- `PATCH /api/v1/identity/roles/{id}/permissions/remove` -> `admin:roles:write`

- `POST /api/v1/identity/delegations` -> `admin:doa:write`
- `GET /api/v1/identity/delegations/{id}` -> `admin:doa:read`
- `POST /api/v1/identity/delegations/{id}/revoke` -> `admin:doa:write`
- `GET /api/v1/identity/delegations/outgoing/{userId}` -> `admin:doa:read`
- `GET /api/v1/identity/delegations/incoming/{userId}` -> `admin:doa:read`
- `GET /api/v1/identity/delegations/active` -> `admin:doa:read`

- `POST /api/v1/identity/approval-workflows` -> `admin:doa:write`
- `GET /api/v1/identity/approval-workflows/{id}` -> `admin:doa:read`
- `GET /api/v1/identity/approval-workflows?resourceType=...` -> `admin:doa:read`
- `POST /api/v1/identity/approval-workflows/{id}/approve` -> `admin:doa:write` or `gl:approve`
- `POST /api/v1/identity/approval-workflows/{id}/reject` -> `admin:doa:write` or `gl:approve`
- `POST /api/v1/identity/approval-workflows/{id}/cancel` -> `admin:doa:write`

#### Security and Compliance
- `GET /api/v1/identity/audit/events` -> `audit:read`
- `GET /api/v1/identity/compliance/reports/user-access` -> `report:generate`
- `GET /api/v1/identity/compliance/reports/permission-changes` -> `report:generate`
- `GET /api/v1/identity/compliance/reports/login-activity` -> `report:generate`
- `GET /api/v1/identity/compliance/reports/sod-violations` -> `report:generate`

#### My Security
- `GET /api/v1/identity/me` -> `profile:read:own`
- `PATCH /api/v1/identity/me/password` -> `password:change:own`
- `POST /api/v1/identity/me/mfa/setup` -> `mfa:manage:own`
- `POST /api/v1/identity/me/mfa/verify` -> `mfa:manage:own`
- `DELETE /api/v1/identity/me/mfa` -> `mfa:manage:own`
- `GET /api/v1/identity/me/audit-events` -> `audit:read:own`

#### Configuration
- `GET /api/v1/bank/details` -> `admin:config:read`
- `GET /api/v1/bank/name` -> `admin:config:read`
- `GET /api/v1/bank/currency` -> `admin:config:read`

- `GET /api/v1/holidays` -> `holiday:read`
- `GET /api/v1/holidays/check` -> `holiday:read`
- `GET /api/v1/holidays/{countryCode}/{date}` -> `holiday:read`
- `POST /api/v1/holidays` -> `admin:config:write`
- `DELETE /api/v1/holidays/{countryCode}/{date}` -> `admin:config:write`

- `GET /api/v1/fees/rules` -> `fee:read`
- `GET /api/v1/fees/rules/type/{type}` -> `fee:read`
- `POST /api/v1/fees/rules` -> `admin:config:write`
- `PUT /api/v1/fees/rules/{ruleId}` -> `admin:config:write`
- `DELETE /api/v1/fees/rules/{ruleId}` -> `admin:config:write`
- `POST /api/v1/fees/waivers` -> `admin:config:write`
- `GET /api/v1/fees/waivers/customer/{customerId}` -> `fee:read`

- `GET /api/v1/velocity-limits/account/{accountId}` -> `velocity-limit:read`
- `GET /api/v1/velocity-limits/type/{type}` -> `velocity-limit:read`
- `POST /api/v1/velocity-limits` -> `admin:config:write`
- `PUT /api/v1/velocity-limits/{id}` -> `admin:config:write`
- `DELETE /api/v1/velocity-limits/{id}` -> `admin:config:write`
- `GET /api/v1/velocity-limits/account/{accountId}/remaining` -> `velocity-limit:read`
- `GET /api/v1/velocity-limits/account/{accountId}/status` -> `velocity-limit:read`
- `GET /api/v1/velocity-limits/account/{accountId}/remaining/{period}` -> `velocity-limit:read`
- `GET /api/v1/velocity-limits/account/{accountId}/remaining-count/{period}` -> `velocity-limit:read`
- `GET /api/v1/velocity-limits/account/{accountId}/next-reset/{period}` -> `velocity-limit:read`
- `GET /api/v1/velocity-limits/account/{accountId}/breaches` -> `velocity-limit:read`

#### Operations Oversight
- `GET /api/v1/compensation/workflows/active` -> `compensation:read`
- `GET /api/v1/compensation/workflows/failed` -> `compensation:read`
- `GET /api/v1/compensation/workflows/status/{status}` -> `compensation:read`
- `GET /api/v1/compensation/workflows/{workflowId}` -> `compensation:read`
- `GET /api/v1/compensation/workflows/{workflowId}/status` -> `compensation:read`
- `GET /api/v1/compensation/workflows/{workflowId}/steps` -> `compensation:read`
- `POST /api/v1/compensation/workflows/{workflowId}/pause` -> `payment:initiate`
- `POST /api/v1/compensation/workflows/{workflowId}/resume` -> `payment:initiate`
- `POST /api/v1/compensation/workflows/{workflowId}/force-complete` -> `payment:initiate`
- `POST /api/v1/compensation/workflows/{workflowId}/steps/{stepId}/skip` -> `payment:initiate`
- `POST /api/v1/compensation/workflows/{workflowId}/steps/{stepId}/retry` -> `payment:initiate`
- `POST /api/v1/compensation/workflows/custom` -> `payment:initiate`
- `GET /api/v1/compensation/workflows/report` -> `compensation:read`
- `GET /api/v1/compensation/workflows/average-time/{transactionType}` -> `compensation:read`

- `GET /api/v1/gl/approvals/my-queue` -> `gl:approve`
- `GET /api/v1/gl/approvals/my-activity` -> `gl:approve`
- `GET /api/v1/gl/approvals/my-limits` -> `gl:approve`
- `GET /api/v1/gl/approvals/{transactionId}/can-approve` -> `gl:approve`

- `GET /api/v1/gl/fiscal-periods` -> `gl:read`
- `GET /api/v1/gl/fiscal-periods/status/{status}` -> `gl:read`
- `GET /api/v1/gl/fiscal-periods/year/{fiscalYear}` -> `gl:read`
- `GET /api/v1/gl/fiscal-periods/year/{fiscalYear}/period/{periodNumber}` -> `gl:read`
- `GET /api/v1/gl/fiscal-periods/active` -> `gl:read`
- `GET /api/v1/gl/fiscal-periods/for-date` -> `gl:read`
- `GET /api/v1/gl/fiscal-periods/posting-allowed` -> `gl:read`
- `POST /api/v1/gl/fiscal-periods` -> `gl:approve`
- `POST /api/v1/gl/fiscal-periods/{id}/close` -> `gl:approve`
- `POST /api/v1/gl/fiscal-periods/{id}/reopen` -> `gl:approve`

- `GET /api/v1/gl/reports/income-statement` -> `gl:read`
- `GET /api/v1/gl/reports/balance-sheet` -> `gl:read`
- `GET /api/v1/gl/reports/cash-flow` -> `gl:read`

### 10.2 DTO Inventory (management-critical)

#### Identity DTOs
- `CreateUserRequest`: `username`, `password`, `email`, `userType`, `branchCode`, `employeeId`, `glApprovalRole`, `customerPartyId`, `roleNames`, `accountExpiresAt`, `provisioningEligibilityNotes`
- `UpdateUserAccessRequest`: `email`, `branchCode`, `employeeId`, `glApprovalRole`, `customerPartyId`, `accountExpiresAt`
- `LockUserRequest`: `reason`
- `RejectProvisioningRequest`: `reason`
- `SuspendUserRequest`: `reason`, `suspensionUntil`
- `DeprovisionUserRequest`: `reason`
- `CreateRoleRequest`: `name`, `displayName`, `description`, `permissions`
- `UpdateRoleRequest`: `displayName`, `description`
- `PermissionModificationRequest`: `permissions`
- `CreateApprovalWorkflowRequest`: `resourceType`, `resourceId`, `requiredGlRolesInOrder`
- `WorkflowActionRequest`: `comment`
- `MfaVerifyRequest`: `code` (6 chars)
- `MfaSetupResponse`: `secret`, `qrUri`, `recoveryCodes`
- `UserSearchCriteria`: `username`, `email`, `userType`, `enabled`, `locked`, `roleName`, `branchCode`, `provisioningStatus`, `suspended`

#### Configuration/Operations DTOs
- `HolidayDTO`: `date`, `year`, `countryCode`, `regionCode`, `name`, `description`, `type`, `bankHoliday`, `observedHoliday`
- `CreateFeeRuleRequest`: `transactionType`, `customerTier`, `feeType`, `fixedAmount`, `percentageRate`, `minFee`, `maxFee`
- `UpdateFeeRuleRequest`: mirrors fee rule update fields
- `CreateFeeWaiverRequest`: customer/account + reason fields
- `CreateVelocityLimitRequest`: `accountId`, `transactionType`, `period`, `maxAmount`, `maxCount`
- `UpdateVelocityLimitRequest`: updateable limit fields
- `CreateFiscalPeriodRequest`: `name`, `startDate`, `endDate`, `fiscalYear`, `periodNumber`
- Reports responses: `IncomeStatementResponse`, `BalanceSheetResponse`, `CashFlowStatementResponse`
- Workflow/report responses: `CompensationWorkflowResponse`, `CompensationWorkflowReport`

### 10.3 Validation and Input Rules (UI forms)

- User create:
  - `username` required, max 80
  - `password` required, min 8 max 100
  - `email` max 150 and valid format
  - `userType` required
  - If `userType=STAFF`, email must be non-blank
  - `branchCode` must match backend pattern
  - `provisioningEligibilityNotes` max 2000
- User suspend/reject/deprovision reasons:
  - suspend reason required max 500
  - reject reason required max 500
  - deprovision reason optional max 500
- Role create:
  - `name` required max 60
  - `displayName` max 120
  - `description` max 500
- Workflow action comment max 500
- MFA verify code exactly 6 characters
- Holiday:
  - `countryCode` length 2
  - `name` required max 100
  - `description` max 500
  - `type` required
- Fiscal period:
  - `name` required max 50
  - `fiscalYear` 1900..2200
  - `periodNumber` 1..13
  - enforce `startDate <= endDate`

### 10.4 Query/Pagination/Date Contract

- Spring pageable endpoints use: `page`, `size`, `sort`
  - User listing/search
  - Security audit search
  - Compliance reports: user-access, permission-changes, login-activity
  - My audit-events
- Date-time filters use ISO-8601 for audit/compliance:
  - `from`, `to`
- Date-only filters use ISO date:
  - holidays check and lookup
  - fiscal period date lookups
  - report date ranges (`startDate`, `endDate`, `asOfDate`)

### 10.5 Error Contract (UI behavior baseline)

Use this standard behavior across management pages:
- `400`: validation/business rule failure -> inline field errors + toast
- `401`: token invalid/expired -> redirect to login
- `403`: missing permission -> show access denied page/state
- `404`: entity not found -> empty/not-found detail panel
- `409`: conflict (duplicate or invalid state transition) -> non-destructive warning modal
- `500`: generic server error -> retry affordance + error reference id

### 10.6 Action Side-Effect Expectations

- User lock/suspend/deprovision affect sign-in eligibility immediately.
- `force-password-change` should redirect user to password update on next session.
- Role permission mutation affects JWT authorities after token refresh/re-login.
- Workflow approve/reject/cancel updates step timeline and queue membership.
- Fiscal period close/reopen changes posting-allowed behavior.
- Compensation interventions alter workflow state and require explicit reason/audit context.

### 10.7 Sample Payloads (critical paths)

#### Create User
```json
{
  "username": "staff.ops.01",
  "password": "StrongPassw0rd!",
  "email": "ops01@bank.local",
  "userType": "STAFF",
  "branchCode": "HQ01",
  "employeeId": "EMP-1001",
  "glApprovalRole": "MANAGER",
  "roleNames": ["OPS_STAFF"],
  "provisioningEligibilityNotes": "Approved by HR batch 2026-05"
}
```

#### Update User Access
```json
{
  "email": "ops01.updated@bank.local",
  "branchCode": "HQ02",
  "employeeId": "EMP-1001",
  "glApprovalRole": "SENIOR_MANAGER"
}
```

#### Set User Roles
```json
["OPS_STAFF", "AUDIT_VIEWER"]
```

#### Reject Provisioning
```json
{
  "reason": "KYC documentation incomplete for staff account onboarding."
}
```

#### Suspend User
```json
{
  "reason": "Temporary suspension pending compliance review.",
  "suspensionUntil": "2026-06-01T23:59:59"
}
```

#### Create Role
```json
{
  "name": "OPS_SUPERVISOR",
  "displayName": "Operations Supervisor",
  "description": "Supervises operations queue and approvals.",
  "permissions": ["admin:users:read", "admin:users:write", "audit:read"]
}
```

#### Modify Role Permissions
```json
{
  "permissions": ["report:generate", "audit:read"]
}
```

#### Start Approval Workflow
```json
{
  "resourceType": "USER_PROVISIONING",
  "resourceId": "8b80b4a9-f2c5-4e88-82e7-2de6655ad2ce",
  "requiredGlRolesInOrder": ["MANAGER", "CFO"]
}
```

#### Approve/Reject Workflow Step
```json
{
  "comment": "Validated supporting documents and risk controls."
}
```

#### Change Own Password
```json
{
  "currentPassword": "OldPassw0rd!",
  "newPassword": "NewStrongPassw0rd!"
}
```

#### MFA Verify
```json
{
  "code": "123456"
}
```

#### Create Holiday
```json
{
  "date": "2026-12-25",
  "countryCode": "US",
  "regionCode": "NY",
  "name": "Christmas Day",
  "description": "Federal holiday",
  "type": "NATIONAL",
  "bankHoliday": true,
  "observedHoliday": false
}
```

#### Create Fee Rule
```json
{
  "transactionType": "TRANSFER",
  "customerTier": "STANDARD",
  "feeType": "PERCENTAGE",
  "percentageRate": 1.25,
  "minFee": 1.00,
  "maxFee": 25.00
}
```

#### Create Velocity Limit
```json
{
  "accountId": "f9a47f2c-b80a-48a4-a358-4914b1798f9b",
  "transactionType": "TRANSFER",
  "period": "DAILY",
  "maxAmount": 10000.00,
  "maxCount": 20
}
```

#### Create Fiscal Period
```json
{
  "name": "February 2026",
  "startDate": "2026-02-01",
  "endDate": "2026-02-28",
  "fiscalYear": 2026,
  "periodNumber": 2
}
```

### 10.8 Frontend Contract Checklist (required in new session)

- Generate typed client methods for all matrix endpoints.
- Define Zod schemas for all listed request payloads.
- Add enum mappers for `TransactionType`, `VelocityLimitPeriod`, `CompensationStatus`, and fiscal statuses.
- Add shared query serializer for paging/sorting/date filters.
- Add centralized HTTP error mapper (`400/401/403/404/409/500`).
- Validate permission gates for route + nav + action against the authority matrix before feature sign-off.

OpenAPI Spec: in `openfinova-local.json`

## 11) Cost-Optimized Contract Governance

### 11.1 OpenAPI Metadata Block

Use and maintain this block whenever the contract is regenerated:

- Contract file: `openfinova-local.json`
- Runtime profile: `local`
- Source URL (default): `http://localhost:8080/v3/api-docs`
- Optional grouped URLs:
  - `http://localhost:8080/v3/api-docs/all`
  - `http://localhost:8080/v3/api-docs/identity`
- Generated at: `YYYY-MM-DDTHH:mm:ssZ` (fill when regenerated)
- Contract checksum (optional but recommended): `sha256:<value>`

### 11.2 Single Source of Truth Rule

For any future build/refactor session, include this exact instruction:

`Use openfinova-local.json as the single API contract source. Do not invent endpoints, request fields, response fields, or permissions outside this contract and the explicit policy rules in this prompt package.`

### 11.3 Prompt Discipline Rules

- Keep prompt text lean; do not paste full OpenAPI JSON into prompt context.
- Reference contract path only: `openfinova-local.json`.
- If an endpoint/field is missing or unclear, stop and ask for clarification instead of guessing.
- If code and contract conflict, flag conflict explicitly and request decision.

### 11.4 Suggested RBAC Test Profiles (non-secret placeholders)

Define these test personas in your target environment for repeatable QA:

- `admin_full`
  - Purpose: full management coverage across identity/config/ops
  - Expected permissions: `admin:users:*`, `admin:roles:*`, `admin:doa:*`, `admin:config:*`, `audit:read`, `report:generate`, `gl:read`, `gl:approve`, `compensation:read`
- `staff_ops`
  - Purpose: operations-only daily workflow checks
  - Expected permissions: read + workflow intervention permissions needed for ops pages (for example `compensation:read`, `payment:initiate`, and limited configuration reads/writes by policy)
- `audit_reader`
  - Purpose: read/report-only controls verification
  - Expected permissions: `audit:read`, `report:generate` with no mutation authorities

Note: keep these as role templates, not hard-coded usernames/passwords in repository docs.

### 11.5 Regeneration Procedure (OpenAPI refresh)

When backend changes:

1. Start app with local profile (using `.vscode/launch.json` config).
2. Export latest contract from:
   - `http://localhost:8080/v3/api-docs`
3. Save to root as `openfinova-local.json` (overwrite previous).
4. Update metadata block timestamp/checksum in this file.
5. Re-run API/DTO diff check before using prompt in a new build session.
