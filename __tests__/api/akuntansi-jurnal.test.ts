import { GET, POST } from "@/app/api/akuntansi/jurnal/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { hasPermission } from "@/lib/permissions";

// Mock Next.js server components
jest.mock("next/server", () => {
  return {
    NextRequest: class {
      url: string;
      method: string;
      body: any;
      nextUrl: URL;
      constructor(url: string, init: any) {
        this.url = url;
        this.method = init?.method || "GET";
        this.body = init?.body;
        this.nextUrl = new URL(url);
      }
      json() {
        return Promise.resolve(JSON.parse(this.body));
      }
    },
    NextResponse: {
      json: (body: any, init?: any) => ({
        json: () => Promise.resolve(body),
        status: init?.status || 200,
      }),
    },
  };
});

// Mock auth options
jest.mock("@/lib/auth-options", () => ({
  authOptions: {},
}));

// Mock dependencies
jest.mock("next-auth");
jest.mock("@/lib/permissions");
jest.mock("@/lib/transaction-number", () => ({
  generateTransactionNumber: jest.fn(() => "JR-MOCK-001"),
}));
jest.mock("@/lib/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    jurnalEntry: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    periodeAkuntansi: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
    activityLog: {
      create: jest.fn(),
    },
  },
}));

describe("API: /api/akuntansi/jurnal", () => {
  const mockSession = {
    user: {
      id: "user-123",
      name: "Test User",
      role: "ADMIN",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (hasPermission as jest.Mock).mockReturnValue(true);
  });

  describe("GET Journal Entries", () => {
    test("should reject unauthorized requests", async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      // @ts-ignore
      const req = new (require("next/server").NextRequest)(
        "http://localhost/api/akuntansi/jurnal",
      );
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    test("should reject forbidden requests", async () => {
      (hasPermission as jest.Mock).mockReturnValue(false);
      // @ts-ignore
      const req = new (require("next/server").NextRequest)(
        "http://localhost/api/akuntansi/jurnal",
      );
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    test("should return journal entries with pagination", async () => {
      const mockEntries = [{ id: "1", nomorJurnal: "JR-001" }];
      (prisma.jurnalEntry.findMany as jest.Mock).mockResolvedValue(mockEntries);
      (prisma.jurnalEntry.count as jest.Mock).mockResolvedValue(1);

      // @ts-ignore
      const req = new (require("next/server").NextRequest)(
        "http://localhost/api/akuntansi/jurnal?page=1&limit=10",
      );
      const res = await GET(req);

      const data = await res.json();
      expect(data.entries).toEqual(mockEntries);
      expect(data.pagination.total).toBe(1);
    });
  });

  describe("POST Create Journal Entry", () => {
    const validPayload = {
      tanggal: "2024-01-01",
      deskripsi: "Test Journal",
      periodeId: "period-1",
      details: [
        { akunId: "acc-1", debit: 1000, kredit: 0 },
        { akunId: "acc-2", debit: 0, kredit: 1000 },
      ],
    };

    test("should validate required fields", async () => {
      // @ts-ignore
      const req = new (require("next/server").NextRequest)(
        "http://localhost/api/akuntansi/jurnal",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Missing required fields");
    });

    test("should validate double-entry balance", async () => {
      const unbalancedPayload = {
        ...validPayload,
        details: [
          { akunId: "acc-1", debit: 1000, kredit: 0 },
          { akunId: "acc-2", debit: 0, kredit: 500 }, // Unbalanced
        ],
      };

      // @ts-ignore
      const req = new (require("next/server").NextRequest)(
        "http://localhost/api/akuntansi/jurnal",
        {
          method: "POST",
          body: JSON.stringify(unbalancedPayload),
        },
      );
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Total debit must equal total credit");
    });

    test("should validate accounting period", async () => {
      (prisma.periodeAkuntansi.findUnique as jest.Mock).mockResolvedValue(null);

      // @ts-ignore
      const req = new (require("next/server").NextRequest)(
        "http://localhost/api/akuntansi/jurnal",
        {
          method: "POST",
          body: JSON.stringify(validPayload),
        },
      );
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid or inactive accounting period");
    });

    test("should create journal entry successfully", async () => {
      (prisma.periodeAkuntansi.findUnique as jest.Mock).mockResolvedValue({
        id: "period-1",
        isActive: true,
      });
      (prisma.jurnalEntry.create as jest.Mock).mockResolvedValue({
        id: "jr-1",
        nomorJurnal: "JR-MOCK-001",
      });

      // @ts-ignore
      const req = new (require("next/server").NextRequest)(
        "http://localhost/api/akuntansi/jurnal",
        {
          method: "POST",
          body: JSON.stringify(validPayload),
        },
      );
      const res = await POST(req);
      expect(res.status).toBe(201);

      expect(prisma.jurnalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nomorJurnal: "JR-MOCK-001",
            details: {
              create: expect.arrayContaining([
                expect.objectContaining({ debit: 1000, kredit: 0 }),
                expect.objectContaining({ debit: 0, kredit: 1000 }),
              ]),
            },
          }),
        }),
      );
    });
  });
});
