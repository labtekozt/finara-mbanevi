# GitHub Copilot Instructions for Finara MVP

## 🏗 Project Architecture

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** NextAuth.js (Session-based)
- **UI:** Tailwind CSS + shadcn/ui
- **State:** React Hooks (Context for global state)

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

## 💰 Accounting & Financials

- **Double-Entry:** All financial transactions must create corresponding `JurnalEntry` records.
- **Helpers:** Use `lib/accounting-utils.ts` for creating journal entries (e.g., `createJournalEntryForSale`, `createJournalEntryForExpense`).
- **Consistency:** Ensure `debit` and `kredit` totals always balance.

## 🧩 Frontend Development

- **Components:** Use `components/ui` (shadcn) for base components.
- **Client Components:** Mark interactive components with `"use client"`.
- **Data Fetching:** Use `useEffect` or SWR for client-side fetching.
- **Forms:** Use `react-hook-form` with `zod` validation.

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
