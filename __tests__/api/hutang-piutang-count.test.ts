import { GET } from "@/app/api/hutang-piutang/count/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  prisma: {
    hutang: {
      count: jest.fn(),
    },
    piutang: {
      count: jest.fn(),
    },
  },
}));

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

// Mock Request
class MockNextRequest {
  url: string;
  constructor(url: string) {
    this.url = url;
  }
}

describe("API Hutang Piutang Count", () => {
  const mockSession = {
    user: {
      id: "user-1",
      role: "ADMIN",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  it("should return 401 if not authenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const req = new MockNextRequest("http://localhost:3000/api/hutang-piutang/count");
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it("should return counts", async () => {
    (prisma.hutang.count as jest.Mock).mockResolvedValue(5);
    (prisma.piutang.count as jest.Mock).mockResolvedValue(3);

    const req = new MockNextRequest("http://localhost:3000/api/hutang-piutang/count");
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.hutangCount).toBe(5);
    expect(data.piutangCount).toBe(3);
    expect(data.total).toBe(8);
  });
});
