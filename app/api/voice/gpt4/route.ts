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
    Hello. This is Gatekeeper, your AI receptionist.
    Please tell me why you are calling today.
  </Say>
  <Gather
    input="speech"
    action="${baseUrl}/api/voice/gpt4/process"
    method="POST"
    speechTimeout="auto"
    timeout="12"
    actionOnEmptyResult="true"
  >
    <Say voice="alice">Go ahead.</Say>
  </Gather>
  <Say voice="alice">Goodbye.</Say>
</Response>`;
}

export async function POST(req: Request) {
  const baseUrl = process.env.NGROK_URL || new URL(req.url).origin;
  console.log("GPT4_VOICE_ENDPOINT", { baseUrl });
  return xml(buildTwiml(baseUrl));
}

export async function GET(req: Request) {
  const baseUrl = process.env.NGROK_URL || new URL(req.url).origin;
  return xml(buildTwiml(baseUrl));
}
