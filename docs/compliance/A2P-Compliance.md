# A2P 10DLC Compliance — Gatekeeper

## Background

Gatekeeper's first A2P 10DLC campaign was submitted on 2026-06-17 as `LOW_VOLUME` use case
and rejected with Twilio Error 30909 (Message Flow or Call to Action incomplete/unverified).

## Root Causes Identified

1. **Opt-in behind authentication (30921)**: The SMS opt-in toggle lives at `/setup`,
   which requires login. No hosted screenshot was provided for reviewer verification.

2. **Missing carrier-mandated privacy language (30908)**: Privacy policy did not contain
   the exact clause about text messaging originator opt-in data and consent not being
   shared with third parties.

3. **Incomplete message flow description (30917)**: The message flow field did not describe
   the full end-to-end consent path or provide a hosted screenshot URL for the gated flow.

4. **Wrong use case**: `LOW_VOLUME` is for mixed-purpose campaigns. `ACCOUNT_NOTIFICATION`
   is the correct use case for transactional call alerts.

5. **Default opt-in was pre-selected (30925)**: `sms_notifications_enabled` defaulted to
   `true` at the time of submission.

## Changes Made

### Code Changes (prior commits)

- SMS default changed to `false` (commit 3992159)
- STOP/HELP/START webhook added at `/api/sms` (commit 3992159)
- Opt-in confirmation SMS sent on toggle enable (commit 3992159)
- Consent text added below SMS toggle in settings UI (commit 3992159)

### Website Changes (this sprint)

- **Privacy Policy**: Added carrier-mandated clause — "Text messaging originator opt-in
  data and consent will not be shared with any third parties, except for aggregators and
  providers of the text message services." Added in both SMS section and Information
  Sharing section.

- **Terms & Conditions**: Added matching opt-in data/consent non-sharing clause.

- **Signup Page**: Added links to Privacy Policy and Terms & Conditions below the
  signup form.

- **Landing Page**: Replaced dead `#` footer links with real paths to Privacy, Terms,
  SMS Consent, and support email. Added SMS compliance disclosure to the SMS
  Notifications feature card.

- **SMS Consent Page** (`/sms-consent`): New public page documenting the full SMS
  program — who receives messages, how opt-in works, message types, frequency,
  STOP/HELP/START instructions, data privacy, and a placeholder for opt-in flow
  screenshots.

## Resubmission Plan

1. Use case: `ACCOUNT_NOTIFICATION` (not `LOW_VOLUME`)
2. Create new campaign (cannot change use case on rejected campaign)
3. Message flow must reference `/sms-consent` as the public documentation URL
4. Message flow must include hosted screenshot URL for the gated opt-in flow
5. Privacy Policy URL: `https://appgatekeeper.net/privacy`
6. Terms URL: `https://appgatekeeper.net/terms`

## Remaining Items Before Submission

- [ ] Take screenshots of the `/setup` SMS toggle with consent text visible
- [ ] Host screenshots at a public URL or embed on `/sms-consent`
- [ ] Configure Twilio Messaging webhook to `POST https://appgatekeeper.net/api/sms`
- [ ] Delete rejected campaign in Twilio Console
- [ ] Create new campaign with `ACCOUNT_NOTIFICATION` use case
- [ ] Verify all pages are deployed and accessible before submitting
