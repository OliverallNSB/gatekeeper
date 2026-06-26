export default function SmsConsentPage() {
  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Gatekeeper SMS Notification Program</h1>
      <p className="text-sm text-gray-500 mb-8">Last Updated: June 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">What Is This Program?</h2>
        <p className="mb-3">
          Gatekeeper is an AI call screening service for small businesses, operated by Nova Labs Digital LLC.
          When an incoming call reaches your Gatekeeper-screened business line, Gatekeeper screens the caller
          and sends you an SMS notification with the caller&apos;s phone number and reason for calling.
        </p>
        <p>
          These SMS messages are transactional account notifications only. Gatekeeper does not send marketing,
          promotional, advertising, or solicitation messages via SMS.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Who Receives SMS Messages?</h2>
        <p className="mb-3">
          SMS notifications are sent exclusively to authenticated Gatekeeper account owners who have explicitly
          opted in by enabling SMS Notifications in their account settings.
        </p>
        <p>
          No third parties, employees, customers, or other individuals receive SMS messages from Gatekeeper
          unless they are the registered account owner.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">How Do Account Owners Opt In?</h2>
        <p className="mb-3">
          SMS notifications are <strong>OFF by default</strong> for all new Gatekeeper accounts and are enabled
          only after the account owner&apos;s explicit consent.
        </p>
        <p className="mb-3">To opt in, an account owner must:</p>
        <ol className="list-decimal pl-6 mb-3 space-y-1">
          <li>Create a Gatekeeper account at <a href="/signup" className="text-blue-600 underline">appgatekeeper.net/signup</a></li>
          <li>Sign in and navigate to the Settings page at <a href="/setup" className="text-blue-600 underline">appgatekeeper.net/setup</a></li>
          <li>Locate the &quot;SMS Notifications&quot; toggle (which is OFF by default)</li>
          <li>Click the toggle to enable — a consent dialog appears before SMS is activated</li>
          <li>Review the consent disclosure and click &quot;Enable SMS&quot; to confirm</li>
        </ol>
        <p className="mb-3">
          Upon enabling, Gatekeeper sends a confirmation SMS:<br />
          <em>&quot;Gatekeeper: SMS notifications enabled. You&apos;ll receive alerts when calls come in to your
          business line. Reply HELP for help, STOP to opt out. Msg&amp;data rates may apply.&quot;</em>
        </p>
        <p className="text-sm text-gray-500">
          Note: The opt-in toggle and consent dialog are located inside the authenticated account settings
          dashboard. The account owner must be signed in to enable or disable SMS notifications.
        </p>
      </section>

      {/* Opt-In Flow */}
      <section className="mb-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6">Opt-In Flow</h2>
        <p className="text-sm text-gray-600 mb-6">
          The following steps show how an authenticated Gatekeeper account owner opts in to
          SMS notifications. This flow occurs inside the Gatekeeper account settings dashboard,
          which requires authentication.
        </p>

        <div className="mb-8">
          <h3 className="text-lg font-medium mb-1">Step 1 — Create Account</h3>
          <p className="text-sm text-gray-600 mb-4">
            The user creates a Gatekeeper account at appgatekeeper.net/signup using their email
            and password. No phone number is collected and no SMS consent occurs at this step.
            Links to the Privacy Policy and Terms &amp; Conditions are displayed on the signup page.
          </p>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-medium mb-1">Step 2 — Open SMS Settings</h3>
          <p className="text-sm text-gray-600 mb-4">
            After signing in, the user navigates to the Settings page at appgatekeeper.net/setup.
            The SMS Notifications toggle is <strong>OFF by default</strong>. The toggle description
            reads: &quot;Receive transactional SMS alerts for screened calls, voicemails, and
            emergency transfers.&quot;
          </p>
          <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
            <img
              src="/screenshots/sms-settings-toggle.png"
              alt="Gatekeeper Settings page showing the SMS Notifications toggle in the OFF position with description text."
              className="w-full h-auto"
            />
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-medium mb-1">Step 3 — Review Consent Dialog</h3>
          <p className="text-sm text-gray-600 mb-4">
            When the user clicks the SMS toggle, a consent dialog appears before SMS is activated.
            The dialog explains: the types of transactional messages, that SMS is optional and not
            required to use Gatekeeper, that Gatekeeper does not send marketing messages, message
            frequency and data rate disclosures, STOP and HELP instructions, and links to the
            Privacy Policy and Terms &amp; Conditions.
          </p>
          <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
            <img
              src="/screenshots/sms-consent-dialog.png"
              alt="Gatekeeper SMS consent dialog showing consent language, message types, no-marketing statement, frequency and data rate disclosures, STOP/HELP instructions, Privacy Policy and Terms links, Cancel and Enable SMS buttons."
              className="w-full h-auto"
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-1">Step 4 — Confirm Consent</h3>
          <p className="text-sm text-gray-600 mb-4">
            The user clicks &quot;Enable SMS&quot; to confirm consent. Gatekeeper immediately sends
            a confirmation SMS to the user&apos;s phone number: &quot;Gatekeeper: SMS notifications
            enabled. You&apos;ll receive alerts when calls come in to your business line. Reply HELP
            for help, STOP to opt out. Msg&amp;data rates may apply.&quot;
          </p>
          <p className="text-sm text-gray-600">
            If the user clicks &quot;Cancel,&quot; no changes are made and SMS remains disabled.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">SMS Message Types</h2>
        <p className="mb-3">Once opted in, account owners may receive the following types of SMS notifications:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Incoming call alerts (caller phone number and reason for calling)</li>
          <li>Missed call notifications</li>
          <li>Voicemail notifications</li>
          <li>Call transfer notifications</li>
          <li>Call summary notifications</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Message Frequency</h2>
        <p>
          Message frequency varies depending on incoming call activity to your screened business line.
          There is no fixed message schedule.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Message and Data Rates</h2>
        <p>Message and data rates may apply. Contact your mobile carrier for details about your messaging plan.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">How to Opt Out</h2>
        <p className="mb-3">You may opt out of SMS notifications at any time by:</p>
        <ul className="list-disc pl-6 mb-3 space-y-1">
          <li>Replying <strong>STOP</strong> to any Gatekeeper SMS message</li>
          <li>Disabling the SMS Notifications toggle in your account settings at <a href="/setup" className="text-blue-600 underline">appgatekeeper.net/setup</a></li>
        </ul>
        <p>
          Upon opting out, you will receive a confirmation:<br />
          <em>&quot;You have been unsubscribed from Gatekeeper SMS notifications. You will no longer receive
          call alerts. To re-enable, visit https://appgatekeeper.net/setup. Reply HELP for help.&quot;</em>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">How to Get Help</h2>
        <p>
          Reply <strong>HELP</strong> to any Gatekeeper SMS message to receive:<br />
          <em>&quot;Gatekeeper Call Screening - You are receiving call notification alerts for your Gatekeeper
          account. To manage notifications visit https://appgatekeeper.net/setup. For support email
          support@appgatekeeper.net. Reply STOP to unsubscribe.&quot;</em>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">How to Re-Enable After Opting Out</h2>
        <p>
          Reply <strong>START</strong> to any Gatekeeper number, or re-enable the SMS Notifications toggle in
          your account settings at <a href="/setup" className="text-blue-600 underline">appgatekeeper.net/setup</a>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">SMS Delivery Provider</h2>
        <p>SMS messages are delivered via Twilio. Delivery is subject to carrier network availability and is not guaranteed.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Data Privacy</h2>
        <p className="mb-3">
          Your phone number is used solely to deliver Gatekeeper account notifications. We do not sell, rent,
          or share your phone number with third parties for marketing or promotional purposes. Text messaging
          originator opt-in data and consent will not be shared with any third parties, except for aggregators
          and providers of the text message services.
        </p>
        <p>
          For full details, see our <a href="/privacy" className="text-blue-600 underline">Privacy Policy</a>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Terms &amp; Conditions</h2>
        <p>
          By enabling SMS notifications, you agree to the
          Gatekeeper <a href="/terms" className="text-blue-600 underline">Terms &amp; Conditions</a>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Contact</h2>
        <p className="mb-1">For questions about the Gatekeeper SMS notification program:</p>
        <p><a href="mailto:support@appgatekeeper.net" className="text-blue-600 underline">support@appgatekeeper.net</a></p>
        <p className="text-sm text-gray-500 mt-2">Gatekeeper is a product of Nova Labs Digital LLC.</p>
      </section>
    </main>
  );
}
