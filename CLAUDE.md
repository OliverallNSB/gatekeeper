# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build (TypeScript check + static generation)
npm run lint         # ESLint
```

After deleting an API route, clear `.next/` before building — Next.js caches type references to deleted routes.

No test framework is configured.

## Architecture

Gatekeeper is an AI call screening service. Twilio receives incoming calls, screens them via keyword detection or GPT-4, and either transfers approved calls to the owner or sends them to voicemail. The owner gets SMS alerts.

**Stack**: Next.js 16 App Router, Supabase (auth + Postgres), Twilio Voice/SMS, OpenAI GPT-4, Tailwind CSS, deployed on Vercel.

**Path alias**: `@/*` maps to `./app/*` (tsconfig paths).

### Call Flow

There are two webhook entry points. Only one is active per Twilio number configuration:

1. **`/api/incoming`** — Basic flow: blacklist/whitelist check → `<Gather>` speech → `/api/voice/triage` (keyword urgency detection)
2. **`/api/voice/gpt4`** — AI flow: settings + whitelist check → `<Gather>` speech → `/api/voice/gpt4/process` (GPT-4 urgency detection)

Both flows resolve the call's owner by matching the Twilio `To` number against `user_settings.twilio_phone_number`. Transfer and SMS currently both use `owner_phone_number` — see Routing Modes below for why this is temporary.

### Routing Modes

Gatekeeper supports two deployment patterns:

**Mode 1: Existing Business Number Forwarding** — The customer already has an established public number. That number forwards into Gatekeeper/Twilio. Approved calls must transfer to a *different* phone number than the forwarding source (otherwise the call loops back into Gatekeeper). SMS notifications may go to a separate notification number.

**Mode 2: New Gatekeeper Business Number** — The customer uses the Twilio/Gatekeeper number directly as their public business number. No external forwarding exists. Approved calls can safely transfer to the user's normal cell phone. SMS notifications can go to the same cell phone.

### Planned: Phone Number Field Split

Currently `owner_phone_number` is overloaded — it serves as both the transfer destination and the SMS notification target. A future migration must split it into distinct fields:

- `business_public_phone_number` — the customer's public-facing number (their existing number in Mode 1, the Twilio number in Mode 2)
- `gatekeeper_twilio_phone_number` — the Twilio number that receives/screens calls (currently `twilio_phone_number`)
- `owner_transfer_phone_number` — where approved calls are transferred (must differ from the forwarding source in Mode 1)
- `owner_sms_phone_number` — where SMS alerts are sent (may equal the transfer number or differ)
- `routing_mode` — `'forwarding'` or `'direct'` to select Mode 1 vs Mode 2 behavior

Until this migration lands, the loop guard in `resolveOwner()` prevents the most dangerous misconfiguration (transfer number == Twilio number), but it cannot detect the subtler Mode 1 loop where the forwarding source is a third number that isn't `twilio_phone_number`.

### Multi-Tenant Model

Every incoming call is resolved to a user via `resolveOwner(supabase, toNumber)` which queries `user_settings` by `twilio_phone_number`. The returned `user_id` scopes all subsequent queries (whitelist, blacklist, call_sessions).

Dashboard queries use the anon key with RLS. Webhook routes use the service role key (no auth header from Twilio).

### Key Constraint: Transfer Loop Guard

`owner_phone_number` must NOT be the phone line that forwards calls into Twilio. If they match, `resolveOwner()` in `incoming/route.ts` nullifies the transfer number and logs `LOOP_GUARD`. The settings PUT endpoint also rejects this at write time.

### Database Tables

- **call_sessions** — one row per call (call_sid, from/to, caller_reason, decision, user_id). RLS enforced.
- **user_settings** — per-user config (feature toggles, twilio_phone_number, owner_phone_number). Resolved by twilio_phone_number on incoming calls.
- **whitelist / blacklist** — phone contacts scoped by user_id.

Migrations live in `supabase/migrations/`. No migration runner — apply manually via Supabase SQL Editor.

### Shared Utilities

- `app/lib/phone.ts` — `normalizePhone()` (strips non-digits), `escapeXml()` for TwiML
- `app/lib/urgency.ts` — `isUrgent()` with unified keyword list
- `app/lib/supabase-client.ts` — client-side Supabase instance (anon key)

### TwiML Patterns

All webhook routes return raw XML strings with `Content-Type: text/xml`, except `gpt4/route.ts` which uses the Twilio SDK's `VoiceResponse` builder.

After every `<Dial>`, include `<Say>Thank you. Goodbye.</Say><Hangup/>` as fallthrough verbs. Do NOT use `action` attributes on `<Dial>` — the callback URLs have been unreliable on Vercel.

All action URLs on `<Gather>` and `<Record>` must be absolute: `${baseUrl}/api/voice/...` where `baseUrl = process.env.NGROK_URL || new URL(req.url).origin`.

### Settings PUT Field Whitelist

The `/api/settings` PUT endpoint only accepts explicitly whitelisted fields. When adding a new setting column, add it to the `ALLOWED_FIELDS` array in `settings/route.ts`.

## Environment Variables

Required in `.env.local` (not committed):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER          # Gatekeeper's Twilio number for outbound SMS
OWNER_MOBILE_NUMBER         # Fallback transfer number (used when DB lookup fails)
OPENAI_API_KEY
```

Optional:
```
NGROK_URL                   # Dev tunnel — overrides req.url.origin for webhook callbacks
TRANSFER_TO_NUMBER          # Legacy fallback in /api/incoming only
```
