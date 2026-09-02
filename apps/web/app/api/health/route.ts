import { NextResponse } from "next/server";

import { apiConfig } from "@/lib/api/config";

export async function GET() {
  const response = await fetch(`${apiConfig.baseUrl}/health`, {
    cache: "no-store",
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
