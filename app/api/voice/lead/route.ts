export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { escapeXml } from "@/lib/phone";
import { shouldNotifySms } from "@/lib/sms-policy";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_STEPS = 6;

const REQUIRED_FIELDS = ["name", "service", "address", "phone"] as const;
type FieldKey = (typeof REQUIRED_FIELDS)[number];

const TEMPLATE_QUESTIONS: Record<FieldKey, (name: string) => string> = {
  name:    ()     => "May I get your name?",
  service: (name) => name ? `Thank you, ${name}. What kind of service are you looking for?` : "What kind of service are you looking for?",
  address: ()     => "What is the property address or city?",
  phone:   ()     => "What is the best phone number for us to reach you?",
};

const SAME_NUMBER_PHRASES = ["same number", "same phone", "this number", "this one", "the one i'm calling from", "my cell"];

function xml(twiml: string) {
  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function buildGatherUrl(baseUrl: string, params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return `${baseUrl}/api/voice/lead?${qs}`;
}

interface ConversationResult {
  extracted: {
    caller_name?: string | null;
    service_needed?: string | null;
    property_address?: string | null;
    callback_phone?: string | null;
  };
  all_collected: boolean;
  message: string;
}

async function driveConversation(
  collected: Record<string, string>,
  speech: string,
  speech0: string | null,
  assistantName: string,
  businessName: string,
): Promise<ConversationResult | null> {
  try {
    const name = assistantName || "Sarah";
    const identity = businessName
      ? `You are ${name}, a professional front desk receptionist for ${businessName}.`
      : `You are ${name}, a professional front desk receptionist.`;

    const callerContext = speech0
      ? `The caller initially said: "${speech0}"${speech ? `\nThen they said: "${speech}"` : ""}`
      : `The caller said: "${speech}"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `${identity}

OBJECTIVE: Collect the following information to complete a service request:
1. caller_name — the caller's name
2. service_needed — what service they need
3. property_address — the property address or city
4. callback_phone — best phone number to reach them

CURRENTLY COLLECTED:
- Name: ${collected.name || "not yet provided"}
- Service: ${collected.service || "not yet provided"}
- Address: ${collected.address || "not yet provided"}
- Phone: ${collected.phone || "not yet provided"}

${callerContext}

INSTRUCTIONS:
- Extract any NEW information the caller provided
- Only set a field if the caller clearly stated that information
- If all four fields are now collected, set all_collected to true and write a warm closing
- If fields are still missing, ask ONE question about ONE missing field
- Never ask about information already collected
- Sound natural and professional
- Maximum one sentence
- Never mention AI, Gatekeeper, or call screening
- Use the caller's name naturally if known

Respond in JSON only:
{"extracted": {"caller_name": "name or null", "service_needed": "service or null", "property_address": "address or null", "callback_phone": "phone or null"}, "all_collected": false, "message": "your question or closing"}`,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const raw = completion.choices[0].message.content?.trim() || "";
    const parsed = JSON.parse(raw);
    return {
      extracted: parsed.extracted || {},
      all_collected: !!parsed.all_collected,
      message: parsed.message || "",
    };
  } catch (err) {
    console.error("LEAD_CONVERSATION_ERROR", err);
    return null;
  }
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const baseUrl = process.env.NGROK_URL || url.origin;
  const stepCount = parseInt(url.searchParams.get("step") || "0", 10);

  const form = await req.formData();
  const speech = (form.get("SpeechResult") ?? "").toString().trim();
  const callSid = (form.get("CallSid") ?? "").toString();
  const from = (form.get("From") ?? "").toString();
  const to = (form.get("To") ?? "").toString();

  const collected: Record<string, string> = {
    name:    url.searchParams.get("name") || "",
    service: url.searchParams.get("service") || "",
    address: url.searchParams.get("address") || "",
    phone:   url.searchParams.get("phone") || "",
  };
  const userId = url.searchParams.get("uid") || "";
  const assistantName = url.searchParams.get("aname") || "Sarah";
  const businessName = url.searchParams.get("bname") || "";
  const speech0 = stepCount === 0 ? (url.searchParams.get("speech0") || null) : null;

  if (speech && SAME_NUMBER_PHRASES.some((p) => speech.toLowerCase().includes(p))) {
    collected.phone = from;
  }

  console.log("LEAD_INTAKE", { stepCount, callSid, speech, speech0, collected });

  const result = await driveConversation(
    collected,
    speech,
    speech0,
    assistantName,
    businessName,
  );

  if (result?.extracted) {
    if (result.extracted.caller_name && !collected.name) {
      collected.name = result.extracted.caller_name;
    }
    if (result.extracted.service_needed && !collected.service) {
      collected.service = result.extracted.service_needed;
    }
    if (result.extracted.property_address && !collected.address) {
      collected.address = result.extracted.property_address;
    }
    if (result.extracted.callback_phone && !collected.phone) {
      collected.phone = result.extracted.callback_phone;
    }
  }

  // Fallback: if GPT failed, assign speech to the first missing field
  if (!result && speech) {
    const fallbackField = REQUIRED_FIELDS.find((f) => !collected[f]);
    if (fallbackField) {
      collected[fallbackField] = speech;
    }
  }

  const missing = REQUIRED_FIELDS.filter((f) => !collected[f]);
  const nextStep = stepCount + 1;
  const isDone = missing.length === 0 || nextStep > MAX_STEPS;

  if (isDone) {
    if (!collected.phone) collected.phone = from;

    try {
      await supabase.from("lead_intake").insert({
        call_session_id: url.searchParams.get("callSid") || callSid,
        user_id: userId || null,
        caller_name: collected.name || null,
        service_needed: collected.service || null,
        property_address: collected.address || null,
        callback_phone: collected.phone || null,
      });
      console.log("LEAD_SAVED", collected);
    } catch (err) {
      console.error("LEAD_SAVE_ERROR", err);
    }

    try {
      const ownerTo = url.searchParams.get("to") || to;
      const { data: settings } = await supabase
        .from("user_settings")
        .select("owner_phone_number, sms_notifications_enabled")
        .eq("twilio_phone_number", ownerTo)
        .single();

      if (settings?.sms_notifications_enabled && settings?.owner_phone_number && shouldNotifySms("new_customer")) {
        await sendSMS({
          to: settings.owner_phone_number,
          body: [
            `New Lead from ${collected.name || "Unknown"} (${from})`,
            `Service: ${collected.service || "Not specified"}`,
            `Address: ${collected.address || "Not specified"}`,
            `Callback: ${collected.phone || from}`,
            `Action: Call back soon`,
          ].join("\n"),
        });
      }
    } catch (err) {
      console.error("LEAD_SMS_ERROR", err);
    }

    const closing = (missing.length === 0 && result?.all_collected && result?.message)
      ? escapeXml(result.message)
      : collected.name
        ? `Perfect, ${escapeXml(collected.name)}. I'll make sure this gets to the owner so they can follow up with you as soon as possible. Thank you for calling.`
        : `Perfect. I'll make sure this gets to the owner so they can follow up with you as soon as possible. Thank you for calling.`;

    return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy">${closing}</Say>
  <Hangup/>
</Response>`);
  }

  let question: string;
  if (result?.message) {
    question = result.message;
  } else {
    const nextField = missing[0];
    question = TEMPLATE_QUESTIONS[nextField](collected.name || "");
  }

  const params: Record<string, string> = {
    step: String(nextStep),
    name: collected.name,
    service: collected.service,
    address: collected.address,
    phone: collected.phone,
    uid: userId,
    aname: assistantName,
    bname: businessName,
    callSid: url.searchParams.get("callSid") || callSid,
    from: url.searchParams.get("from") || from,
    to: url.searchParams.get("to") || to,
  };

  return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${escapeXml(buildGatherUrl(baseUrl, params))}" method="POST" timeout="8" speechTimeout="auto">
    <Say voice="Polly.Amy">${escapeXml(question)}</Say>
  </Gather>
  <Say voice="Polly.Amy">I didn't catch that. Let me take what we have so far. Thank you for calling.</Say>
  <Hangup/>
</Response>`);
}

async function sendSMS(options: { to: string; body: string }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const fromNumber = process.env.TWILIO_FROM_NUMBER!;

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: fromNumber, To: options.to, Body: options.body }).toString(),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SMS failed: ${res.status}: ${text}`);
  }
}
