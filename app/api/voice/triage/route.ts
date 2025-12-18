import { NextResponse } from "next/server";

function twiml(msg: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${msg}</Say>
</Response>`;
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function GET() {
  return twiml("Gatekeeper GET fingerprint one two three.");
}

export async function POST() {
  return twiml("Gatekeeper POST fingerprint one two three.");
}
