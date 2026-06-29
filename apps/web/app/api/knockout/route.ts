import { NextResponse } from "next/server";
import { apiConfig } from "@/lib/api/config";

export async function GET() {
  let response: Response;
  try {
    response = await fetch(`${apiConfig.baseUrl}/knockout`, { cache: "no-store" });
  } catch {
    return NextResponse.json({ detail: "Knockout service unavailable." }, { status: 503 });
  }
  const payload = await response.json();
  if (response.status >= 500) {
    return NextResponse.json({ detail: "Internal server error." }, { status: response.status });
  }
  return NextResponse.json(payload, { status: response.status });
}
