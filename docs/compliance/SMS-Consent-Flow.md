# SMS Consent Flow — Gatekeeper

## Overview

Gatekeeper sends transactional SMS notifications to authenticated account owners
who have explicitly opted in. This document describes the complete consent flow.

## Opt-In Flow

```
1. User visits https://appgatekeeper.net/signup
   - Creates account with email and password
   - Page shows links to Privacy Policy and Terms & Conditions
   - No phone number collected at signup
   - No SMS consent occurs here

2. User signs in and navigates to https://appgatekeeper.net/setup
   - Settings page shows feature toggles
   - SMS Notifications toggle is OFF by default

3. User sees consent text below SMS toggle:
   "By enabling, you agree to receive transactional call alert messages.
    Message frequency varies. Msg & data rates may apply.
    Reply STOP to opt out, HELP for help."

4. User enables the SMS Notifications toggle
   - PUT /api/settings { sms_notifications_enabled: true }
   - Backend detects false→true transition
   - Backend sends opt-in confirmation SMS:
     "Gatekeeper: SMS notifications enabled. You'll receive alerts when
      calls come in to your business line. Reply HELP for help, STOP to
      opt out. Msg&data rates may apply."

5. SMS notifications are now active for this user
```

## Opt-Out Flow

```
Option A: Reply STOP to any Gatekeeper SMS
  - POST /api/sms receives inbound message
  - Matches sender to user_settings.owner_phone_number
  - Sets sms_notifications_enabled = false
  - Responds: "You have been unsubscribed from Gatekeeper SMS notifications.
    You will no longer receive call alerts. To re-enable, visit
    https://appgatekeeper.net/setup. Reply HELP for help."

Option B: Disable toggle in account settings
  - User navigates to /setup
  - Turns off SMS Notifications toggle
  - PUT /api/settings { sms_notifications_enabled: false }
  - No SMS sent on disable
```

## Re-Opt-In Flow

```
Option A: Reply START to the Gatekeeper number
  - POST /api/sms receives inbound message
  - Sets sms_notifications_enabled = true
  - Responds with opt-in confirmation message

Option B: Re-enable toggle in account settings
  - Same flow as initial opt-in (step 4 above)
  - Opt-in confirmation SMS sent
```

## HELP Flow

```
User texts HELP to the Gatekeeper number
  - POST /api/sms receives inbound message
  - Responds: "Gatekeeper Call Screening - You are receiving call notification
    alerts for your Gatekeeper account. To manage notifications visit
    https://appgatekeeper.net/setup. For support email
    support@appgatekeeper.net. Reply STOP to unsubscribe."
```

## Where Consent Is Recorded

- Database: `user_settings.sms_notifications_enabled` (boolean)
- Default: `false` for all new accounts
- No separate consent timestamp column exists (future improvement)

## SMS Sending Locations in Code

SMS is only sent when `sms_notifications_enabled === true`:

1. `app/api/voice/triage/route.ts` — after keyword urgency triage
2. `app/api/voice/gpt4/process/route.ts` — after GPT-4 urgency triage
3. `app/api/settings/route.ts` — opt-in confirmation on enable

## Public Documentation

- Privacy Policy: https://appgatekeeper.net/privacy
- Terms & Conditions: https://appgatekeeper.net/terms
- SMS Consent Program: https://appgatekeeper.net/sms-consent
