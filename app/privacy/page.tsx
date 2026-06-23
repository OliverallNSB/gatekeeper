export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto p-6 whitespace-pre-wrap">
      {`
# Privacy Policy

Last Updated: June 2026

Gatekeeper ("Gatekeeper", "we", "our", or "us") provides call screening, call management, voicemail handling, and communication notification services.

This Privacy Policy explains what information we collect, how we use it, and how we protect it.

## Information We Collect

We may collect the following information:

### Account Information

* Name
* Email address
* Phone number
* Account credentials

### Call Information

* Incoming and outgoing call records
* Caller phone numbers
* Call screening responses
* Call routing information

### Voicemail and Communication Data

* Voicemail recordings
* Voicemail transcripts
* SMS notification records
* Call summaries

### Contact Information

* Whitelist contacts
* Blacklist contacts
* Trusted contacts

## How We Use Information

We use collected information to:

* Provide call screening services
* Route and manage incoming calls
* Deliver voicemail services
* Generate call summaries and transcripts
* Send SMS notifications and alerts
* Improve platform reliability
* Provide customer support

## SMS Notifications

When you enable SMS notifications in your account settings, we collect your phone number to deliver call screening alerts. These messages notify you of incoming calls, voicemails, and call transfers on your Gatekeeper-screened business line.

We use your phone number solely to send transactional account notifications related to your Gatekeeper service. We do not send marketing, promotional, or advertising messages via SMS.

Your phone number is shared with our messaging provider, Twilio, solely for the purpose of delivering SMS messages. We do not sell, rent, or share your phone number with third parties for their marketing purposes.

SMS notifications include:

* Incoming call alerts
* Missed call notifications
* Voicemail alerts
* Call transfer notifications
* Account notifications

Message frequency varies based on your incoming call volume. Message and data rates may apply.

You may opt out of SMS notifications at any time by:

* Replying STOP to any Gatekeeper message
* Disabling the SMS Notifications toggle in your account settings at https://appgatekeeper.net/setup

You may reply HELP to any message for support information.

To re-enable SMS notifications after opting out, reply START or enable the toggle in your account settings.

Your phone number is retained as long as your account is active. Upon account deletion, your phone number is removed from our systems within 30 days.

For SMS support, contact support@appgatekeeper.net.

## Information Sharing

Gatekeeper does not sell user information.

Information may be shared with service providers necessary to operate the platform, including:

* Telecommunications providers
* Cloud hosting providers
* Payment processors
* Analytics providers

## Data Security

We implement reasonable administrative, technical, and organizational safeguards to protect user information.

However, no internet-based service can guarantee complete security.

## Data Retention

Information is retained only as long as necessary to provide services, comply with legal obligations, resolve disputes, and enforce agreements.

## Changes to This Policy

We may update this Privacy Policy periodically.

Continued use of Gatekeeper after changes are posted constitutes acceptance of the revised policy.

## Contact

For questions regarding this Privacy Policy:

[support@appgatekeeper.net](mailto:support@appgatekeeper.net)

Gatekeeper is a product of Nova Labs Digital LLC.

`}
    </main>
  );
}