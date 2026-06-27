import { NextResponse } from 'next/server';

export async function POST( ) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Your message has been received. Thank you for calling.</Say>
  <Hangup />
</Response>`;

  return new NextResponse(twiml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}