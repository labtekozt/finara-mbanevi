import { POST } from "@/app/api/piutang/[id]/bayar/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { createJournalEntryForReceivablePayment } from "@/lib/accounting-utils";

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
jest.mock("@/lib/accounting-utils", () => ({
  createJournalEntryForReceivablePayment: jest.fn(),
}));
jest.mock("@/lib/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn((callback) => callback(prisma)),
    piutang: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    pembayaranPiutang: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe("API: /api/piutang/[id]/bayar", () => {
  const mockSession = {
    user: {
      id: "user-123",
      name: "Test User",
    },
  };

  const mockParams = Promise.resolve({ id: "ptg-1" });

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-123",
      username: "testuser",
    });
  });

  test("should reject unauthorized requests", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    // @ts-ignore
    const req = new (require("next/server").NextRequest)(
      "http://localhost/api/piutang/ptg-1/bayar",
      {
        method: "POST",
        body: JSON.stringify({ jumlahBayar: 10000 }),
      },
    );
    const res = await POST(req, { params: mockParams });
    expect(res.status).toBe(401);
  });

  test("should validate payment amount > 0", async () => {
    // @ts-ignore
    const req = new (require("next/server").NextRequest)(
      "http://localhost/api/piutang/ptg-1/bayar",
      {
        method: "POST",
        body: JSON.stringify({ jumlahBayar: 0 }),
      },
    );
    const res = await POST(req, { params: mockParams });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Jumlah bayar harus lebih dari 0");
  });

  test("should fail if piutang not found", async () => {
    (prisma.piutang.findUnique as jest.Mock).mockResolvedValue(null);

    // @ts-ignore
    const req = new (require("next/server").NextRequest)(
      "http://localhost/api/piutang/ptg-1/bayar",
      {
        method: "POST",
        body: JSON.stringify({ jumlahBayar: 10000 }),
      },
    );
    const res = await POST(req, { params: mockParams });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Piutang tidak ditemukan");
  });

  test("should fail if payment exceeds remaining balance", async () => {
    (prisma.piutang.findUnique as jest.Mock).mockResolvedValue({
      id: "ptg-1",
      sisaPiutang: 5000,
      totalPiutang: 10000,
      totalBayar: 5000,
    });

    // @ts-ignore
    const req = new (require("next/server").NextRequest)(
      "http://localhost/api/piutang/ptg-1/bayar",
      {
        method: "POST",
        body: JSON.stringify({ jumlahBayar: 6000 }), // Exceeds 5000
      },
    );
    const res = await POST(req, { params: mockParams });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Jumlah bayar melebihi sisa piutang");
  });

  test("should process partial payment successfully", async () => {
    (prisma.piutang.findUnique as jest.Mock).mockResolvedValue({
      id: "ptg-1",
      sisaPiutang: 10000,
      totalPiutang: 10000,
      totalBayar: 0,
    });
    (prisma.pembayaranPiutang.create as jest.Mock).mockResolvedValue({
      id: "pay-1",
    });
    (prisma.piutang.update as jest.Mock).mockResolvedValue({});

    // @ts-ignore
    const req = new (require("next/server").NextRequest)(
      "http://localhost/api/piutang/ptg-1/bayar",
      {
        method: "POST",
        body: JSON.stringify({ jumlahBayar: 5000 }),
      },
    );
    const res = await POST(req, { params: mockParams });
    expect(res.status).toBe(200);

    expect(prisma.piutang.update).toHaveBeenCalledWith({
      where: { id: "ptg-1" },
      data: {
        totalBayar: 5000,
        sisaPiutang: 5000,
        status: "BELUM_LUNAS",
      },
    });
    expect(createJournalEntryForReceivablePayment).toHaveBeenCalled();
  });

  test("should process full payment and update status to LUNAS", async () => {
    (prisma.piutang.findUnique as jest.Mock).mockResolvedValue({
      id: "ptg-1",
      sisaPiutang: 10000,
      totalPiutang: 10000,
      totalBayar: 0,
    });

    // @ts-ignore
    const req = new (require("next/server").NextRequest)(
      "http://localhost/api/piutang/ptg-1/bayar",
      {
        method: "POST",
        body: JSON.stringify({ jumlahBayar: 10000 }),
      },
    );
    const res = await POST(req, { params: mockParams });
    expect(res.status).toBe(200);

    expect(prisma.piutang.update).toHaveBeenCalledWith({
      where: { id: "ptg-1" },
      data: {
        totalBayar: 10000,
        sisaPiutang: 0,
        status: "LUNAS",
      },
    });
  });
});
