import { GET, POST } from "@/app/api/akuntansi/periode/route";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { getActiveAccountingPeriod } from "@/lib/accounting-utils";

// Mock dependencies
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth-options", () => ({
  authOptions: {},
}));

jest.mock("@/lib/permissions", () => ({
  hasPermission: jest.fn(),
}));

jest.mock("@/lib/accounting-utils", () => ({
  getActiveAccountingPeriod: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    periodeAkuntansi: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock NextRequest
class MockNextRequest {
  method: string;
  url: string;
  body: any;

  constructor(method: string, url: string, body: any = {}) {
    this.method = method;
    this.url = url;
    this.body = body;
  }

  async json() {
    return this.body;
  }
}

describe("Akuntansi Periode API", () => {
  const mockSession = {
    user: {
      id: "user-123",
      name: "Test User",
      role: "ADMIN",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (require("next-auth").getServerSession as jest.Mock).mockResolvedValue(
      mockSession,
    );
    (hasPermission as jest.Mock).mockReturnValue(true);
  });

  describe("GET /api/akuntansi/periode", () => {
    it("should list periods", async () => {
      const mockPeriods = [
        { id: "p-1", nama: "Jan 2023", isActive: true },
        { id: "p-2", nama: "Feb 2023", isActive: false },
      ];

      (prisma.periodeAkuntansi.findMany as jest.Mock).mockResolvedValue(
        mockPeriods,
      );

      const req = new MockNextRequest(
        "GET",
        "http://localhost:3000/api/akuntansi/periode",
      );

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockPeriods);
      expect(getActiveAccountingPeriod).toHaveBeenCalled(); // Auto-create check
    });
  });

  describe("POST /api/akuntansi/periode", () => {
    it("should create period successfully", async () => {
      const periodData = {
        nama: "Mar 2023",
        tanggalMulai: "2023-03-01",
        tanggalAkhir: "2023-03-31",
        isActive: true,
      };

      (prisma.periodeAkuntansi.findFirst as jest.Mock).mockResolvedValue(null); // No overlap
      (prisma.periodeAkuntansi.create as jest.Mock).mockResolvedValue({
        id: "p-new",
        ...periodData,
      });

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/akuntansi/periode",
        periodData,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(prisma.periodeAkuntansi.updateMany).toHaveBeenCalledWith({
        where: { isActive: true },
        data: { isActive: false },
      });
      expect(prisma.periodeAkuntansi.create).toHaveBeenCalled();
    });

    it("should reject invalid date range", async () => {
      const periodData = {
        nama: "Invalid",
        tanggalMulai: "2023-03-31",
        tanggalAkhir: "2023-03-01", // End before start
      };

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/akuntansi/periode",
        periodData,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("End date must be after start date");
    });

    it("should reject overlapping active periods", async () => {
      const periodData = {
        nama: "Overlap",
        tanggalMulai: "2023-03-01",
        tanggalAkhir: "2023-03-31",
        isActive: true,
      };

      (prisma.periodeAkuntansi.findFirst as jest.Mock).mockResolvedValue({
        id: "existing",
      }); // Overlap found

      const req = new MockNextRequest(
        "POST",
        "http://localhost:3000/api/akuntansi/periode",
        periodData,
      );

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot create overlapping active periods");
    });
  });
});
