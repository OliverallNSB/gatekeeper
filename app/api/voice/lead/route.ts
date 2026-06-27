export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { escapeXml } from "@/lib/phone";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function xml(twiml: string) {
  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function gather(baseUrl: string, nextStep: string, params: Record<string, string>, prompt: string): string {
  const qs = new URLSearchParams(params).toString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${baseUrl}/api/voice/lead?step=${nextStep}&${qs}" method="POST" timeout="8" speechTimeout="auto">
    <Say voice="Polly.Joanna">${escapeXml(prompt)}</Say>
  </Gather>
  <Say voice="Polly.Joanna">I didn't catch that. Let me take what we have so far. Thank you for calling.</Say>
  <Hangup/>
</Response>`;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const step = url.searchParams.get("step") || "name";
  const baseUrl = process.env.NGROK_URL || url.origin;

  const form = await req.formData();
  const speech = (form.get("SpeechResult") ?? "").toString().trim();
  const callSid = (form.get("CallSid") ?? "").toString();
  const from = (form.get("From") ?? "").toString();
  const to = (form.get("To") ?? "").toString();

  // Collect state from query params (accumulated from previous steps)
  const callerName = url.searchParams.get("name") || "";
  const userId = url.searchParams.get("uid") || "";

  console.log("LEAD_INTAKE", { step, callSid, speech, callerName });

  switch (step) {
    case "name": {
      // First step — ask for name. The caller's initial reason was already captured
      // by gpt4/process. This Gather captures their name response.
      const name = speech || callerName || "";
      return xml(gather(baseUrl, "service", { name, uid: userId, callSid, from, to },
        name
          ? `Thank you, ${escapeXml(name)}. What kind of service are you looking for?`
          : `What kind of service are you looking for?`
      ));
    }

    case "service": {
      const service = speech || "";
      return xml(gather(baseUrl, "address", {
        name: callerName, service, uid: userId, callSid, from, to
      }, "What is the property address or city?"));
    }

    case "address": {
      const service = url.searchParams.get("service") || "";
      const address = speech || "";
      return xml(gather(baseUrl, "phone", {
        name: callerName, service, address, uid: userId, callSid, from, to
      }, "And what is the best phone number for us to reach you?"));
    }

    case "phone": {
      const service = url.searchParams.get("service") || "";
      const address = url.searchParams.get("address") || "";
      const callbackPhone = speech || from;

      // Final step — save lead and close
      try {
        await supabase.from("lead_intake").insert({
          call_session_id: url.searchParams.get("callSid") || callSid,
          user_id: userId || null,
          caller_name: callerName || null,
          service_needed: service || null,
          property_address: address || null,
          callback_phone: callbackPhone || null,
        });
        console.log("LEAD_SAVED");
      } catch (err) {
        console.error("LEAD_SAVE_ERROR", err);
      }

      // Send SMS to owner
      try {
        const ownerPhone = url.searchParams.get("to") || to;
        const { data: settings } = await supabase
          .from("user_settings")
          .select("owner_phone_number, sms_notifications_enabled")
          .eq("twilio_phone_number", ownerPhone)
          .single();

        if (settings?.sms_notifications_enabled && settings?.owner_phone_number) {
          const smsName = callerName || "Unknown";
          const smsPhone = callbackPhone || from || "No phone";
          await sendSMS({
            to: settings.owner_phone_number,
            body: [
              `New Lead from ${smsName} (${from})`,
              `Service: ${service || "Not specified"}`,
              `Address: ${address || "Not specified"}`,
              `Callback: ${smsPhone}`,
              `Action: Call back soon`,
            ].join("\n"),
          });
        }
      } catch (err) {
        console.error("LEAD_SMS_ERROR", err);
      }

      const closing = callerName
        ? `Perfect, ${escapeXml(callerName)}. I'll make sure this gets to the owner so they can follow up with you as soon as possible. Thank you for calling.`
        : `Perfect. I'll make sure this gets to the owner so they can follow up with you as soon as possible. Thank you for calling.`;

      return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${closing}</Say>
  <Hangup/>
</Response>`);
    }

    default:
      return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thank you for calling. Have a great day.</Say>
  <Hangup/>
</Response>`);
  }
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
