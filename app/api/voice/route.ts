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
    Please say why you are calling.
    Or press 1 to skip speaking.
  </Say>

  <Gather
    input="speech dtmf"
    action="${baseUrl}/api/voice/triage"
    method="POST"
    speechTimeout="auto"
    timeout="12"
    numDigits="1"
    actionOnEmptyResult="true"
    language="en-US"
  >
    <Say voice="alice">Go ahead now.</Say>
  </Gather>

  <Say voice="alice">I did not receive anything. Goodbye.</Say>
</Response>`;

  return xml(twiml);
}
