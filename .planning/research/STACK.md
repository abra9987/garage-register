# Technology Stack

**Project:** Garage Register Automation
**Researched:** 2026-04-08
**Overall Confidence:** HIGH

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 16.2.x | Fullstack React framework | Matches Invoice Ledger (16.2.1). App Router stable since v13.4. Turbopack now default for fast builds. React Compiler stable. Consistent with AD Auto ecosystem. | HIGH |
| React | 19.2.x | UI library | Ships with Next.js 16. React Compiler auto-memoizes components. | HIGH |
| TypeScript | ^5.x | Type safety | Non-negotiable for data extraction accuracy. Catches field mapping errors at compile time. | HIGH |

### Database & ORM

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL | (shared) | Primary database | Already running on Coolify. Proven in Invoice Ledger. Shared instance on Hetzner CX43. | HIGH |
| Drizzle ORM | 0.45.x | Database ORM | 7.4 KB gzipped (vs Prisma's ~1.6 MB). Code-first TypeScript schemas -- no separate schema language or generation step. SQL-like query syntax matches how the data needs to flow. Zero binary dependencies. 900K+ weekly npm downloads and growing fast. Better-Auth has first-class Drizzle adapter. | HIGH |
| drizzle-kit | latest | Migration tooling | Generates SQL migrations from schema changes. `drizzle-kit push` for dev, `drizzle-kit generate` + `drizzle-kit migrate` for production. | HIGH |
| postgres (postgres.js) | latest | PostgreSQL driver | Lighter than node-postgres (pg). Used by default in Drizzle's PostgreSQL setup. Prepared statements by default. No native binaries. | MEDIUM |

**Why Drizzle over Prisma:**
- Invoice Ledger has no ORM (raw queries). This project has more complex schema (vehicles, documents, audit trail) -- ORM is justified.
- Drizzle's ~7.4 KB vs Prisma's ~1.6 MB matters for Docker image size on shared Hetzner server.
- No `prisma generate` step -- schema changes are instant in development.
- Better-Auth has a dedicated Drizzle adapter that auto-generates auth tables.
- Prisma 7 dropped the Rust engine, but still heavier and requires a separate schema language.

### AI / Document Extraction

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @anthropic-ai/sdk | ^0.85.x | Claude API client | Official TypeScript SDK. Actively maintained (published daily). Native PDF support via `document` content blocks. | HIGH |
| Claude Sonnet (claude-sonnet-4-20250514) | latest | Extraction model | Best price/performance for structured extraction. ~$3/MTok input, ~$15/MTok output. For ~50 docs/month at 1-2 pages each: well under $5/month budget. | HIGH |

**PDF Processing Approach:**
- Send PDFs directly to Claude API as base64-encoded `document` content blocks. No need for pdf-parse, Tesseract, or any OCR preprocessing.
- Max 32 MB per request, 100 pages per request (200K context models).
- Each page is converted to image + text extraction internally by Claude.
- Token cost: ~1,500-3,000 tokens per page (text) + image tokens per page.
- Use prompt caching (`cache_control: { type: "ephemeral" }`) if re-analyzing same document.

**Why NOT use claude-opus or claude-haiku:**
- Opus: Overkill for structured data extraction. 5x+ the cost. No accuracy gain for invoice parsing.
- Haiku: Too cheap may mean missed edge cases on complex documents like OMVIC forms. Sonnet is the sweet spot.

### XLSX Processing

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ExcelJS | ^4.4.0 | Generate new XLSX files | Already used in Invoice Ledger -- proven in AD Auto ecosystem. Strong API for creating workbooks from scratch with styles, formatting, column widths. 5.5M weekly downloads. | HIGH |
| ExcelJS | ^4.4.0 | Read/modify existing XLSX | Use for appending to existing Garage Register. ExcelJS preserves theme files and most formatting on read/modify/write. Ministry template is a simple table (no cross-sheet refs, no dropdowns, no data validations) -- ExcelJS handles this fine. | MEDIUM |

**Why single library (ExcelJS) instead of dual libraries:**
- The Ministry Garage Register XLSX is a simple flat table with header row + data rows. No cross-sheet references, no conditional formatting, no data validations, no dropdowns.
- xlsx-populate is better for complex workbooks with advanced features, but the original is unmaintained (last published 6 years ago). The `@xlsx/xlsx-populate` fork exists (v0.2.0) but is too new to trust for a regulatory document.
- ExcelJS is already proven in Invoice Ledger. One library to learn, one dependency to maintain.
- If ExcelJS fails to preserve specific Ministry formatting: fallback strategy is to keep a template copy and always generate fresh from data (never modify in-place).

**Risk mitigation:** Test ExcelJS read/modify/write with the actual Ministry XLSX template early in development (Phase 1). If it corrupts formatting, switch to the generation-only approach (always create from template + data, never append).

### Authentication

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Better Auth | ^1.6.0 | Authentication | Self-hosted, no vendor lock-in. Built-in email/password auth. First-class Drizzle ORM adapter. Plugin system for future 2FA, magic links. ~100K weekly downloads, fastest-growing auth lib. Session management included. | HIGH |

**Why Better Auth over alternatives:**
- **NextAuth/Auth.js:** Established but adapter pattern is clunky. Doesn't manage its own schema. More boilerplate for simple email/password.
- **Lucia Auth:** Deprecated as of March 2025. Now just educational material. Not suitable for new projects.
- **Clerk/Auth0:** SaaS -- violates self-hosted requirement. Vendor lock-in. Overkill for single user.
- Better Auth generates and manages its own database schema, handles migrations, and has first-class Drizzle + PostgreSQL support. For a single-user app that may grow to multi-user, this is the right choice.

### UI Components & Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| shadcn/ui | CLI v4 | Component library | Copy-paste components you own. Built on Radix UI (accessible). Styled with Tailwind. Beautiful defaults. Fully customizable. Used across modern Next.js ecosystem. | HIGH |
| Tailwind CSS | ^4.2.x | Utility CSS | Already used in Invoice Ledger. v4 is 5x faster builds, CSS-first config with `@theme`. No JS config file needed. | HIGH |
| Radix UI | (via shadcn) | Accessible primitives | Keyboard navigation, screen readers, focus management -- all handled. Andrey is non-technical; accessible = fewer confusion points. | HIGH |
| Sonner | ^2.0.x | Toast notifications | Opinionated, beautiful toasts. shadcn/ui has built-in Sonner integration. Fire-and-forget API. Perfect for "Document processed" / "Export complete" feedback. | HIGH |
| Lucide React | (via shadcn) | Icons | Default icon library for shadcn/ui. Tree-shakeable. Consistent design language. | HIGH |

### Form Handling & Validation

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| React Hook Form | ^7.72.x | Form state management | Uncontrolled components = fast renders. Perfect for review/edit forms with many fields (VIN, Make, Model, Year, etc.). Minimal re-renders. | HIGH |
| Zod | ^4.3.x | Schema validation | TypeScript-first validation. Shared schemas between API and client. VIN validation, required fields, format checks. Integrates with React Hook Form via `@hookform/resolvers`. | HIGH |
| @hookform/resolvers | latest | RHF + Zod integration | Bridges React Hook Form and Zod for declarative form validation. | HIGH |

### File Upload

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| react-dropzone | latest | Drag-and-drop file upload | ~5M weekly downloads. Headless -- style with Tailwind/shadcn. Handles drag events, file validation (type, size), multiple files. Battle-tested. | HIGH |

**Upload approach:**
- react-dropzone for the UI (drag-and-drop zone, file type filtering to PDF only).
- Next.js API route receives the file via FormData.
- Store PDF as binary in PostgreSQL (bytea column) or on filesystem in Docker volume. PostgreSQL bytea is simpler for backup/restore and avoids filesystem management. At ~50 docs/month, ~200KB each, that is ~10MB/month -- negligible.
- On extraction: read from DB, base64-encode, send to Claude API.

**Why NOT UploadThing:** External service. Adds latency, dependency, and cost for a simple use case. PDFs stay local.

### PDF Preview (Optional)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| react-pdf | ^10.x | PDF preview in browser | Display uploaded PDF alongside extracted data for review. Uses pdf.js under the hood. Dynamic import to avoid SSR issues. | MEDIUM |

**Note:** PDF preview is a nice-to-have for the review screen. Andrey can compare extracted fields against the visible PDF. If bundle size is a concern, defer this to Phase 2.

### URL State Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| nuqs | latest | Type-safe URL search params | 6 KB gzipped. useState-like API synced to URL. Perfect for search/filter on vehicle list page. Featured at Next.js Conf 2025. | MEDIUM |

### Utilities

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| date-fns | latest | Date formatting | Tree-shakeable. Used for transaction dates, audit timestamps. Lighter than dayjs/moment. | HIGH |
| clsx + tailwind-merge | (via shadcn) | Class name merging | Installed automatically by shadcn/ui init. Handles conditional Tailwind classes. | HIGH |

### Development & Tooling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ESLint | ^9.x | Linting | Ships with Next.js. Consistent with Invoice Ledger setup. | HIGH |
| Turbopack | (built into Next.js 16) | Dev server bundler | Default in Next.js 16. 2-5x faster builds than Webpack. No configuration needed. | HIGH |
| Docker | latest | Containerization | Required for Coolify deployment. Multi-stage build for small image. | HIGH |

### Deployment & Infrastructure

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Docker | multi-stage | Container build | Node.js base image. Multi-stage for small production image (~200MB). | HIGH |
| Coolify | (existing) | PaaS | Already running on Hetzner CX43. Handles SSL, reverse proxy, deployments. | HIGH |
| Hetzner CX43 | (existing) | Server | Shared with Invoice Ledger, CRM, DealManager. Sufficient for single-user app. | HIGH |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| ORM | Drizzle ORM | Prisma | Heavier (~1.6MB), separate schema language, generate step. Drizzle is lighter and more aligned with TypeScript. |
| ORM | Drizzle ORM | Raw SQL/pg | Works in Invoice Ledger but this project has more complex schema (vehicles, documents, audit). ORM prevents SQL injection and provides type safety. |
| Auth | Better Auth | NextAuth/Auth.js | More boilerplate for email/password. Adapter pattern less clean than Better Auth's built-in schema management. |
| Auth | Better Auth | Lucia Auth | Deprecated March 2025. Maintenance mode only. |
| Auth | Better Auth | Clerk | SaaS, vendor lock-in, not self-hosted. |
| UI | shadcn/ui | Material UI | Heavy, opinionated design system. Hard to customize. Not aligned with Tailwind. |
| UI | shadcn/ui | Chakra UI | Good but less ecosystem momentum in 2026. shadcn/ui is the clear community standard. |
| XLSX | ExcelJS | xlsx-populate | Unmaintained (6 years). Fork @xlsx/xlsx-populate too new. ExcelJS is proven in Invoice Ledger. |
| XLSX | ExcelJS | SheetJS | Free version strips styling on write. Paid version required for formatting. Not viable. |
| File Upload | react-dropzone | UploadThing | External SaaS. Adds unnecessary dependency for simple local file upload. |
| PostgreSQL Driver | postgres.js | pg (node-postgres) | Both work. postgres.js is lighter, no native bindings. Drizzle docs default to it. |

## Installation

```bash
# Create Next.js 16 project
npx create-next-app@latest garage-register --typescript --tailwind --eslint --app --turbopack

# Core dependencies
npm install drizzle-orm postgres better-auth @anthropic-ai/sdk exceljs zod react-hook-form @hookform/resolvers react-dropzone sonner nuqs date-fns

# Dev dependencies
npm install -D drizzle-kit @types/node

# Initialize shadcn/ui (installs Radix, clsx, tailwind-merge, lucide-react)
npx shadcn@latest init

# Add shadcn components as needed
npx shadcn@latest add button card dialog form input label table tabs toast sonner dropdown-menu badge separator sheet
```

## Environment Variables

```env
# Database (shared PostgreSQL on Coolify)
DATABASE_URL=postgresql://user:password@localhost:5432/garage_register

# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Better Auth
BETTER_AUTH_SECRET=... # Generate with: openssl rand -base64 32
BETTER_AUTH_URL=https://garage.adauto.ca

# App
NEXT_PUBLIC_APP_URL=https://garage.adauto.ca
```

## Docker Configuration (Production)

```dockerfile
# Multi-stage build for Coolify deployment
FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

## Version Pinning Strategy

Pin major versions in package.json to avoid breaking changes on `npm install`:
- `next`: `^16.2.0` (stay on 16.x)
- `react`: `^19.2.0` (stay on 19.x)
- `drizzle-orm`: `^0.45.0` (pre-1.0, pin minor)
- `better-auth`: `^1.6.0` (post-1.0, pin major)
- `exceljs`: `^4.4.0` (stable, infrequent releases)
- `@anthropic-ai/sdk`: `^0.85.0` (pre-1.0, updates frequently -- pin minor, test before updating)

## Sources

- [Anthropic PDF Support Docs](https://platform.claude.com/docs/en/docs/build-with-claude/pdf-support) -- PDF limits, base64 encoding, token costs (HIGH confidence)
- [Anthropic TypeScript SDK](https://www.npmjs.com/package/@anthropic-ai/sdk) -- v0.85.0, actively maintained (HIGH confidence)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/get-started-postgresql) -- PostgreSQL setup, driver options (HIGH confidence)
- [Better Auth](https://better-auth.com/) -- v1.6.0, Drizzle adapter, email/password auth (HIGH confidence)
- [Better Auth Drizzle Adapter](https://better-auth.com/docs/adapters/drizzle) -- Schema generation, PostgreSQL support (HIGH confidence)
- [shadcn/ui](https://ui.shadcn.com/) -- CLI v4, Next.js installation, React 19 + Tailwind v4 support (HIGH confidence)
- [Next.js 16 Blog Post](https://nextjs.org/blog/next-16) -- Turbopack stable, React Compiler, Cache Components (HIGH confidence)
- [ExcelJS npm](https://www.npmjs.com/package/exceljs) -- v4.4.0, 5.5M weekly downloads (HIGH confidence)
- [xlsx-populate comparison](https://mfyz.com/nodejs-excel-library-comparison) -- Preserves formatting but unmaintained (MEDIUM confidence)
- [Drizzle vs Prisma 2026](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma) -- Performance, bundle size, DX comparison (MEDIUM confidence)
- [Better Auth vs Lucia vs NextAuth 2026](https://trybuildpilot.com/625-better-auth-vs-lucia-vs-nextauth-2026) -- Auth landscape analysis (MEDIUM confidence)
- [Tailwind CSS v4.2](https://tailwindcss.com/blog/tailwindcss-v4) -- CSS-first config, performance improvements (HIGH confidence)
- Invoice Ledger project `package.json` -- Next.js 16.2.1, React 19.2.4, Tailwind v4, ExcelJS 4.4.0 (HIGH confidence, verified locally)
