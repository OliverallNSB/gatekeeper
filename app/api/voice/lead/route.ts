export const runtime = "nodejs";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { escapeXml } from "@/lib/phone";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_STEPS = 6;

const REQUIRED_FIELDS = ["name", "service", "address", "phone"] as const;
type FieldKey = (typeof REQUIRED_FIELDS)[number];

const TEMPLATE_QUESTIONS: Record<FieldKey, (name: string) => string> = {
  name:    ()     => "Absolutely, I'd be happy to help. May I get your name?",
  service: (name) => name ? `Thank you, ${name}. What kind of service are you looking for?` : "What kind of service are you looking for?",
  address: ()     => "What is the property address or city?",
  phone:   ()     => "What is the best phone number for us to reach you?",
};

const FIELD_LABELS: Record<FieldKey, string> = {
  name: "the caller's name",
  service: "what service they need",
  address: "the property address or city",
  phone: "the best callback phone number",
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

async function generateQuestion(
  field: FieldKey,
  collected: Record<string, string>,
  assistantName: string,
  businessName: string,
): Promise<string> {
  try {
    const name = assistantName || "Sarah";
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are ${name}, a professional front desk receptionist${businessName ? ` for ${businessName}` : ""}. Generate ONE short, friendly sentence asking the caller for ${FIELD_LABELS[field]}. ${collected.name ? `The caller's name is ${collected.name}. Use it naturally if appropriate.` : ""} Do not ask about anything else. Do not identify as AI. Respond with only the spoken sentence.`,
        },
      ],
      max_tokens: 60,
      temperature: 0.7,
    });
    const response = completion.choices[0].message.content?.trim();
    if (response && response.length > 5 && response.length < 200) return response;
  } catch (err) {
    console.error("LEAD_GPT_ERROR", err);
  }
  return TEMPLATE_QUESTIONS[field](collected.name || "");
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

  // Accumulated state from query params
  const collected: Record<string, string> = {
    name:    url.searchParams.get("name") || "",
    service: url.searchParams.get("service") || "",
    address: url.searchParams.get("address") || "",
    phone:   url.searchParams.get("phone") || "",
  };
  const userId = url.searchParams.get("uid") || "";
  const assistantName = url.searchParams.get("aname") || "Sarah";
  const businessName = url.searchParams.get("bname") || "";

  // Determine which field this step's speech fills
  const currentField = REQUIRED_FIELDS.find((f) => !collected[f]);
  if (currentField && speech) {
    if (currentField === "phone" && SAME_NUMBER_PHRASES.some((p) => speech.toLowerCase().includes(p))) {
      collected.phone = from;
    } else {
      collected[currentField] = speech;
    }
  }

  console.log("LEAD_INTAKE", { stepCount, callSid, speech, collected });

  // Check what's still missing
  const missing = REQUIRED_FIELDS.filter((f) => !collected[f]);
  const nextStep = stepCount + 1;

  // Done: all fields collected or max steps reached
  if (missing.length === 0 || nextStep > MAX_STEPS) {
    // Fill callback phone with From if still empty
    if (!collected.phone) collected.phone = from;

    // Save lead
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

    // Send SMS
    try {
      const ownerTo = url.searchParams.get("to") || to;
      const { data: settings } = await supabase
        .from("user_settings")
        .select("owner_phone_number, sms_notifications_enabled")
        .eq("twilio_phone_number", ownerTo)
        .single();

      if (settings?.sms_notifications_enabled && settings?.owner_phone_number) {
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

    const closing = collected.name
      ? `Perfect, ${escapeXml(collected.name)}. I'll make sure this gets to the owner so they can follow up with you as soon as possible. Thank you for calling.`
      : `Perfect. I'll make sure this gets to the owner so they can follow up with you as soon as possible. Thank you for calling.`;

    return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy">${closing}</Say>
  <Hangup/>
</Response>`);
  }

  // Ask for the next missing field
  const nextField = missing[0];
  const question = await generateQuestion(nextField, collected, assistantName, businessName);

  const params: Record<string, string> = {
    step: String(nextStep),
    name: collected.name,
    service: collected.service,
    address: collected.address,
    phone: collected.phone,
    uid: userId,
    aname: assistantName,
    bname: businessName,
    callSid,
    from,
    to,
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
