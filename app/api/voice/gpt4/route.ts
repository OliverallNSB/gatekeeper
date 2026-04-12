import twilio from 'twilio';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioFromNumber = process.env.TWILIO_FROM_NUMBER!;
const ownerMobileNumber = process.env.OWNER_MOBILE_NUMBER!;

const client = twilio(accountSid, authToken);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const fromNumber = formData.get('From') as string;
    const toNumber = formData.get('To') as string;

    console.log('GPT4_VOICE_ENDPOINT', {
      baseUrl: `${process.env.NGROK_URL || 'https://gatekeeper-weld.vercel.app'}`,
      callSid,
      from: fromNumber,
      to: toNumber,
    } );

    // Get user settings from Supabase
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('ai_screening_enabled, owner_phone_number')
      .single();

    console.log('USER_SETTINGS', userSettings);

    // If AI screening is disabled, forward call directly to owner
    if (userSettings && !userSettings.ai_screening_enabled) {
      console.log('AI_SCREENING_DISABLED - Forwarding to owner');
      
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.dial(ownerMobileNumber);

      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    // AI screening enabled - proceed with normal flow
    const twiml = new twilio.twiml.VoiceResponse();

    // Gather speech input
    const gather = twiml.gather({
      input: ['speech'],
      timeout: 10,
      speechTimeout: 'auto',
      maxSpeechTime: 60,
      action: `${process.env.NGROK_URL || 'https://gatekeeper-weld.vercel.app'}/api/voice/gpt4/process`,
      method: 'POST',
    } );

    gather.say('Thank you for calling. Please tell us the reason for your call.');

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Voice endpoint error:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('An error occurred. Please try again later.');
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}
