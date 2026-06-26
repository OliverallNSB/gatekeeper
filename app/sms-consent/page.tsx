export default function SmsConsentPage() {
  return (
    <main className="max-w-4xl mx-auto p-6 whitespace-pre-wrap">
      {`
# Gatekeeper SMS Notification Program

Last Updated: June 2026

## What Is This Program?

Gatekeeper is an AI call screening service for small businesses, operated by Nova Labs Digital LLC. When an incoming call reaches your Gatekeeper-screened business line, Gatekeeper screens the caller and sends you an SMS notification with the caller's phone number and reason for calling.

These SMS messages are transactional account notifications only. Gatekeeper does not send marketing, promotional, advertising, or solicitation messages via SMS.

## Who Receives SMS Messages?

SMS notifications are sent exclusively to authenticated Gatekeeper account owners who have explicitly opted in by enabling SMS Notifications in their account settings.

No third parties, employees, customers, or other individuals receive SMS messages from Gatekeeper unless they are the registered account owner.

## How Do Account Owners Opt In?

SMS notifications are OFF by default for all new Gatekeeper accounts.

To opt in, an account owner must:

1. Create a Gatekeeper account at https://appgatekeeper.net/signup
2. Sign in and navigate to the Settings page at https://appgatekeeper.net/setup
3. Locate the "SMS Notifications" toggle (which is OFF by default)
4. Read the consent disclosure displayed below the toggle:
   "By enabling, you agree to receive transactional call alert messages. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help."
5. Enable the toggle

Upon enabling, Gatekeeper sends a confirmation SMS:
"Gatekeeper: SMS notifications enabled. You'll receive alerts when calls come in to your business line. Reply HELP for help, STOP to opt out. Msg&data rates may apply."

Note: The opt-in toggle is located inside the authenticated account settings dashboard. The account owner must be signed in to enable or disable SMS notifications.

## SMS Message Types

Once opted in, account owners may receive the following types of SMS notifications:

* Incoming call alerts (caller phone number and reason for calling)
* Missed call notifications
* Voicemail notifications
* Call transfer notifications
* Call summary notifications

## Message Frequency

Message frequency varies depending on incoming call activity to your screened business line. There is no fixed message schedule.

## Message and Data Rates

Message and data rates may apply. Contact your mobile carrier for details about your messaging plan.

## How to Opt Out

You may opt out of SMS notifications at any time by:

* Replying STOP to any Gatekeeper SMS message
* Disabling the SMS Notifications toggle in your account settings at https://appgatekeeper.net/setup

Upon opting out, you will receive a confirmation:
"You have been unsubscribed from Gatekeeper SMS notifications. You will no longer receive call alerts. To re-enable, visit https://appgatekeeper.net/setup. Reply HELP for help."

## How to Get Help

Reply HELP to any Gatekeeper SMS message to receive:
"Gatekeeper Call Screening - You are receiving call notification alerts for your Gatekeeper account. To manage notifications visit https://appgatekeeper.net/setup. For support email support@appgatekeeper.net. Reply STOP to unsubscribe."

## How to Re-Enable After Opting Out

Reply START to any Gatekeeper number, or re-enable the SMS Notifications toggle in your account settings at https://appgatekeeper.net/setup.

## SMS Delivery Provider

SMS messages are delivered via Twilio. Delivery is subject to carrier network availability and is not guaranteed.

## Data Privacy

Your phone number is used solely to deliver Gatekeeper account notifications. We do not sell, rent, or share your phone number with third parties for marketing or promotional purposes. Text messaging originator opt-in data and consent will not be shared with any third parties, except for aggregators and providers of the text message services.

For full details, see our Privacy Policy: https://appgatekeeper.net/privacy

## Terms & Conditions

By enabling SMS notifications, you agree to the Gatekeeper Terms & Conditions: https://appgatekeeper.net/terms

## Opt-In Flow Screenshots

The screenshots below show the SMS opt-in experience inside the authenticated Gatekeeper account settings:

[Screenshots will be added here]

## Contact

For questions about the Gatekeeper SMS notification program:

support@appgatekeeper.net

Gatekeeper is a product of Nova Labs Digital LLC.

`}
    </main>
  );
}
