import { NextResponse, type NextRequest } from "next/server";
import { CiAuthError, ingestCiResults } from "@/lib/factory/ci";
import { createRateLimiter } from "@/lib/http/rateLimit";

/**
 * POST /api/ci/evidence: a project's CI posts test results as Evidence.
 * See src/lib/factory/ci.ts for the payload. Server-to-server only (no CORS).
 */
const allow = createRateLimiter({ limit: 60, windowMs: 60 * 60 * 1000 });
const MAX_BODY_BYTES = 256 * 1024;

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const token = /^Bearer\s+(\S+)$/i.exec(auth)?.[1];
  const key = token ? token.slice(0, 12) : request.headers.get("x-forwarded-for") ?? "anon";
  const gate = allow(key);
  if (!gate.ok) return NextResponse.json({ error: "Rate limited." }, { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } });

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }
  try {
    const result = await ingestCiResults(token, payload as Record<string, unknown>);
    return NextResponse.json(result, { status: result.recorded ? 201 : 200 });
  } catch (err) {
    if (err instanceof CiAuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid payload." }, { status: 422 });
  }
}
