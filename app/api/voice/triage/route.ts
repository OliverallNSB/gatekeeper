import { NextResponse } from "next/server";

function xml(twiml: string) {
  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(req: Request) {
  const form = await req.formData();

  const speech = (form.get("SpeechResult") ?? "").toString().trim();
  const confidence = (form.get("Confidence") ?? "").toString().trim();
  const digits = (form.get("Digits") ?? "").toString().trim();

  const from = (form.get("From") ?? "").toString();
  const callSid = (form.get("CallSid") ?? "").toString();

  console.log("TRIAGE", { callSid, from, speech, confidence, digits });

  let msg = "";

  if (digits === "1") {
    msg = "Okay. You chose to skip speaking. Goodbye.";
  } else if (!speech) {
    msg = "Sorry, I did not catch your message. Please try again. Goodbye.";
  } else {
    msg = `Thank you. I heard: ${escapeXml(speech)}. Goodbye.`;
  }

  return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${msg}</Say>
</Response>`);
}

function escapeXml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
