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

// Future direction: greetings will include assistant_name from user_settings.
// Preset names: Sarah (default), Emma, Jennifer, Michael, David. Custom name option later.
// Example: "Good morning. Thank you for calling [Business Name]. This is [Assistant Name].
//           May I ask who's calling and what this is regarding?"
function buildSystemPrompt(businessName?: string | null): string {
  const identity = businessName
    ? `You are the front desk receptionist for ${businessName}.`
    : `You are a professional front desk receptionist answering phone calls for a small business.`;

  return `${identity}

RULES:
- Never identify yourself as AI, a bot, a virtual assistant, or an automated system
- Never mention "Gatekeeper", "call screening", or how the system works
- Speak naturally, as if you are a real person at the front desk
- Keep your response to 1-2 sentences maximum
- Be warm, confident, and professional
- Do not ask follow-up questions
- Do not offer additional help beyond acknowledging the caller

IF THE CALL IS URGENT:
Acknowledge their urgency briefly and let them know you will connect them immediately.

IF THE CALL IS NOT URGENT:
Thank them for the information and let them know the message will be passed along promptly.

Respond with ONLY the spoken message. No labels, no formatting, no explanation.`;
}


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
            content: buildSystemPrompt(owner?.business_name),
          },
          {
            role: "user",
            content: `The caller said: "${speech}". ${
              urgent
                ? "This is urgent. Let them know you'll connect them immediately."
                : "This is not urgent. Acknowledge their message professionally."
            } Respond in 1-2 sentences.`,
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
  <Say voice="Polly.Joanna">${escapeXml(aiResponse)}</Say>
  ${
    urgent
      ? `<Dial>${escapeXml(ownerPhone.trim())}</Dial>
  <Say voice="Polly.Joanna">Thank you for calling. Have a great day.</Say>
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
  <Say voice="Polly.Joanna">I'm sorry, we're experiencing a brief technical issue. Please try your call again in a few minutes.</Say>
  <Record />
</Response>`;

    return new NextResponse(fallbackTwiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
