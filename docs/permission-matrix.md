# Permission Matrix

This matrix lists every page and action gate enforced by the portal. Permissions come from the JWT `permissions` claim. The set of constants lives in [`lib/rbac/permissions.ts`](../lib/rbac/permissions.ts) and the navigation gating in [`lib/nav/navigation.ts`](../lib/nav/navigation.ts).

## Pages

| Module | Page | Mode | Required permissions |
|--------|------|------|----------------------|
| Identity | Users list | all | `admin:users:read` |
| Identity | Users create | all | `admin:users:write` |
| Identity | Users detail | all | `admin:users:read` |
| Identity | Roles list | all | `admin:roles:read` |
| Identity | Role detail | all | `admin:roles:read` |
| Identity | Delegations | all | `admin:doa:read` |
| Identity | Approval workflows | all | `admin:doa:read` |
| Security | Audit events | all | `audit:read` |
| Security | Compliance reports | all | `report:generate` |
| Configuration | Bank profile | all | `admin:config:read` |
| Configuration | Holidays | all | `holiday:read` |
| Configuration | Fees | all | `fee:read` |
| Configuration | Velocity limits | all | `velocity-limit:read` |
| Operations | Compensation workflows | all | `compensation:read` |
| Operations | GL approvals queue | all | `gl:approve` |
| Operations | Fiscal periods | all | `gl:read` |
| Operations | Financial statements | all | `gl:read` |
| My Security | Profile | all | `profile:read:own` |
| My Security | Change password | all | `password:change:own` |
| My Security | MFA | all | `mfa:manage:own` |
| My Security | My audit events | all | `audit:read:own` |

## Actions

| Module | Action | Required permissions | Mode | Notes |
|--------|--------|----------------------|------|-------|
| Users | Create user | `admin:users:write` | all | Header CTA on `/identity/users` |
| Users | Update access fields | `admin:users:write` | all | Detail tab |
| Users | Set roles | `admin:users:write` | all | Detail tab |
| Users | Lock / unlock | `admin:users:write` | all | Lock requires reason |
| Users | Suspend / reactivate | `admin:users:write` | all | Suspend requires reason and optional `suspensionUntil` |
| Users | Force password change | `admin:users:write` | all | |
| Users | Reset password | `admin:users:write` | all | Min 8 chars |
| Users | Approve / reject provisioning | `admin:users:write` | all | Reject requires reason |
| Users | Deprovision | `admin:users:write` | all | |
| Users | Delete user | `admin:users:write` | all | Destructive confirmation |
| Roles | Create / delete role | `admin:roles:write` | all | Built-in (system) roles cannot be deleted |
| Roles | Update metadata | `admin:roles:write` | all | |
| Roles | Replace permissions | `admin:roles:write` | all | Uses `PUT /roles/{id}/permissions` |
| Delegations | Create / revoke | `admin:doa:write` | all | Revoke optional reason |
| Approval workflows | Approve | `admin:doa:write` or `gl:approve` | any | Optional comment |
| Approval workflows | Reject | `admin:doa:write` or `gl:approve` | any | Reason required |
| Approval workflows | Cancel | `admin:doa:write` | all | |
| Holidays | Create / delete | `admin:config:write` | all | |
| Fees | Create / update / delete rules and waivers | `admin:config:write` | all | |
| Velocity limits | Create / update / delete | `admin:config:write` | all | |
| Compensation | Pause / resume / force complete / retry / skip | `payment:initiate` | all | Force complete and skip require reason |
| GL approvals | Read queue / activity / limits | `gl:approve` | all | Approve action handled by backend |
| Fiscal periods | Create | `gl:approve` | all | |
| Fiscal periods | Close / reopen | `gl:approve` | all | Reason required |

## Test personas

These three personas align with `prompt-package` Section 11.4:

- `admin_full`
  - `admin:users:*`, `admin:roles:*`, `admin:doa:*`, `admin:config:*`
  - `audit:read`, `report:generate`, `gl:read`, `gl:approve`, `compensation:read`
- `staff_ops`
  - `compensation:read`, `payment:initiate`
  - Limited config read/write per deployment policy
- `audit_reader`
  - `audit:read`, `report:generate`
  - No mutation authorities
