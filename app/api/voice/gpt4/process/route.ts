export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { escapeXml } from "@/lib/phone";
import { isUrgent } from "@/lib/urgency";
import { resolveOwner } from "@/lib/resolve-owner";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SYSTEM_PROMPT = `You are a professional receptionist for Gatekeeper, an AI call screening service.

Your role is to:
1. Greet callers warmly and professionally
2. Acknowledge what they said
3. Determine if their call is URGENT
4. Respond appropriately

URGENCY KEYWORDS (if caller mentions ANY of these, it's URGENT):
- emergency, urgent, asap, critical, dying, accident, help, immediate, crisis, emergency

RESPONSE GUIDELINES:
- If URGENT: Say "I'll connect you right away" (keep it brief)
- If NOT URGENT: Say "Thank you for calling. Your message will be recorded" (keep it brief)

IMPORTANT:
- Keep your response under 20 seconds
- Be professional but friendly
- Never be dismissive
- Always be helpful

Respond with ONLY the message you would say to the caller. Nothing else.`;


async function sendSMS(options: { to: string; body: string }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const fromNumber = process.env.TWILIO_FROM_NUMBER!;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${accountSid}:${authToken}` ).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: fromNumber,
      To: options.to,
      Body: options.body,
    }).toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("SMS_ERROR", { status: response.status, text });
    throw new Error(`SMS send failed: ${response.status}`);
  }

  console.log("SMS_SENT_SUCCESS", { to: options.to });
}

export async function POST(req: Request) {
  const form = await req.formData();

  const speech = (form.get("SpeechResult") ?? "").toString().trim();
  const callSid = (form.get("CallSid") ?? "").toString();
  const from = (form.get("From") ?? "").toString();
  const to = (form.get("To") ?? "").toString();

  const baseUrl = process.env.NGROK_URL || new URL(req.url).origin;

  console.log("GPT4_TRIAGE", { callSid, from, speech });

  const owner = await resolveOwner(supabase, to);
  const userId = owner?.user_id ?? null;
  const ownerPhone = owner?.owner_phone_number || process.env.OWNER_MOBILE_NUMBER!;
  const smsEnabled = owner?.sms_notifications_enabled ?? true;

  try {
    // Determine urgency
    const urgent = isUrgent(speech);
    console.log("URGENCY_CHECK", { urgent, speech });

    // Get AI response from GPT-4
    let aiResponse = "Thank you for calling. I'll make sure your message gets passed along right away.";

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `Caller said: "${speech}". Is this urgent? ${
              urgent
                ? "YES - This is urgent. Respond with urgency."
                : "NO - This is not urgent. Respond professionally."
            }. Give a brief response (under 20 seconds of speech).`,
          },
        ],
        max_tokens: 100,
        temperature: 0.7,
      });

      aiResponse =
        completion.choices[0].message.content || aiResponse;
      console.log("GPT4_RESPONSE", { aiResponse });
    } catch (gptError) {
      console.error("GPT4_ERROR", gptError);
      // Fallback to default response if GPT-4 fails
      aiResponse = urgent
        ? "I understand, let me connect you right away."
        : "Thank you for calling. I'll make sure your message gets passed along right away.";
    }

    // Save to Supabase
    try {
      const { error: dbError } = await supabase
        .from("call_sessions")
        .insert([
          {
            call_sid: callSid,
            from_number: from,
            to_number: to,
            caller_reason: speech,
            status: "completed",
            decision: urgent ? "transferred" : "voicemail",
            created_at: new Date().toISOString(),
            user_id: userId,
          },
        ]);

      if (dbError) {
        console.error("DB_ERROR", dbError);
      } else {
        console.log("CALL_SAVED_TO_SUPABASE");
      }
    } catch (dbError) {
      console.error("SUPABASE_ERROR", dbError);
    }

    // Send SMS notification (only if enabled)
    if (smsEnabled) {
      try {
        await sendSMS({
          to: ownerPhone,
          body: `Gatekeeper alert\nFrom: ${from}\nMsg: ${speech.slice(0, 80)}`,
        });
      } catch (smsError) {
        console.error("SMS_ERROR", smsError);
      }
    }

    // Build response TwiML
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${escapeXml(aiResponse)}</Say>
  ${
    urgent
      ? `<Dial>${escapeXml(ownerPhone.trim())}</Dial>
  <Say voice="alice">Thank you for calling. Have a great day.</Say>
  <Hangup/>`
      : `<Record maxLength="60" finishOnKey="#" action="${baseUrl}/api/voice/hangup" />`
  }
</Response>`;



    console.log("TRIAGE_RESPONSE", { urgent, decision: urgent ? "transfer" : "voicemail" });

    return new NextResponse(twiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error) {
    console.error("TRIAGE_ERROR", error);

    // Return fallback TwiML
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I'm sorry, we're experiencing a brief technical issue. Please try your call again in a few minutes.</Say>
  <Record />
</Response>`;

    return new NextResponse(fallbackTwiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
