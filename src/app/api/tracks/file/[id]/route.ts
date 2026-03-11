import { Pool, neonConfig } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  const { id } = await context.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const pool = new Pool({ connectionString });
  try {
    const r = await pool.query(
      "SELECT data, mime_type FROM bucket WHERE id = $1",
      [id]
    );
    if (r.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const row = r.rows[0];
    const data = row.data as Buffer;
    const mime = (row.mime_type as string) ?? "application/octet-stream";
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": 'attachment; filename="audio.wav"',
        "Cache-Control": "public, max-age=3600",
      },
    });
  } finally {
    await pool.end();
  }
}
