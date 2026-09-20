import React from 'react';
import { Link } from 'react-router-dom';

export const TermsPage: React.FC = () => {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-slate-200">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600 mb-3">
          <span>Early-Stage Service Terms</span>
          <span>•</span>
          <span>Last Updated: September 2026</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Terms of Service
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          These Terms of Service govern your use of DocChase's client document collection and reminder platform.
        </p>
      </div>

      {/* Notice Banner */}
      <div className="mb-8 p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900 leading-relaxed">
        <p className="font-semibold mb-1">Standard Operating Terms Notice</p>
        <p>
          DocChase is currently operated as an early-stage SaaS platform. These terms provide a structured baseline governing account access, acceptable use, and data handling. For enterprise inquiries or formal Master Services Agreements, please contact our team.
        </p>
      </div>

      {/* Terms Content Sections */}
      <div className="space-y-8 text-slate-700 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">1. Acceptance of Terms</h2>
          <p>
            By creating a firm workspace or accessing any service provided by DocChase ("DocChase", "we", "us", or "our"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not access or use the platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">2. Description of Service</h2>
          <p>
            DocChase provides client document chase workflows, automated reminder notifications, review approval workflows, and client upload portals specifically designed for accounting, bookkeeping, and professional service firms. DocChase is a document gathering utility and does not provide formal legal, auditing, or tax advice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">3. User Accounts & Responsibilities</h2>
          <p>
            You must provide accurate and complete information when registering your firm workspace. You are solely responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account. You agree not to use the service for any unauthorized, fraudulent, or unlawful purpose.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">4. Client Portals & Secure Access Links</h2>
          <p>
            DocChase facilitates client submissions via unique cryptographic link tokens generated for specific document requests. Firm accounts are responsible for ensuring they have appropriate client consent to send document requests and reminder dispatches to client email addresses or phone numbers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">5. Document Ownership & Storage</h2>
          <p>
            You and your clients retain all ownership rights to documents and content uploaded to DocChase. We do not claim ownership over client paperwork. Uploaded documents are stored in secure cloud storage solely for the purpose of enabling firm review, download, and cycle completion.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">6. Subscription & Billing</h2>
          <p>
            DocChase offers Free, Starter, and Pro plans. Paid subscriptions are billed on a recurring monthly basis unless canceled. You may cancel your subscription at any time within your workspace settings. Plan limits (such as active client quotas) apply as specified on the pricing schedule.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">7. Disclaimer of Warranties</h2>
          <p>
            The platform is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied. While DocChase strives for high reliability and data protection, we do not guarantee that the service will be entirely error-free or uninterrupted.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, DocChase shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">9. Contact & Inquiries</h2>
          <p>
            Questions regarding these Terms of Service may be directed to{' '}
            <a href="mailto:support@docchase.com" className="text-primary-container font-medium underline">
              support@docchase.com
            </a>
            .
          </p>
        </section>
      </div>

      {/* Bottom Back Link */}
      <div className="mt-12 pt-6 border-t border-slate-200 flex items-center justify-between">
        <Link to="/sign-up" className="text-xs font-semibold text-primary-container hover:underline flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to Sign Up</span>
        </Link>
        <Link to="/privacy" className="text-xs font-medium text-slate-500 hover:text-slate-800">
          Privacy Policy →
        </Link>
      </div>
    </div>
  );
};
