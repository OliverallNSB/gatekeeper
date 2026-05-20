import { NextResponse } from "next/server";

export async function POST() {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="/api/voice/triage" method="POST" timeout="6" speechTimeout="auto">
    <Say voice="alice">Gatekeeper is live. Please say the reason for your call.</Say>
  </Gather>
  <Say voice="alice">I did not hear anything. Goodbye.</Say>
</Response>`;

  return new NextResponse(twiml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml",
    },
  });
}

export async function GET() {
  return new NextResponse("Gatekeeper incoming voice webhook is live.", {
    status: 200,
  });
}