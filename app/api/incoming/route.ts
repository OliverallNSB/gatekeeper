import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Twilio status callbacks / misc webhooks can hit here later.
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
