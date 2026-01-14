export const runtime = "nodejs";

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

  // SMS owner (best effort)
  try {
    await sendOwnerSms({
      from,
      callSid,
      speech: speech || (digits ? `[DTMF ${digits}]` : "[no speech captured]"),
      confidence,
    });
  } catch (err: any) {
    console.error("SMS_FAILED", err?.message ?? err);
  }

  const owner = process.env.OWNER_MOBILE_NUMBER || "";
  const urgent = isUrgent(speech);

  // If urgent, forward call to you
  if (urgent && owner) {
    return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">One moment. Connecting you now.</Say>
  <Dial>${escapeXml(owner)}</Dial>
</Response>`);
  }

  // Otherwise, end politely
  const msg =
    speech
      ? `Thank you. I will notify the owner. Goodbye.`
      : `Thanks. I will notify the owner. Goodbye.`;

  return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${msg}</Say>
</Response>`);
}

function isUrgent(text: string) {
  const t = (text || "").toLowerCase();
  return (
    t.includes("urgent") ||
    t.includes("emergency") ||
    t.includes("asap") ||
    t.includes("right away") ||
    t.includes("immediately")
  );
}

async function sendOwnerSms(payload: {
  from: string;
  callSid: string;
  speech: string;
  confidence: string;
}) {

  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const fromNumber = process.env.TWILIO_FROM_NUMBER!;
  const toNumber = process.env.OWNER_MOBILE_NUMBER!;

  if (!accountSid || !authToken || !fromNumber || !toNumber) {
    throw new Error("Missing Twilio env vars (SID/TOKEN/FROM/TO).");
  }

  const body =
    `Gatekeeper alert\n` +
    `From: ${payload.from || "unknown"}\n` +
    `Msg: ${payload.speech.slice(0, 80)}`;


  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: fromNumber,
      To: toNumber,
      Body: body,
    }).toString(),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Twilio SMS error ${res.status}: ${text}`);
}

function escapeXml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
