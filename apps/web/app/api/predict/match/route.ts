import { NextResponse } from "next/server";

import { apiConfig } from "@/lib/api/config";

const MAX_BODY_BYTES = 8_192; // 8 KB is more than enough for two team IDs + flags

export async function POST(request: Request) {
  const body = await request.text();

  if (body.length > MAX_BODY_BYTES) {
    return NextResponse.json({ detail: "Request payload too large." }, { status: 413 });
  }

  let response: Response;
  try {
    response = await fetch(`${apiConfig.baseUrl}/predict/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ detail: "Prediction service unavailable." }, { status: 503 });
  }

  const payload = await response.json();

  // Strip raw backend detail from 5xx responses — expose a generic message instead.
  if (response.status >= 500) {
    return NextResponse.json({ detail: "Internal server error." }, { status: response.status });
  }

  return NextResponse.json(payload, { status: response.status });
}
