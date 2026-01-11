import { Layout } from '../../components/Layout';

export function PrivacyPage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-white mb-6">Privacy Policy</h1>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-6 text-gray-300">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
            <p className="mb-3">We collect information you provide directly:</p>
            <ul className="list-disc list-inside space-y-1 pl-4">
              <li>Account information (email, password)</li>
              <li>Payment information (processed securely by Stripe)</li>
              <li>Preferences and settings</li>
              <li>Favorite teams and leagues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-1 pl-4">
              <li>Provide and improve our services</li>
              <li>Personalize your experience</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send service-related communications</li>
              <li>Detect and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Information Sharing</h2>
            <p>
              We do not sell your personal information. We may share data with:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-4 mt-2">
              <li>Payment processors (Stripe) for transaction processing</li>
              <li>Analytics providers to improve our service</li>
              <li>Law enforcement when required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Data Security</h2>
            <p>
              We implement industry-standard security measures including encryption,
              secure password hashing, and HTTPS to protect your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Cookies</h2>
            <p>
              We use cookies for authentication and to remember your preferences.
              You can configure your browser to reject cookies, but this may affect
              your ability to use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 pl-4 mt-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Data Retention</h2>
            <p>
              We retain your account data as long as your account is active.
              Upon account deletion, we remove personal data within 30 days,
              except where required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Contact Us</h2>
            <p>
              For privacy-related questions, contact us at privacy@sportsai.com
            </p>
          </section>

          <div className="pt-6 border-t border-gray-700 text-sm text-gray-500">
            Last updated: January 2025
          </div>
        </div>
      </div>
    </Layout>
  );
}
