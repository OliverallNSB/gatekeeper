export const runtime = "nodejs";

import { NextResponse } from "next/server";

function xml(twiml: string) {
  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function buildTwiml(baseUrl: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">
    Hello. This call is screened by Gatekeeper.
    Please say why you are calling.
  </Say>

  <Gather
    input="speech dtmf"
    action="${baseUrl}/api/voice/triage"
    method="POST"
    speechTimeout="auto"
    timeout="12"
    numDigits="1"
    actionOnEmptyResult="true"
  >
    <Say voice="alice">Go ahead.</Say>
  </Gather>

  <Say voice="alice">Goodbye.</Say>
</Response>`;
}

export async function POST(req: Request) {
  const baseUrl = new URL(req.url).origin;
  return xml(buildTwiml(baseUrl));
}

export async function GET(req: Request) {
  const baseUrl = new URL(req.url).origin;
  return xml(buildTwiml(baseUrl));
}
