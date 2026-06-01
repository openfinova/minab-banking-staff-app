# Minab Banking Management Portal

Internal admin/staff management portal for the Minab open-source banking APIs. Built with Next.js App Router, TypeScript, Tailwind CSS, TanStack Query, and Zod.

## Scope

- Identity admin: users, roles, delegations, approval workflows
- Security and compliance: audit events, compliance reports
- Configuration: bank profile, holidays, fees, velocity limits
- Operations oversight: compensation workflows, GL approvals queue, fiscal periods, financial statements
- My Security: profile, password change, MFA setup/verify/disable

Out of scope: customer self-service, public registration, retail channels.

## Requirements

- Node.js 20+
- A running Minab backend exposing the OpenAPI surface in [`openfinova-local.json`](./openfinova-local.json)

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

The portal will be available at [http://localhost:3000](http://localhost:3000).

## Authentication

- OAuth2 Authorization Code + PKCE
- Mandatory second-factor flow for admin/staff users (TOTP and recovery codes)
- Force password change handling via JWT `force_password_change` claim
- Idle timeout warning + automatic logout

## Authorization

The UI is permission-driven from the JWT `permissions` claim. Three guard layers are available:

- `RouteGuard` - Page-level guard for App Router routes
- `NavGuard` - Sidebar/menu visibility guard
- `Can` - Action-level component guard for buttons and bulk actions

See [docs/permission-matrix.md](./docs/permission-matrix.md) for the full mapping.

## Documentation

- [Route map](./docs/route-map.md)
- [Sidebar map](./docs/sidebar-map.md)
- [Permission matrix](./docs/permission-matrix.md)
- [Auth, MFA, and RBAC flow](./docs/auth-flow.md)
- [Test plan](./docs/test-plan.md)

## Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Validate TypeScript
- `npm run test` - Run unit tests with Vitest
- `npm run test:e2e` - Run Playwright end-to-end tests
