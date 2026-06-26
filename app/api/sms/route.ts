import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STOP_KEYWORDS = ["stop", "stopall", "unsubscribe", "cancel", "quit", "end"];
const HELP_KEYWORDS = ["help", "info"];
const START_KEYWORDS = ["start", "unstop", "subscribe"];

function twimlResponse(message: string) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${message}</Message>
</Response>`;
  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

async function updateSmsSetting(from: string, enabled: boolean) {
  // Twilio sends From in E.164 — match directly first, then try digits-only fallback
  const { data } = await supabase
    .from("user_settings")
    .update({ sms_notifications_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("owner_phone_number", from)
    .select("id");

  if (!data?.length) {
    const digits = from.replace(/\D/g, "").slice(-10);
    await supabase
      .from("user_settings")
      .update({ sms_notifications_enabled: enabled, updated_at: new Date().toISOString() })
      .like("owner_phone_number", `%${digits}`);
  }
}

export async function POST(req: Request) {
  const form = await req.formData();
  const body = (form.get("Body") ?? "").toString().trim().toLowerCase();

  const from = (form.get("From") ?? "").toString();

  if (STOP_KEYWORDS.includes(body)) {
    await updateSmsSetting(from, false);
    return twimlResponse(
      "You have been unsubscribed from Gatekeeper SMS notifications. You will no longer receive call alerts. To re-enable, visit https://appgatekeeper.net/setup. Reply HELP for help."
    );
  }

  if (START_KEYWORDS.includes(body)) {
    await updateSmsSetting(from, true);
    return twimlResponse(
      "Gatekeeper: SMS notifications enabled. You'll receive alerts when calls come in to your business line. Reply HELP for help, STOP to opt out. Msg&data rates may apply."
    );
  }

  if (HELP_KEYWORDS.includes(body)) {
    return twimlResponse(
      "Gatekeeper Call Screening - You are receiving call notification alerts for your Gatekeeper account. To manage notifications visit https://appgatekeeper.net/setup. For support email support@appgatekeeper.net. Reply STOP to unsubscribe."
    );
  }

  return twimlResponse(
    "Gatekeeper Call Screening. Reply HELP for help, STOP to unsubscribe. Manage settings at https://appgatekeeper.net/setup"
  );
}
