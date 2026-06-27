import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET user settings
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If no settings exist, create default ones
    if (!data) {
      const { data: newSettings, error: createError } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.user.id,
          ai_screening_enabled: true,
          sms_notifications_enabled: false,
          call_recording_enabled: false,
          voicemail_transcription_enabled: false,
          custom_routing_enabled: false,
          analytics_enabled: true,
          multi_user_enabled: false,
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }

      return NextResponse.json(newSettings);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update user settings
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const ALLOWED_FIELDS = [
      'ai_screening_enabled',
      'sms_notifications_enabled',
      'call_recording_enabled',
      'voicemail_transcription_enabled',
      'custom_routing_enabled',
      'analytics_enabled',
      'multi_user_enabled',
      'owner_phone_number',
      'twilio_phone_number',
      'business_name',
    ] as const;

    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    if (updates.owner_phone_number) {
      const { data: current } = await supabase
        .from('user_settings')
        .select('twilio_phone_number')
        .eq('user_id', user.user.id)
        .single();
      const ownerDigits = String(updates.owner_phone_number).replace(/\D/g, '');
      const twilioDigits = (current?.twilio_phone_number || '').replace(/\D/g, '');
      if (twilioDigits && ownerDigits === twilioDigits) {
        return NextResponse.json(
          { error: 'owner_phone_number must not be the same line that forwards into Twilio' },
          { status: 400 }
        );
      }
    }

    // Check if SMS is being enabled (false→true) so we can send opt-in confirmation
    let smsWasOff = false;
    if (updates.sms_notifications_enabled === true) {
      const { data: before } = await supabase
        .from('user_settings')
        .select('sms_notifications_enabled, owner_phone_number')
        .eq('user_id', user.user.id)
        .single();
      smsWasOff = !!before && !before.sms_notifications_enabled;
    }

    const { data, error } = await supabase
      .from('user_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send opt-in confirmation SMS when enabling notifications
    if (smsWasOff && data?.owner_phone_number) {
      try {
        await sendOptInSms(data.owner_phone_number);
      } catch (smsErr) {
        console.error('OPT_IN_SMS_ERROR', smsErr);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function sendOptInSms(to: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const fromNumber = process.env.TWILIO_FROM_NUMBER!;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      From: fromNumber,
      To: to,
      Body: "Gatekeeper: SMS notifications enabled. You'll receive alerts when calls come in to your business line. Reply HELP for help, STOP to opt out. Msg&data rates may apply.",
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SMS send failed: ${res.status}: ${text}`);
  }
}
