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

## 💾 Database & Transactions

- **Atomic Operations:** Use `prisma.$transaction` for any operation affecting multiple tables (e.g., Sales + Inventory + Accounting).
- **Optimization:** Prefer `select` over `include` to reduce payload size. Avoid unnecessary nested includes if data is denormalized (e.g., `namaBarang` in `ItemTransaksi`).
- **Schema Changes:** Run `npx prisma db push` to apply schema changes during development.

## 💰 Accounting & Financials

- **Double-Entry:** All financial transactions must create corresponding `JurnalEntry` records.
- **Helpers:** Use `lib/accounting-utils.ts` for creating journal entries (e.g., `createJournalEntryForSale`, `createJournalEntryForExpense`).
- **Consistency:** Ensure `debit` and `kredit` totals always balance.

## 🧩 Frontend Development

- **Components:** Use `components/ui` (shadcn) for base components.
- **Client Components:** Mark interactive components with `"use client"`.
- **Data Fetching:** Use `useEffect` or SWR for client-side fetching; prefer Server Components for initial data where possible.
- **Forms:** Use `react-hook-form` with `zod` validation.

## 🧪 Testing & Quality

- **Unit Tests:** Run `npm test` for logic verification (Jest).
- **Linting:** Run `npm run lint` to check for issues.
- **Type Safety:** Ensure all interfaces in `types/` match the Prisma schema and API responses.

## 🚀 Common Commands

- `npm run dev`: Start development server
- `npx prisma generate`: Regenerate Prisma client
- `npx prisma studio`: Open database GUI
