import { NextResponse } from "next/server";
import { apiConfig } from "@/lib/api/config";

const MAX_BODY_BYTES = 256;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let response: Response;
  try {
    response = await fetch(
      `${apiConfig.baseUrl}/matches/${encodeURIComponent(id)}`,
      { cache: "no-store" }
    );
  } catch {
    return NextResponse.json({ detail: "Match service unavailable." }, { status: 503 });
  }
  const payload = await response.json();
  if (response.status >= 500) {
    return NextResponse.json({ detail: "Internal server error." }, { status: response.status });
  }
  return NextResponse.json(payload, { status: response.status });
}
