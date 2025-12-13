import { GET } from "@/app/api/piutang/route";
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
    piutang: {
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

describe("Piutang API", () => {
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

  describe("GET /api/piutang", () => {
    it("should list piutang", async () => {
      const mockPiutang = [
        {
          id: "ptg-1",
          nomorPiutang: "PTG-001",
          totalPiutang: 1000000,
          sisaPiutang: 500000,
        },
      ];

      (prisma.piutang.findMany as jest.Mock).mockResolvedValue(mockPiutang);

      const req = new MockNextRequest(
        "GET",
        "http://localhost:3000/api/piutang",
      );

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockPiutang);
      expect(prisma.piutang.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { tanggalPiutang: "desc" },
          include: expect.anything(),
        }),
      );
    });
  });
});
