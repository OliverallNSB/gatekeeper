export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { escapeXml } from "@/lib/phone";
import { isUrgent } from "@/lib/urgency";
import { resolveOwner } from "@/lib/resolve-owner";
import { extractCallerName } from "@/lib/extract-name";
import { classifyCall } from "@/lib/classify-call";
import { shouldNotifySms } from "@/lib/sms-policy";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function buildSystemPrompt(businessName?: string | null, assistantName?: string | null): string {
  const name = assistantName || "Sarah";
  const identity = businessName
    ? `You are ${name}, the front desk receptionist for ${businessName}.`
    : `You are ${name}, a professional front desk receptionist answering phone calls for a small business.`;

  return `${identity}

RULES:
- Your name is ${name}. Never use a different name. Never change your name.
- Never identify yourself as AI, a bot, a virtual assistant, or an automated system
- Never mention "Gatekeeper", "call screening", or how the system works
- Speak naturally, as if you are a real person at the front desk
- Keep your response to 1-2 sentences maximum
- Be warm, confident, and professional
- Do not ask follow-up questions
- Do not offer additional help beyond acknowledging the caller

Determine the caller's INTENT — what they are trying to accomplish:
- emergency: urgent situation requiring immediate attention (leak, fire, flood, accident, safety issue)
- new_customer: interested in services, pricing, estimates, becoming a client, or inquiring about availability
- existing_customer: following up on existing work, projects, invoices, or previous interactions
- appointment: scheduling, rescheduling, or canceling an appointment
- vendor_sales: selling products, marketing services, or proposing partnerships
- spam: robocalls, scams, or irrelevant solicitations
- general: anything that does not clearly fit the above

IF EMERGENCY: Acknowledge their urgency briefly and let them know you will connect them immediately.
IF NOT EMERGENCY: Thank them for the information and let them know the message will be passed along promptly.

If the caller provided their name, use it naturally in your response.

Respond in JSON format: {"message": "your spoken response", "caller_name": "first name or null", "intent": "category", "confidence": 85}
Extract the caller's first name if they provided one. If no name was given, set caller_name to null.
Set confidence as a number 0-100 for how certain you are of the intent classification.`;
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
    let urgent = isUrgent(speech);
    console.log("URGENCY_CHECK_FALLBACK", { urgent, speech });

    // Get AI response from GPT-4
    const defaultResponse = "Thank you for calling. I'll make sure your message gets passed along right away.";
    let aiResponse = defaultResponse;
    let callerName: string | null = extractCallerName(speech);
    let callCategory: string = classifyCall(speech);

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(owner?.business_name, owner?.assistant_name),
          },
          {
            role: "user",
            content: `The caller said: "${speech}". Determine their intent and respond appropriately. Respond in JSON: {"message": "...", "caller_name": "...", "intent": "...", "confidence": 0-100}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      const raw = completion.choices[0].message.content || "";
      let confidence: number | null = null;
      try {
        const parsed = JSON.parse(raw);
        aiResponse = parsed.message || defaultResponse;
        confidence = parsed.confidence ?? null;
        if (parsed.caller_name && parsed.caller_name !== "null") {
          callerName = parsed.caller_name;
        }
        if (parsed.intent && parsed.intent !== "null") {
          callCategory = parsed.intent;
          urgent = callCategory === "emergency";
        }
      } catch {
        aiResponse = raw || defaultResponse;
      }
      console.log("GPT4_RESPONSE", { aiResponse, callerName, callCategory, confidence });
    } catch (gptError) {
      console.error("GPT4_ERROR", gptError);
      aiResponse = urgent
        ? "I understand, let me connect you right away."
        : defaultResponse;
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
            caller_name: callerName,
            call_category: callCategory,
            status: "completed",
            decision: urgent ? "transferred" : (callCategory === "new_customer" ? "lead_intake" : "voicemail"),
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

    // Send SMS notification (only if enabled and intent warrants it)
    if (smsEnabled && shouldNotifySms(callCategory)) {
      try {
        const smsFrom = callerName ? `${callerName} (${from})` : from;
        const categoryLabel = callCategory.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        await sendSMS({
          to: ownerPhone,
          body: `New call from ${smsFrom}\nCategory: ${categoryLabel}\nReason: ${speech.slice(0, 70)}\nDecision: ${urgent ? "Transferred" : "Message taken"}`,
        });
      } catch (smsError) {
        console.error("SMS_ERROR", smsError);
      }
    }

    // Build response TwiML
    let afterSay: string;

    if (urgent) {
      afterSay = `<Dial>${escapeXml(ownerPhone.trim())}</Dial>
  <Say voice="Polly.Amy">Thank you for calling. Have a great day.</Say>
  <Hangup/>`;
    } else if (callCategory === "new_customer") {
      const leadParams = new URLSearchParams({
        step: "0",
        name: callerName || "",
        uid: userId || "",
        aname: owner?.assistant_name || "Sarah",
        bname: owner?.business_name || "",
        callSid,
        from,
        to,
        speech0: speech,
      }).toString();
      const leadUrl = escapeXml(`${baseUrl}/api/voice/lead?${leadParams}`);
      afterSay = `<Redirect method="POST">${leadUrl}</Redirect>`;
    } else {
      afterSay = `<Record maxLength="60" finishOnKey="#" action="${baseUrl}/api/voice/hangup" />`;
    }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy">${escapeXml(aiResponse)}</Say>
  ${afterSay}
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
  <Say voice="Polly.Amy">I'm sorry, we're experiencing a brief technical issue. Please try your call again in a few minutes.</Say>
  <Record />
</Response>`;

    return new NextResponse(fallbackTwiml, {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
}
