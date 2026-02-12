# ⚡ Quick Reference Guide - FINARA

Panduan cepat untuk tugas-tugas umum dalam development FINARA.

## 📋 Table of Contents

- [Setup & Installation](#setup--installation)
- [Database Operations](#database-operations)
- [Development Commands](#development-commands)
- [Adding New Features](#adding-new-features)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Code Snippets](#code-snippets)

## Setup & Installation

### First Time Setup

```bash
# 1. Clone & install
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env dengan database credentials

# 3. Setup database
npm run db:generate
npm run db:push
npm run db:seed

# 4. Run development server
npm run dev
```

### Quick Reset

```bash
# Reset database & start fresh
npm run db:push -- --force-reset
npm run db:seed
```

## Database Operations

### Common Prisma Commands

```bash
# Generate Prisma Client (after schema changes)
npm run db:generate

# Push schema to database (development)
npm run db:push

# Seed database with initial data
npm run db:seed

# Open Prisma Studio (database GUI)
npm run db:studio

# Format schema file
npx prisma format

# Validate schema
npx prisma validate
```

### Creating Migration (Production)

```bash
# Create migration
npx prisma migrate dev --name describe_your_changes

# Apply migrations
npx prisma migrate deploy

# Reset database with migrations
npx prisma migrate reset
```

## Development Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)

# Building
npm run build            # Build for production
npm start                # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint -- --fix    # Fix linting errors

# TypeScript
npx tsc --noEmit         # Type check without building
```

## Adding New Features

### 1. Add New Page/Module

```bash
# Create new page
# app/(dashboard)/new-module/page.tsx
```

```typescript
"use client"

import { Header } from "@/components/header"

export default function NewModulePage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Module Name" description="Description" />
      <div className="flex-1 p-6">
        {/* Your content here */}
      </div>
    </div>
  )
}
```

### 2. Add New API Route

```bash
# Create API route
# app/api/new-endpoint/route.ts
```

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  // Define your schema
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Your logic here
  const data = await prisma.yourModel.findMany();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = schema.parse(body);

    const result = await prisma.yourModel.create({
      data: validatedData,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

### 3. Add New Database Model

```bash
# Edit prisma/schema.prisma
```

```prisma
model YourModel {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("your_table_name")
}
```

```bash
# Apply changes
npm run db:generate
npm run db:push
```

### 4. Add New shadcn/ui Component

```bash
# Install component
npx shadcn@latest add component-name

# Example: Add calendar component
npx shadcn@latest add calendar
```

### 5. Add Navigation Menu Item

Edit `components/app-sidebar.tsx`:

```typescript
const menuItems = [
  // ... existing items
  {
    title: "New Module",
    href: "/new-module",
    icon: YourIcon,
    permission: "canAccessNewModule" as const,
  },
];
```

Update `lib/permissions.ts`:

```typescript
export const permissions = {
  ADMIN: {
    // ... existing permissions
    canAccessNewModule: true,
  },
  // ... other roles
};
```

## Common Tasks

### Decimal Quantity Support (NEW ✨)

FINARA now supports **fractional quantities** for products sold by weight/volume:

```typescript
// Example: Sell 0.5 kg of rice
qty: 0.5  // ✅ Supported!
qty: 0.25 // ✅ Quarter kg
qty: 1.75 // ✅ 1.75 liters
```

**Quick Guide:**
- Minimum: 0.25
- Step: 0.25 (for increment buttons)
- Input: Any decimal value
- See: `docs/DECIMAL_QTY_USER_GUIDE.md`

**After pulling this feature:**
```bash
npm run db:generate
npm run db:push
npm run dev
```

### Add New User Role

1. Update `prisma/schema.prisma`:

```prisma
enum UserRole {
  KASIR
  ADMIN
  GUDANG
  MANAJER
  NEW_ROLE // Add here
}
```

2. Update permissions in `lib/permissions.ts`

3. Run:

```bash
npm run db:generate
npm run db:push
```

### Create Custom Hook

```typescript
// hooks/use-your-hook.ts
import { useState, useEffect } from "react";

export function useYourHook() {
  const [state, setState] = useState();

  useEffect(() => {
    // Your logic
  }, []);

  return { state, setState };
}
```

### Create Utility Function

```typescript
// lib/your-utils.ts
export function yourUtilityFunction(param: string): string {
  // Your logic
  return result;
}
```

### Add Form with Validation

```typescript
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
})

type FormData = z.infer<typeof formSchema>

export function YourForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  })

  async function onSubmit(data: FormData) {
    // Handle submission
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  )
}
```

## Troubleshooting

### Clear All Cache

```bash
# Delete build artifacts
rm -rf .next

# Delete node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Regenerate Prisma Client
npm run db:generate
```

### Fix Database Connection

```bash
# Check PostgreSQL is running
# Windows: Check Services
# Linux: sudo systemctl status postgresql
# Mac: brew services list

# Test connection
psql -U postgres -d finara_db

# Verify .env DATABASE_URL is correct
```

### Fix TypeScript Errors

```bash
# Type check
npx tsc --noEmit

# Restart TypeScript server in VS Code
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

### Fix Linting Errors

```bash
# Show errors
npm run lint

# Auto-fix
npm run lint -- --fix
```

## Code Snippets

### Fetch Data from API

```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function fetchData() {
    try {
      setLoading(true);
      const response = await fetch("/api/endpoint");
      const data = await response.json();
      setData(data);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }
  fetchData();
}, []);
```

### Create with API

```typescript
async function handleCreate(formData: any) {
  try {
    const response = await fetch("/api/endpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create");
    }

    const result = await response.json();
    toast.success("Created successfully");
    // Refresh data or redirect
  } catch (error: any) {
    toast.error(error.message);
  }
}
```

### Update with API

```typescript
async function handleUpdate(id: string, formData: any) {
  try {
    const response = await fetch(`/api/endpoint/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!response.ok) throw new Error("Failed to update");

    toast.success("Updated successfully");
    // Refresh data
  } catch (error: any) {
    toast.error(error.message);
  }
}
```

### Delete with API

```typescript
async function handleDelete(id: string) {
  if (!confirm("Are you sure?")) return;

  try {
    const response = await fetch(`/api/endpoint/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error("Failed to delete");

    toast.success("Deleted successfully");
    // Refresh data
  } catch (error: any) {
    toast.error(error.message);
  }
}
```

### Protected Page (Check Role)

```typescript
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { redirect } from "next/navigation"

export default async function ProtectedPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  return <div>Admin Only Content</div>
}
```

### Protected API Route

```typescript
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "requiredPermission")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Your logic here
}
```

### Format Currency (Indonesian Rupiah)

```typescript
function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

// Usage
<div>{formatRupiah(15000)}</div> // Rp 15.000
```

### Format Date (Indonesian)

```typescript
import { format } from "date-fns";
import { id } from "date-fns/locale";

function formatDate(date: Date): string {
  return format(date, "dd MMMM yyyy", { locale: id });
}

function formatDateTime(date: Date): string {
  return format(date, "dd/MM/yyyy HH:mm", { locale: id });
}
```

## Environment Variables Reference

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Optional (Production)
NODE_ENV="production"
```

## Useful VS Code Extensions

- **Prisma**: Syntax highlighting for Prisma schema
- **ES7+ React/Redux**: React snippets
- **Tailwind CSS IntelliSense**: Tailwind autocomplete
- **ESLint**: Linting in editor
- **Prettier**: Code formatting

## Git Workflow

```bash
# Feature development
git checkout -b feature/your-feature
# Make changes
git add .
git commit -m "feat: add your feature"
git push origin feature/your-feature

# Bug fix
git checkout -b fix/bug-description
# Make changes
git commit -m "fix: resolve bug description"
git push origin fix/bug-description
```

## Production Checklist

- [ ] Update `.env` with production values
- [ ] Change `NEXTAUTH_SECRET` to strong random string
- [ ] Set `NODE_ENV=production`
- [ ] Run `npm run build` successfully
- [ ] Test all features
- [ ] Setup database backups
- [ ] Configure logging
- [ ] Setup monitoring
- [ ] Enable HTTPS
- [ ] Configure CORS if needed
- [ ] Optimize images
- [ ] Setup CDN

## Support Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **shadcn/ui**: https://ui.shadcn.com
- **NextAuth.js**: https://next-auth.js.org
- **Tailwind CSS**: https://tailwindcss.com

---

💡 **Pro Tip**: Bookmark this file for quick access during development!

Keep this guide open in a separate tab while coding for quick reference.
