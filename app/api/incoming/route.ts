import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizePhone, escapeXml } from "@/lib/phone";
import { resolveOwner } from "@/lib/resolve-owner";
import { buildGreeting, buildWhitelistGreeting } from "@/lib/greeting";

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
      callCategory: "spam",
    });

    return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy">I'm sorry, we're unable to take your call at this time. Goodbye.</Say>
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
      callCategory: "existing_customer",
    });

    const whitelistGreeting = escapeXml(buildWhitelistGreeting(owner?.business_name, owner?.assistant_name));

    return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy">${whitelistGreeting}</Say>
  <Dial>${escapeXml(transferTo.trim())}</Dial>
  <Say voice="Polly.Amy">Thank you for calling. Have a great day.</Say>
  <Hangup/>
</Response>`);
  }

  const greeting = escapeXml(buildGreeting(owner?.business_name, owner?.assistant_name));

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${baseUrl}/api/voice/triage" method="POST" timeout="6" speechTimeout="auto">
    <Say voice="Polly.Amy">${greeting}</Say>
  </Gather>
  <Say voice="Polly.Amy">I'm sorry, I wasn't able to hear you. Please try calling back. Goodbye.</Say>
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
    callerName?: string | null;
    callCategory?: string | null;
  }
) {
  const { error } = await supabase.from("call_sessions").insert({
    call_sid: payload.callSid,
    from_number: payload.from,
    to_number: payload.to,
    caller_reason: payload.reason,
    caller_name: payload.callerName ?? null,
    call_category: payload.callCategory ?? null,
    status: "completed",
    decision: payload.decision,
    user_id: payload.userId,
  });

  if (error) console.error("CALL_LOG_ERROR", error);
}

