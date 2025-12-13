import { GET } from "@/app/api/akuntansi/dashboard/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  prisma: {
    akun: {
      count: jest.fn(),
    },
    jurnalEntry: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    periodeAkuntansi: {
      findFirst: jest.fn(),
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

describe("API Akuntansi Dashboard", () => {
  const mockSession = {
    user: {
      id: "user-1",
      role: "ADMIN",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (require("@/lib/permissions").hasPermission as jest.Mock).mockReturnValue(
      true,
    );
  });

  it("should return 401 if not authenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const req = new MockNextRequest(
      "http://localhost:3000/api/akuntansi/dashboard",
    );
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it("should return 403 if user has no permission", async () => {
    (require("@/lib/permissions").hasPermission as jest.Mock).mockReturnValue(
      false,
    );
    const req = new MockNextRequest(
      "http://localhost:3000/api/akuntansi/dashboard",
    );
    const res = await GET(req as any);
    expect(res.status).toBe(403);
  });

  it("should return dashboard data (Balanced)", async () => {
    (prisma.akun.count as jest.Mock).mockResolvedValue(10);
    (prisma.jurnalEntry.count as jest.Mock).mockResolvedValue(5);
    (prisma.periodeAkuntansi.findFirst as jest.Mock).mockResolvedValue({
      id: "p1",
      nama: "Jan 2024",
    });

    // Mock balanced entries
    (prisma.jurnalEntry.findMany as jest.Mock).mockResolvedValue([
      {
        details: [
          { debit: mockDecimal(100), kredit: mockDecimal(0) },
          { debit: mockDecimal(0), kredit: mockDecimal(100) },
        ],
      },
    ]);

    const req = new MockNextRequest(
      "http://localhost:3000/api/akuntansi/dashboard",
    );
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.totalAkun).toBe(10);
    expect(data.totalJurnal).toBe(5);
    expect(data.periodeAktif).toBe("Jan 2024");
    expect(data.isBalanced).toBe(true);
  });

  it("should return dashboard data (Unbalanced)", async () => {
    (prisma.akun.count as jest.Mock).mockResolvedValue(10);
    (prisma.jurnalEntry.count as jest.Mock).mockResolvedValue(5);
    (prisma.periodeAkuntansi.findFirst as jest.Mock).mockResolvedValue({
      id: "p1",
      nama: "Jan 2024",
    });

    // Mock unbalanced entries
    (prisma.jurnalEntry.findMany as jest.Mock).mockResolvedValue([
      {
        details: [
          { debit: mockDecimal(100), kredit: mockDecimal(0) },
          { debit: mockDecimal(0), kredit: mockDecimal(50) }, // Unbalanced
        ],
      },
    ]);

    const req = new MockNextRequest(
      "http://localhost:3000/api/akuntansi/dashboard",
    );
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.isBalanced).toBe(false);
  });
});
