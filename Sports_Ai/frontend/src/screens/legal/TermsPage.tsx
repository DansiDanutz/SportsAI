import { Layout } from '../../components/Layout';

export function TermsPage() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-white mb-6">Terms of Service</h1>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-6 text-gray-300">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using SportsAI, you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
            <p>
              SportsAI provides odds comparison, arbitrage detection, and AI-powered sports betting insights.
              The service is intended for informational purposes only. Users are responsible for compliance
              with all applicable laws in their jurisdiction regarding sports betting.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. User Accounts</h2>
            <p>
              You must create an account to access our services. You are responsible for maintaining
              the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Subscription and Credits</h2>
            <p>
              Premium features require a subscription or credits. Subscriptions auto-renew unless cancelled.
              Credits are non-refundable and expire 12 months after purchase.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Responsible Gambling</h2>
            <p>
              SportsAI promotes responsible gambling. We provide tools to help users set limits
              and take breaks. If you believe you have a gambling problem, please seek help from
              professional organizations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Disclaimer</h2>
            <p>
              SportsAI does not guarantee profits. All betting involves risk. Past performance
              does not guarantee future results. Our AI predictions and arbitrage opportunities
              are provided for informational purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Limitation of Liability</h2>
            <p>
              SportsAI is not liable for any losses incurred through the use of our service.
              Users bet at their own risk and are solely responsible for their betting decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Continued use of the service
              after changes constitutes acceptance of the new terms.
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
