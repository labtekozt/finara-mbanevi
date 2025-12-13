import { GET } from "@/app/api/hutang/route";
import { prisma } from "@/lib/prisma";

// Mock dependencies
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth-options", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    hutang: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock NextRequest
class MockNextRequest {
  method: string;
  url: string;

  constructor(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
}

describe("Hutang API", () => {
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
  });

  describe("GET /api/hutang", () => {
    it("should list hutang", async () => {
      const mockHutang = [
        {
          id: "htg-1",
          nomorHutang: "HTG-001",
          totalHutang: 1000000,
          sisaHutang: 500000,
        },
      ];

      (prisma.hutang.findMany as jest.Mock).mockResolvedValue(mockHutang);

      const req = new MockNextRequest("GET", "http://localhost:3000/api/hutang");

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockHutang);
      expect(prisma.hutang.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { tanggalHutang: "desc" },
          include: expect.anything(),
        }),
      );
    });
  });
});
