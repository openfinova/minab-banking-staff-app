# Test Plan

## Unit / component (Vitest)

- `tests/rbac/permissions.test.ts` - permission matching for `all` / `any` modes.
- `tests/rbac/can.test.tsx` - render gating via the `Can` component.
- `tests/auth/jwt.test.ts` - JWT decoding and claim normalization (including `force_password_change`).
- `tests/api/query.test.ts` - paging/sort/date query serialization rules.
- `tests/api/errors.test.ts` - HTTP status helpers and field-level error normalization.
- `tests/schemas/users.test.ts` - validation rules for user creation, suspend, reject, and lock payloads.
- `tests/schemas/config.test.ts` - validation rules for holiday, fee rule, velocity limit, and fiscal period payloads.

Run: `npm run test`

## End-to-end (Playwright)

- `tests/e2e/login.spec.ts` - visiting a protected route while unauthenticated redirects to `/login` and the MFA messaging is visible.

Set `PLAYWRIGHT_BASE_URL` to point at a running dev server, then run: `npm run test:e2e`

## Manual / scenario test cases

### Auth and MFA

- Sign in with valid credentials and complete TOTP -> lands on `/dashboard`.
- Sign in while `force_password_change=true` -> can only reach `/account/force-password-change` until password is changed.
- Token expiry while idle -> idle warning -> automatic logout if no response.
- Refresh near expiry -> all tabs continue using fresh token.

### RBAC personas

For each persona (`admin_full`, `staff_ops`, `audit_reader`):

- Sidebar shows only permitted sections.
- Direct URL navigation to a forbidden page renders `AccessDenied` (no 404 or blank).
- Action buttons are hidden when the user lacks the matching write permission.

### High-risk write actions

- Create user (STAFF) without email -> validation error inline.
- Lock user without reason -> blocked.
- Suspend user with `suspensionUntil` -> persisted state is reflected in detail page.
- Reject provisioning without reason -> blocked.
- Force password change -> verified by signing in as that user.
- Set roles to a different list -> token refresh shows new authorities after re-login.
- Approve/reject/cancel approval workflow -> step timeline updates.
- Close/reopen fiscal period -> `postingAllowed` flips appropriately.
- Compensation force complete with reason -> workflow status moves to COMPLETED.

### UX quality

- Dark mode toggle persists across sessions.
- All pages render without layout shift on slow networks (skeletons cover loading state).
- Keyboard tab order moves through filters, table actions, and form fields without skipping focusable elements.
- Toasts for destructive operations include the reference id (when present in the error payload).
