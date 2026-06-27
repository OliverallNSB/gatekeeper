export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { escapeXml } from "@/lib/phone";
import { isUrgent } from "@/lib/urgency";
import { resolveOwner } from "@/lib/resolve-owner";

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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const owner = await resolveOwner(supabase, to);
  const userId = owner?.user_id ?? null;
  const ownerPhone = owner?.owner_phone_number || process.env.OWNER_MOBILE_NUMBER!;
  const smsEnabled = owner?.sms_notifications_enabled ?? true;

  // Save to Supabase
  try {
    const urgent = isUrgent(speech);

    const { error } = await supabase.from("call_sessions").insert({
      call_sid: callSid,
      from_number: from,
      to_number: to,
      caller_reason: speech || (digits ? `[DTMF ${digits}]` : "[no speech captured]"),
      status: "completed",
      decision: urgent ? "transferred" : "voicemail",
      user_id: userId,
    });

    if (error) {
      console.error("SUPABASE_INSERT_ERROR", error);
    } else {
      console.log("CALL_SAVED_TO_SUPABASE");
    }
  } catch (err: any) {
    console.error("SUPABASE_ERROR", err?.message ?? err);
  }

  // SMS owner (best effort, only if enabled)
  if (smsEnabled) {
    try {
      console.log("SENDING_SMS_TO", ownerPhone);
      await sendOwnerSms({
        from,
        callSid,
        speech: speech || (digits ? `[DTMF ${digits}]` : "[no speech captured]"),
        confidence,
        to: ownerPhone,
      });
      console.log("SMS_SENT_SUCCESS");
    } catch (err: any) {
      console.error("SMS_FAILED", err?.message ?? err);
    }
  }

  const transferTo = ownerPhone;
  const urgent = isUrgent(speech);

  // If urgent, forward call to you
  if (urgent && transferTo) {
    return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I understand, let me connect you right away.</Say>
  <Dial>${escapeXml(transferTo.trim())}</Dial>
  <Say voice="Polly.Joanna">Thank you for calling. Have a great day.</Say>
  <Hangup/>
</Response>`);
  }

  // Otherwise, end politely
  const msg = `Thank you for letting me know. I'll make sure they get your message right away. Have a good day.`;

  return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${msg}</Say>
  <Hangup/>
</Response>`);
}


async function sendOwnerSms(payload: {
  from: string;
  callSid: string;
  speech: string;
  confidence: string;
  to: string;
}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const fromNumber = process.env.TWILIO_FROM_NUMBER!;
  const toNumber = payload.to;

  if (!accountSid || !authToken || !fromNumber || !toNumber) {
    throw new Error("Missing Twilio env vars or owner phone number.");
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

