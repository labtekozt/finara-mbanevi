import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Simple in-memory rate limiter for VPS (Single Instance)
const rateLimitMap = new Map();

export default withAuth(
  function middleware(req) {
    // Rate Limiting Logic (In-Memory)
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const limit = 100; // Max requests
    const windowMs = 60 * 1000; // 1 minute

    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, {
        count: 0,
        lastReset: Date.now(),
      });
    }

    const ipData = rateLimitMap.get(ip);

    if (Date.now() - ipData.lastReset > windowMs) {
      ipData.count = 0;
      ipData.lastReset = Date.now();
    }

    if (ipData.count >= limit) {
      return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
    }

    ipData.count += 1;

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/kasir/:path*",
    "/inventaris/:path*",
    "/transaksi/:path*",
  ],
};
