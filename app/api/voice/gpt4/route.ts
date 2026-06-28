export const runtime = "nodejs";

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizePhone, escapeXml } from '@/lib/phone';
import { resolveOwner } from '@/lib/resolve-owner';
import { buildGreeting, buildWhitelistGreeting } from '@/lib/greeting';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function xml(twiml: string) {
  return new NextResponse(twiml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const fromNumber = formData.get('From') as string;
    const toNumber = formData.get('To') as string;

    const baseUrl = process.env.NGROK_URL || new URL(request.url).origin;

    console.log('GPT4_VOICE_ENDPOINT', {
      baseUrl,
      callSid,
      from: fromNumber,
      to: toNumber,
    } );

    const owner = await resolveOwner(supabase, toNumber);
    const userId = owner?.user_id ?? null;

    console.log('USER_SETTINGS', owner);

    // Blacklist check — reject before any screening or transfer
    const { data: blacklistData } = await supabase
      .from('blacklist')
      .select('phone_number')
      .eq('user_id', userId || '');
    const normalizedFrom = normalizePhone(fromNumber);
    const isBlocked = (blacklistData || []).some(
      (row: any) => normalizePhone(row.phone_number) === normalizedFrom
    );

    if (isBlocked) {
      console.log('BLACKLISTED - Rejecting call');
      await supabase.from('call_sessions').insert({
        call_sid: callSid,
        from_number: fromNumber,
        to_number: toNumber,
        caller_reason: '[blocked number]',
        caller_name: null,
        call_category: 'spam',
        status: 'completed',
        decision: 'blocked',
        user_id: userId,
      });

      return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy">I'm sorry, we're unable to take your call at this time. Goodbye.</Say>
  <Hangup/>
</Response>`);
    }

    const ownerPhone = owner?.owner_phone_number || process.env.OWNER_MOBILE_NUMBER!;

    // If AI screening is disabled, forward call directly to owner
    if (owner && !owner.ai_screening_enabled) {
      console.log('AI_SCREENING_DISABLED - Forwarding to owner');

      return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>${escapeXml(ownerPhone.trim())}</Dial>
  <Say voice="Polly.Amy">Thank you for calling. Have a great day.</Say>
  <Hangup/>
</Response>`);
    }

const normalizedFromNumber = normalizePhone(fromNumber);
let whitelistQuery = supabase.from("whitelist").select('*');
if (userId) whitelistQuery = whitelistQuery.eq('user_id', userId);
const { data: trustedContacts } = await whitelistQuery;

const trustedContact = trustedContacts?.find(contact =>
  normalizePhone(contact.phone_number) === normalizedFromNumber
);


    if (trustedContact) {
      console.log('TRUSTED_CONTACT_DETECTED - Forwarding to owner');

      const whitelistGreeting = buildWhitelistGreeting(owner?.business_name, owner?.assistant_name);

      return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy">${escapeXml(whitelistGreeting)}</Say>
  <Dial>${escapeXml(ownerPhone.trim())}</Dial>
  <Say voice="Polly.Amy">Thank you for calling. Have a great day.</Say>
  <Hangup/>
</Response>`);
    }

    // AI screening enabled - proceed with normal flow
    const greeting = buildGreeting(owner?.business_name, owner?.assistant_name);

    return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${baseUrl}/api/voice/gpt4/process" method="POST" timeout="10" speechTimeout="auto" maxSpeechTime="60">
    <Say voice="Polly.Amy">${escapeXml(greeting)}</Say>
  </Gather>
  <Say voice="Polly.Amy">I'm sorry, I wasn't able to hear you. Please try calling back. Goodbye.</Say>
  <Hangup/>
</Response>`);
  } catch (error) {
    console.error('Voice endpoint error:', error);
    return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy">I'm sorry, we're experiencing a brief technical issue. Please try your call again in a few minutes.</Say>
  <Hangup/>
</Response>`);
  }
}
