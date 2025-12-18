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

  // Send SMS summary to you (best-effort; call flow should still work if SMS fails)
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

  let msg = "";
  if (digits === "1") {
    msg = "Okay. I will notify the owner. Goodbye.";
  } else if (!speech) {
    msg = "Sorry, I did not catch that. I will notify the owner. Goodbye.";
  } else {
    msg = `Thank you. I heard: ${escapeXml(speech)}. I will notify the owner. Goodbye.`;
  }

  return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${msg}</Say>
</Response>`);
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
    `Gatekeeper call screened\n` +
    `From: ${payload.from || "unknown"}\n` +
    `Reason: ${payload.speech}\n` +
    (payload.confidence ? `Confidence: ${payload.confidence}\n` : "") +
    `CallSid: ${payload.callSid}`;

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
  if (!res.ok) {
    throw new Error(`Twilio SMS error ${res.status}: ${text}`);
  }
}

function escapeXml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
