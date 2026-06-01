# Route Map

All routes under `(protected)` require authentication and respect permission guards. Public routes are kept minimal and only used for sign-in flow.

## Public

| Route | Purpose |
|-------|---------|
| `/` | Splash; redirects to dashboard or login depending on auth state |
| `/login` | OIDC entry point with mandatory MFA messaging |
| `/auth/callback` | OAuth2 Authorization Code + PKCE callback handler |
| `/account/force-password-change` | Forced password change flow when JWT carries `force_password_change` |

## Protected

| Section | Route | Required permissions |
|---------|-------|----------------------|
| Dashboard | `/dashboard` | none |
| Identity | `/identity/users` | `admin:users:read` |
| Identity | `/identity/users/new` | `admin:users:write` |
| Identity | `/identity/users/[id]` | `admin:users:read` |
| Identity | `/identity/roles` | `admin:roles:read` |
| Identity | `/identity/roles/[id]` | `admin:roles:read` |
| Identity | `/identity/delegations` | `admin:doa:read` |
| Identity | `/identity/approval-workflows` | `admin:doa:read` |
| Security | `/security/audit` | `audit:read` |
| Security | `/security/compliance` | `report:generate` |
| Configuration | `/configuration/bank` | `admin:config:read` |
| Configuration | `/configuration/holidays` | `holiday:read` |
| Configuration | `/configuration/fees` | `fee:read` |
| Configuration | `/configuration/velocity-limits` | `velocity-limit:read` |
| Operations | `/operations/compensation` | `compensation:read` |
| Operations | `/operations/gl-approvals` | `gl:approve` |
| Operations | `/operations/fiscal-periods` | `gl:read` |
| Operations | `/operations/reports` | `gl:read` |
| My Security | `/account/profile` | `profile:read:own` |
| My Security | `/account/password` | `password:change:own` |
| My Security | `/account/mfa` | `mfa:manage:own` |
| My Security | `/account/audit` | `audit:read:own` |

The `(protected)` route group also wraps everything in `RouteGuard`, so even routes that have no per-page permission requirement still enforce authentication and force-password-change handling.
