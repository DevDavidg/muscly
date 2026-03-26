import "server-only";
import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type VoteValue = 1 | -1;

interface VoteRow {
  track_id: string;
  voter_ip_hash: string;
  vote: VoteValue;
}

export interface VoteSummaryByTrack {
  likes: number;
  dislikes: number;
  score: number;
  userVote: VoteValue | 0;
}

const defaultProjectId = "dimacrvowvpsbdjpujoa";

type SupabaseAvailability =
  | { ok: true; client: SupabaseClient }
  | { ok: false; reason: "missing_service_role_key" };

function getSupabaseClient(): SupabaseAvailability {
  const projectId = process.env.SUPABASE_PROJECT_ID ?? defaultProjectId;
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? `https://${projectId}.supabase.co`;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { ok: false, reason: "missing_service_role_key" };
  return {
    ok: true,
    client: createClient(url, serviceKey, { auth: { persistSession: false } }),
  };
}

export function getIpHash(rawIp: string): string {
  const salt = process.env.VOTE_IP_HASH_SALT ?? "muscly-votes-v1";
  return crypto.createHash("sha256").update(`${salt}:${rawIp}`).digest("hex");
}

export function getRequestIp(headers: Headers): string {
  const values = [
    headers.get("x-forwarded-for"),
    headers.get("x-real-ip"),
    headers.get("cf-connecting-ip"),
  ];
  for (const value of values) {
    if (!value) continue;
    const ip = value.split(",")[0]?.trim();
    if (ip) return ip;
  }
  return "0.0.0.0";
}

export async function upsertVote(params: {
  trackId: string;
  ipHash: string;
  vote: VoteValue;
}): Promise<
  | { ok: true; userVote: VoteValue | 0 }
  | {
      ok: false;
      reason:
        | "missing_service_role_key"
        | "supabase_error";
      details?: string;
    }
> {
  const supabase = getSupabaseClient();
  if (!supabase.ok) return { ok: false, reason: "missing_service_role_key" };
  const { data: existing, error: existingError } = await supabase.client
    .from("track_votes")
    .select("vote")
    .eq("track_id", params.trackId)
    .eq("voter_ip_hash", params.ipHash)
    .maybeSingle<{ vote: VoteValue }>();

  if (existingError) {
    return { ok: false, reason: "supabase_error", details: existingError.message };
  }

  if (existing) {
    const { error: deleteError } = await supabase.client
      .from("track_votes")
      .delete()
      .eq("track_id", params.trackId)
      .eq("voter_ip_hash", params.ipHash);
    if (deleteError) {
      return { ok: false, reason: "supabase_error", details: deleteError.message };
    }
    return { ok: true, userVote: 0 };
  }

  const { error } = await supabase.client.from("track_votes").insert(
    {
      track_id: params.trackId,
      voter_ip_hash: params.ipHash,
      vote: params.vote,
    }
  );
  if (error) return { ok: false, reason: "supabase_error", details: error.message };
  return { ok: true, userVote: params.vote };
}

export async function getVoteSummary(trackIds: string[], ipHash: string) {
  const supabase = getSupabaseClient();
  const map = new Map<string, VoteSummaryByTrack>();
  for (const id of trackIds) {
    map.set(id, { likes: 0, dislikes: 0, score: 0, userVote: 0 });
  }
  if (!supabase.ok || trackIds.length === 0) return map;

  const { data, error } = await supabase.client
    .from("track_votes")
    .select("track_id,voter_ip_hash,vote")
    .in("track_id", trackIds);
  if (error || !data) return map;

  for (const row of data as VoteRow[]) {
    const item = map.get(row.track_id);
    if (!item) continue;
    if (row.vote === 1) item.likes += 1;
    if (row.vote === -1) item.dislikes += 1;
    item.score = item.likes - item.dislikes;
    if (row.voter_ip_hash === ipHash) item.userVote = row.vote;
  }
  return map;
}

export async function getGlobalScores(trackIds: string[]) {
  const empty = new Map<string, number>();
  for (const id of trackIds) empty.set(id, 0);
  const supabase = getSupabaseClient();
  if (!supabase.ok || trackIds.length === 0) return empty;

  const { data, error } = await supabase.client
    .from("track_votes")
    .select("track_id,vote")
    .in("track_id", trackIds);
  if (error || !data) return empty;

  for (const row of data as Array<{ track_id: string; vote: VoteValue }>) {
    const current = empty.get(row.track_id) ?? 0;
    empty.set(row.track_id, current + row.vote);
  }
  return empty;
}
