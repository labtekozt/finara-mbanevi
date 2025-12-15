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
- **Inventaris:** Product management with CRUD, multi-location support, stock alerts.
- **Stock Opname:** Inventory adjustment module with approval workflows and automatic journal entries (Inventory vs Other Revenue/Expense).
- **Transaksi:** Goods in/out transactions with auto-numbering, history tracking.
- **Akuntansi:** Accounting module with journals, financial statements (Neraca, Laba Rugi), trial balance, period closing, and initial capital calculation.
- **Hutang & Piutang:** Debt and receivables management with status tracking (`BELUM_LUNAS`, `LUNAS`, `JATUH_TEMPO`).

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
- **Session Validation (Zombie Sessions):** Always verify the user exists in the DB after checking the session, as the session token might persist after a DB reset.
  ```typescript
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const userExists = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!userExists) return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  ```
- **Logging:** Use `logger` from `@/lib/logger` instead of `console.log` or `console.error`.

## 💾 Database & Transactions

- **Numeric Type:** All monetary and quantity fields use `Decimal` in Prisma (`@db.Decimal(15, 2)`).
  - **Arithmetic:** PREFER `Prisma.Decimal` methods (`plus`, `minus`, `times`, `div`) for all financial calculations to avoid floating-point errors.
  - **Pattern:** `const total = decimalValue.plus(otherDecimal).times(qty);`
  - **Serialization:** Use `serializeDecimal(data)` from `@/lib/utils` before returning JSON responses (Next.js cannot serialize Decimal).
- **Atomic Operations:** Use `prisma.$transaction` for any operation affecting multiple tables (e.g., Sales + Inventory + Accounting).
  - **Stock Updates:** Use `updateMany` with `where: { stok: { gte: qty } }` to ensure atomic stock checks and prevent negative inventory.
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
- **Helpers:** Use `lib/accounting-utils.ts` for creating journal entries (e.g., `createJournalEntryForSale`, `createJournalEntryForStockAdjustment`). **Do not manually create journal entries** in API routes; always use these helpers to ensure consistency.
- **Consistency:** Ensure `debit` and `kredit` totals always balance.
- **Reporting:**
  - **Trial Balance:** Sum `Prisma.Decimal` values first, then convert to number.
  - **Balance Sheet:** Respect signed balances (Assets = Liabilities + Equity). Negative assets (e.g., overdraft) should reduce total assets, not increase them.
- **Audit Trail:** All changes logged via `ActivityLog` model and `audit-logger.ts`.

## 🧩 Frontend Development

- **Components:** Use `components/ui` (shadcn) for base components.
- **Client Components:** Mark interactive components with `"use client"`.
- **Data Fetching:** Use `useEffect` or SWR for client-side fetching.
- **Forms:** Use `react-hook-form` with `zod` validation.
- **Hooks:** Use custom hooks in `hooks/` for data fetching (e.g., `useAccountingDashboard.ts`).
- **Routing:** Protected routes in `app/(dashboard)/`, public routes in root `app/`.
- **Layout:** Use `Providers` in root layout for session and toast management.

## 🧪 Testing Strategy

- **Framework:** Jest with `ts-jest`.
- **Integration Tests:** Located in `__tests__/`. Focus on E2E flows (API -> DB -> Accounting).
- **Mocking Prisma:**
  - **Transactions:** Mock `$transaction` to execute the callback immediately: `(prisma.$transaction as jest.Mock).mockImplementation((cb) => cb(prisma))`.
  - **Session Validation:** You **MUST** mock `prisma.user.findUnique` in every test that hits a protected API route, because the API checks for user existence.
    ```typescript
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "user-123", username: "test" });
    ```
  - **Decimals:** Use `new Prisma.Decimal(val)` for mocked return values to ensure arithmetic methods (`plus`, `times`) work correctly. Avoid simple `{ toNumber: ... }` mocks if the code performs math on the result.
- **Atomic Updates:** When testing stock updates, mock `updateMany` to return `{ count: 1 }` to simulate successful atomic updates.
- **Reference:** See `__tests__/integration-kasir-inventory.test.ts` for a complete example of mocking complex transaction flows.
- **Commands:**
  - `npm test`: Run all tests.
  - `npm test <filename>`: Run specific test file.
  - `npm run check-types`: Verify TypeScript types.

## 🚀 Deployment & DevOps

- **Build Memory:** The build process requires increased memory. Use `export NODE_OPTIONS="--max-old-space-size=4096"` before `npm run build`.
- **CI/CD:** GitHub Actions (`deploy.yml`) handles deployment. It runs `npm test` before building.
- **VPS:** The app runs on a VPS managed by PM2.
- **Commands:**
  - `npm run build`: Full build (Format -> Check Types -> Next Build)
  - `npm run db:generate`: Regenerate Prisma client (run after schema changes)
  - `npm run db:push`: Apply schema changes to database
  - `npm run db:seed`: Populate database with initial data
  - `npm run db:studio`: Open Prisma Studio GUI
