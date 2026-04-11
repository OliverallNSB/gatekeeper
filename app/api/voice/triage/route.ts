export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
  const to = (form.get("To") ?? "").toString();

  console.log("TRIAGE", { callSid, from, speech, confidence, digits });

  // Save to Supabase
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const urgent = isUrgent(speech);

    const { error } = await supabase.from("call_sessions").insert({
      call_sid: callSid,
      from_number: from,
      to_number: to,
      caller_reason: speech || (digits ? `[DTMF ${digits}]` : "[no speech captured]"),
      status: "completed",
      decision: urgent ? "transferred" : "voicemail",
    });

    if (error) {
      console.error("SUPABASE_INSERT_ERROR", error);
    } else {
      console.log("CALL_SAVED_TO_SUPABASE");
    }
  } catch (err: any) {
    console.error("SUPABASE_ERROR", err?.message ?? err);
  }

  // SMS owner (best effort)
  try {
    console.log("SENDING_SMS_TO", process.env.OWNER_MOBILE_NUMBER);
    await sendOwnerSms({
      from,
      callSid,
      speech: speech || (digits ? `[DTMF ${digits}]` : "[no speech captured]"),
      confidence,
    });
    console.log("SMS_SENT_SUCCESS");
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
        "Basic " + Buffer.from(`${accountSid}:${authToken}` ).toString("base64"),
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
