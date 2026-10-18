import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy & Anonymity Standards | Entangled Echo',
  description: 'Our commitment to creator privacy, Meta Graph API compliance, and K-anonymity platform benchmarks.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="border-b border-zinc-200 pb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-xs font-semibold text-[#373E3E] hover:underline"
          >
            &larr; Back to Dashboard
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#373E3E]">
            Privacy Policy &amp; Data Ethics
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Last Updated: October 2026 &bull; Entangled Echo Social Intelligence Platform
          </p>
        </div>

        <section className="card-elevation rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold text-[#373E3E]">
            1. Cross-Creator Benchmarks &amp; K-Anonymity Guarantees
          </h2>
          <p className="text-sm text-zinc-700 leading-relaxed">
            Entangled Echo offers optional cross-creator benchmarks to help digital creators evaluate their performance relative to cohort trends. To guarantee that individual creator performance and strategic experiments can never be reverse-engineered:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-700">
            <li>
              <strong>Strict K-Anonymity Threshold ($K \ge 20$):</strong> Benchmarks are only calculated and displayed if at least 20 active creator accounts have explicitly opted in. Below this threshold, the platform displays &quot;Not enough data yet&quot; rather than synthetic or fabricated figures.
            </li>
            <li>
              <strong>Zero Identifying Data:</strong> Platform benchmarks compute only high-level summary statistics (cohort median engagement rate, format distribution, interquartile ranges). No usernames, account IDs, post captions, or timestamps are ever exposed.
            </li>
            <li>
              <strong>Granular Opt-In Control:</strong> Creators may opt in or opt out at any time from the <Link href="/settings" className="font-semibold underline">Settings page</Link>. When opted out, your account&apos;s data is immediately excluded from future benchmark aggregations.
            </li>
          </ul>
        </section>

        <section className="card-elevation rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold text-[#373E3E]">
            2. Meta Graph API Compliance &amp; Zero Web Scraping
          </h2>
          <p className="text-sm text-zinc-700 leading-relaxed">
            Entangled Echo strictly complies with Meta Platform Terms and Developer Policies:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-700">
            <li>
              <strong>Official OAuth Integration:</strong> All data ingestion occurs exclusively via official Meta Graph APIs for Instagram Business and Facebook Pages.
            </li>
            <li>
              <strong>Zero Web Scraping:</strong> We do not scrape Instagram, Facebook, or any third-party websites. No headless browser automation or unofficial scraper APIs are permitted within our architecture.
            </li>
            <li>
              <strong>Public Business Discovery:</strong> Competitor discovery queries use official Meta Business Discovery endpoints with user-authorized tokens. Private metrics (reach, impressions, saves) are strictly unavailable for third-party accounts.
            </li>
          </ul>
        </section>

        <section className="card-elevation rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold text-[#373E3E]">
            3. Token Security &amp; Data Encryption
          </h2>
          <p className="text-sm text-zinc-700 leading-relaxed">
            OAuth access tokens are encrypted at rest using <strong>AES-256-GCM</strong> authenticated encryption with hardware-grade random nonces. Access tokens never transit to the browser client and are decrypted only in memory during server-side sync operations.
          </p>
        </section>

        <section className="card-elevation rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold text-[#373E3E]">
            4. User Rights &amp; Data Deletion
          </h2>
          <p className="text-sm text-zinc-700 leading-relaxed">
            You maintain complete ownership of your social media data. Disconnecting an account immediately removes all access tokens and cancels scheduled jobs. You may request full account and data deletion at any time by contacting our support team or deleting your profile in Settings.
          </p>
        </section>
      </div>
    </div>
  );
}
