import { GET } from "@/app/api/akuntansi/buku-besar/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  prisma: {
    akun: {
      findUnique: jest.fn(),
    },
    jurnalDetail: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  hasPermission: jest.fn(),
}));

// Mock Decimal
const mockDecimal = (val: number) => ({
  toNumber: () => val,
  toString: () => val.toString(),
});

// Mock Request
class MockNextRequest {
  url: string;
  constructor(url: string) {
    this.url = url;
  }
}

describe("API Akuntansi Buku Besar", () => {
  const mockSession = {
    user: {
      id: "user-1",
      role: "ADMIN",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (require("@/lib/permissions").hasPermission as jest.Mock).mockReturnValue(true);
  });

  it("should return 401 if not authenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const req = new MockNextRequest("http://localhost:3000/api/akuntansi/buku-besar");
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no permission", async () => {
    (require("@/lib/permissions").hasPermission as jest.Mock).mockReturnValue(false);
    const req = new MockNextRequest("http://localhost:3000/api/akuntansi/buku-besar");
    const res = await GET(req as any);
    expect(res.status).toBe(403);
  });

  it("should return 400 if akunId is missing", async () => {
    const req = new MockNextRequest("http://localhost:3000/api/akuntansi/buku-besar");
    const res = await GET(req as any);
    expect(res.status).toBe(400);
  });

  it("should return 404 if account not found", async () => {
    (prisma.akun.findUnique as jest.Mock).mockResolvedValue(null);
    const req = new MockNextRequest("http://localhost:3000/api/akuntansi/buku-besar?akunId=acc-1");
    const res = await GET(req as any);
    expect(res.status).toBe(404);
  });

  it("should return general ledger with running balance", async () => {
    const mockAccount = { id: "acc-1", kode: "1001", nama: "Cash", tipe: "ASSET" };
    (prisma.akun.findUnique as jest.Mock).mockResolvedValue(mockAccount);

    const mockDetails = [
      {
        id: "detail-1",
        debit: mockDecimal(1000),
        kredit: mockDecimal(0),
        jurnal: {
          id: "jurnal-1",
          nomorJurnal: "J-001",
          tanggal: new Date("2024-01-01"),
          deskripsi: "Initial Deposit",
          referensi: "REF-001",
          periode: {},
          user: { id: "u1", nama: "User", username: "user" },
        },
        akun: mockAccount,
      },
      {
        id: "detail-2",
        debit: mockDecimal(0),
        kredit: mockDecimal(200),
        jurnal: {
          id: "jurnal-2",
          nomorJurnal: "J-002",
          tanggal: new Date("2024-01-02"),
          deskripsi: "Expense",
          referensi: "REF-002",
          periode: {},
          user: { id: "u1", nama: "User", username: "user" },
        },
        akun: mockAccount,
      },
    ];
    (prisma.jurnalDetail.findMany as jest.Mock).mockResolvedValue(mockDetails);

    const req = new MockNextRequest("http://localhost:3000/api/akuntansi/buku-besar?akunId=acc-1");
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.entries).toHaveLength(2);
    
    // Entry 1: +1000 -> Balance 1000
    expect(data.entries[0].saldo).toBe(1000);
    
    // Entry 2: -200 -> Balance 800
    expect(data.entries[1].saldo).toBe(800);

    expect(data.saldoAkhir).toBe(800);
  });

  it("should calculate opening balance when startDate is provided", async () => {
    const mockAccount = { id: "acc-1", kode: "1001", nama: "Cash", tipe: "ASSET" };
    (prisma.akun.findUnique as jest.Mock).mockResolvedValue(mockAccount);

    // Mock findMany calls
    // First call is for journal details (within date range)
    // Second call is for opening balance (before startDate)
    (prisma.jurnalDetail.findMany as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: "detail-1",
          debit: mockDecimal(100),
          kredit: mockDecimal(0),
          jurnal: {
            id: "jurnal-1",
            nomorJurnal: "J-001",
            tanggal: new Date("2024-02-01"),
            deskripsi: "Deposit",
            referensi: "REF-001",
            periode: {},
            user: { id: "u1", nama: "User", username: "user" },
          },
          akun: mockAccount,
        },
      ])
      .mockResolvedValueOnce([
        { debit: mockDecimal(500), kredit: mockDecimal(0) }, // Opening: 500
      ]);

    const req = new MockNextRequest("http://localhost:3000/api/akuntansi/buku-besar?akunId=acc-1&startDate=2024-02-01&endDate=2024-02-29");
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.saldoAwal).toBe(500);
    expect(data.entries[0].saldo).toBe(600); // 500 + 100
  });
});
