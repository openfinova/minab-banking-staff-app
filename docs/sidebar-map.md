# Sidebar Map

The sidebar is implemented as a Radix Accordion that hides sections when the user has no permission to see any of their items. See [`lib/nav/navigation.ts`](../lib/nav/navigation.ts).

```
Dashboard
└─ Overview                              [/dashboard]

Identity & Access                        (any of admin:users:read, admin:roles:read, admin:doa:read)
├─ Users                                 [admin:users:read]            -> /identity/users
├─ Roles & Permissions                   [admin:roles:read]            -> /identity/roles
├─ Delegations                           [admin:doa:read]              -> /identity/delegations
└─ Approval Workflows                    [admin:doa:read]              -> /identity/approval-workflows

Security & Compliance                    (any of audit:read, report:generate)
├─ Audit Events                          [audit:read]                  -> /security/audit
└─ Compliance Reports                    [report:generate]             -> /security/compliance

Configuration                            (any of admin:config:read, holiday:read, fee:read, velocity-limit:read)
├─ Bank Profile                          [admin:config:read]           -> /configuration/bank
├─ Holidays                              [holiday:read]                -> /configuration/holidays
├─ Fees                                  [fee:read]                    -> /configuration/fees
└─ Velocity Limits                       [velocity-limit:read]         -> /configuration/velocity-limits

Operations Oversight                     (any of compensation:read, gl:approve, gl:read)
├─ Compensation Workflows                [compensation:read]           -> /operations/compensation
├─ GL Approvals Queue                    [gl:approve]                  -> /operations/gl-approvals
├─ Fiscal Periods                        [gl:read]                     -> /operations/fiscal-periods
└─ Financial Statements                  [gl:read]                     -> /operations/reports

My Security                              (any of profile:read:own, password:change:own, mfa:manage:own)
├─ Profile                               [profile:read:own]            -> /account/profile
├─ Change Password                       [password:change:own]         -> /account/password
├─ Multi-Factor Auth                     [mfa:manage:own]              -> /account/mfa
└─ My Audit Events                       [audit:read:own]              -> /account/audit
```

Section visibility is computed by `NavGuard` with `mode="any"`. Item visibility uses `mode="all"` because items are scoped to a single permission.
