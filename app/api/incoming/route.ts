import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const form = await req.formData();
  const from = (form.get("From") ?? "").toString();
  const callSid = (form.get("CallSid") ?? "").toString();
  const to = (form.get("To") ?? "").toString();

  const baseUrl = process.env.NGROK_URL || new URL(req.url).origin;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const owner = await resolveOwner(supabase, to);
  const userId = owner?.user_id ?? null;
  const transferTo = owner?.owner_phone_number || process.env.TRANSFER_TO_NUMBER || "";

  const isBlocked = await numberExists(supabase, "blacklist", from, userId);
  const isWhitelisted = await numberExists(supabase, "whitelist", from, userId);

  if (isBlocked) {
    await logCall(supabase, {
      callSid,
      from,
      to,
      reason: "[blocked number]",
      decision: "blocked",
      userId,
    });

    return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">This number is not accepting calls at this time. Goodbye.</Say>
  <Hangup/>
</Response>`);
  }

  if (isWhitelisted && transferTo) {
    await logCall(supabase, {
      callSid,
      from,
      to,
      reason: "[trusted contact - bypassed screening]",
      decision: "transferred",
      userId,
    });

    return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Please hold while I connect you.</Say>
  <Dial action="${baseUrl}/api/voice/hangup" method="POST">${escapeXml(transferTo.trim())}</Dial>
</Response>`);
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${baseUrl}/api/voice/triage" method="POST" timeout="6" speechTimeout="auto">
    <Say voice="alice">Gatekeeper is live. Please say the reason for your call.</Say>
  </Gather>
  <Say voice="alice">I did not hear anything. Goodbye.</Say>
  <Hangup/>
</Response>`;

  return xml(twiml);
}

export async function GET() {
  return new NextResponse("Gatekeeper incoming voice webhook is live.", {
    status: 200,
  });
}

function xml(twiml: string) {
  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

async function resolveOwner(supabase: any, toNumber: string) {
  const { data } = await supabase
    .from("user_settings")
    .select("user_id, owner_phone_number")
    .eq("twilio_phone_number", toNumber)
    .single();
  return data as { user_id: string; owner_phone_number: string } | null;
}

async function numberExists(supabase: any, table: "whitelist" | "blacklist", from: string, userId: string | null) {
  let query = supabase.from(table).select("phone_number");
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query;

  if (error) {
    console.error(`${table.toUpperCase()}_CHECK_ERROR`, error);
    return false;
  }

  const incoming = normalizePhone(from);

  return (data || []).some((row: any) => normalizePhone(row.phone_number) === incoming);
}

async function logCall(
  supabase: any,
  payload: {
    callSid: string;
    from: string;
    to: string;
    reason: string;
    decision: string;
    userId: string | null;
  }
) {
  const { error } = await supabase.from("call_sessions").insert({
    call_sid: payload.callSid,
    from_number: payload.from,
    to_number: payload.to,
    caller_reason: payload.reason,
    status: "completed",
    decision: payload.decision,
    user_id: payload.userId,
  });

  if (error) console.error("CALL_LOG_ERROR", error);
}

function normalizePhone(phone: string) {
  return (phone || "").replace(/\D/g, "");
}

function escapeXml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}