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
    After the beep, please briefly say why you are calling.
  </Say>

  <Pause length="1"/>
  <Play>https://api.twilio.com/cowbell.mp3</Play>

  <Gather
    input="speech"
    action="${baseUrl}/api/voice/triage"
    method="POST"
    speechTimeout="auto"
    timeout="6"
  >
    <Say voice="alice">Go ahead.</Say>
  </Gather>

  <Say voice="alice">
    I did not hear anything. Please call again. Goodbye.
  </Say>
</Response>`;

  return xml(twiml);
}
