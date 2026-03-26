import { NextRequest, NextResponse } from "next/server";
import {
  getIpHash,
  getRequestIp,
  getVoteSummary,
  upsertVote,
} from "@/lib/votes";

interface VoteBody {
  trackId?: string;
  vote?: number;
}

export async function GET(request: NextRequest) {
  const trackIds = request.nextUrl.searchParams.getAll("trackId");
  const ipHash = getIpHash(getRequestIp(request.headers));
  const summary = await getVoteSummary(trackIds, ipHash);
  return NextResponse.json(Object.fromEntries(summary.entries()));
}

export async function POST(request: NextRequest) {
  let body: VoteBody;
  try {
    body = (await request.json()) as VoteBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!body.trackId || (body.vote !== 1 && body.vote !== -1)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ipHash = getIpHash(getRequestIp(request.headers));
  const result = await upsertVote({
    trackId: body.trackId,
    ipHash,
    vote: body.vote,
  });
  if (!result.ok) {
    const status = result.reason === "missing_service_role_key" ? 503 : 500;
    return NextResponse.json(
      { ok: false, reason: result.reason, details: result.details ?? null },
      { status }
    );
  }
  return NextResponse.json({ ok: true });
}
