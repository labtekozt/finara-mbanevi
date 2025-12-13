# GitHub Copilot Instructions for Finara MVP

## 🏗 Project Architecture

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** NextAuth.js (Session-based)
- **UI:** Tailwind CSS + shadcn/ui
- **State:** React Hooks (Context for global state)

## 📱 Core Modules

- **Dashboard:** Overview with real-time stats (sales, transactions, low stock), recent activity
- **Kasir (POS):** Point of sale with cart, payment processing, automatic inventory updates and journal entries. Supports pending pickup (`belumDiambil`) with customer info tracking.
- **Inventaris:** Product management with CRUD, multi-location support, stock alerts
- **Transaksi:** Goods in/out transactions with auto-numbering, history tracking
- **Akuntansi:** Accounting module with journals, financial statements, trial balance, period closing
- **Hutang & Piutang:** Debt and receivables management with status tracking (`BELUM_LUNAS`, `LUNAS`, `JATUH_TEMPO`)

## 👥 User Roles & Permissions

- **Admin:** Full system access
- **Kasir:** POS operations and basic dashboard
- **Gudang:** Inventory and transaction management
- **Manajer:** Read-only access to all modules

## 🛡️ Security & Data Privacy

- **Sensitive Data:** NEVER return full `User` or `Kasir` objects in API responses.
  - **Pattern:** Always use `select: { id: true, nama: true, username: true }` in Prisma queries.
  - **Anti-Pattern:** `include: { user: true }` (leaks password hash).
- **Authorization:** Verify session and permissions in every API route using `getServerSession` and `hasPermission`.
- **Logging:** Use `logger` from `@/lib/logger` instead of `console.log` or `console.error`.
  - **Pattern:** `logger.info("Transaction created", { id: tx.id })` or `logger.error("Failed to process", error)`.

## 💾 Database & Transactions

- **Numeric Type:** All monetary and quantity fields use `Decimal` in Prisma (`@db.Decimal(15, 2)`).
  - **Arithmetic:** Convert to number for calculations: `item.harga.toNumber() * item.qty`.
  - **Serialization:** Use `serializeDecimal(data)` from `@/lib/utils` before returning JSON responses (Next.js cannot serialize Decimal).
- **Atomic Operations:** Use `prisma.$transaction` for any operation affecting multiple tables (e.g., Sales + Inventory + Accounting).
- **Optimization:** Prefer `select` over `include` to reduce payload size.
- **Transaction Numbering:** Use `lib/transaction-number.ts` for auto-generating unique transaction IDs.

## Code Style & Conventions

- **SOLID Principles:** Follow SOLID principles for maintainable code.
- **YAGNI:** Avoid over-engineering; implement features as needed.
- **DRY:** Reuse code via utility functions and custom hooks.
- **File Organization:** Group related files in feature-based folders (e.g., `app/api/kasir/`, `components/kasir/`).
- **Naming Conventions:** Use clear, descriptive names for variables, functions, and components.
- **Comments:** Write meaningful comments for complex logic, avoid obvious comments.
- **Git Commits:** Write clear commit messages following Conventional Commits format.

## 💰 Accounting & Financials

- **Double-Entry:** All financial transactions must create corresponding `JurnalEntry` records.
- **Helpers:** Use `lib/accounting-utils.ts` for creating journal entries (e.g., `createJournalEntryForSale`, `createJournalEntryForExpense`).
- **Consistency:** Ensure `debit` and `kredit` totals always balance.
- **Audit Trail:** All changes logged via `ActivityLog` model and `audit-logger.ts`.

## 🧩 Frontend Development

- **Components:** Use `components/ui` (shadcn) for base components.
- **Client Components:** Mark interactive components with `"use client"`.
- **Data Fetching:** Use `useEffect` or SWR for client-side fetching.
- **Forms:** Use `react-hook-form` with `zod` validation.
- **Hooks:** Use custom hooks in `hooks/` for data fetching (e.g., `useAccountingDashboard.ts`).
- **Routing:** Protected routes in `app/(dashboard)/`, public routes in root `app/`.
- **Layout:** Use `Providers` in root layout for session and toast management.

## 🧪 Testing & Quality

- **Unit Tests:** Run `npm test` for logic verification (Jest).
- **Type Checking:** Run `npm run check-types` to verify TypeScript types (especially Decimal vs number).
- **Linting:** Run `npm run lint` to check for issues.
- **Formatting:** Run `npm run format` (Prettier) before committing.

## 🚀 Common Commands

- `npm run dev`: Start development server
- `npm run build`: Full build (Format -> Check Types -> Next Build)
- `npx prisma generate`: Regenerate Prisma client (run after schema changes)
- `npx prisma db push`: Apply schema changes to database
- `npm run db:seed`: Populate database with initial data
- `npm run db:studio`: Open Prisma Studio GUI
