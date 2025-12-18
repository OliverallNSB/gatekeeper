import { NextResponse } from "next/server";

function xml(twiml: string) {
  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(req: Request) {
  const baseUrl = new URL(req.url).origin;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">
    Hello. This call is screened by Gatekeeper.
    Please briefly tell me why you are calling after the tone.
  </Say>

  <Pause length="1"/>

  <Gather
    input="speech"
    speechTimeout="auto"
    timeout="6"
    action="${baseUrl}/api/voice/triage"
    method="POST"
  >
    <Say voice="alice">Go ahead.</Say>
  </Gather>

  <Say voice="alice">I did not hear anything. Goodbye.</Say>
</Response>`;

  return xml(twiml);
}
