import React from 'react';
import { Link } from 'react-router-dom';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-slate-200">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600 mb-3">
          <span>Privacy Notice</span>
          <span>•</span>
          <span>Last Updated: September 2026</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          This Privacy Policy explains what information DocChase collects, how it is used, and how client data is protected.
        </p>
      </div>

      {/* Notice Banner */}
      <div className="mb-8 p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 leading-relaxed">
        <p className="font-semibold mb-1">Our Privacy Commitment</p>
        <p>
          DocChase collects only the data strictly needed to coordinate document requests between accounting practices and their clients. We do not sell your personal data or your clients' confidential financial documents.
        </p>
      </div>

      {/* Privacy Sections */}
      <div className="space-y-8 text-slate-700 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">1. Information We Collect</h2>
          <p className="mb-3">
            To provide the DocChase service, we collect the following categories of information:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Firm Account Details:</strong> Name, work email address, firm name, and securely hashed passwords when creating a firm account.
            </li>
            <li>
              <strong>Client Contact Metadata:</strong> Client names, email addresses, and phone numbers entered by your firm to direct document requests and reminder notifications.
            </li>
            <li>
              <strong>Uploaded Documents & Review Records:</strong> Files and paperwork submitted through client portals (e.g., statements, receipts, tax slips), review approval statuses, and reviewer notes.
            </li>
            <li>
              <strong>Technical Logs:</strong> Standard HTTP server logs, browser user-agent strings, and session identifiers necessary for security monitoring, authentication, and platform stability.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">2. How We Use Information</h2>
          <p className="mb-3">We use the collected information exclusively to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Authenticate firm personnel and maintain workspace session security.</li>
            <li>Generate unique, cryptographically random secure link tokens for client document collection portals.</li>
            <li>Dispatch automated reminders to clients for outstanding items according to your firm's schedule.</li>
            <li>Store, display, and permit download of uploaded files by authorized firm staff.</li>
            <li>Provide customer support and resolve operational issues.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">3. Data Security & Storage</h2>
          <p>
            DocChase protects data in transit using modern TLS / HTTPS transport encryption. Workspace data is segregated using PostgreSQL Row Level Security (RLS) policies at the database layer. Uploaded client documents are stored in private cloud object storage accessible only to authenticated workspace members.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">4. Third-Party Infrastructure Providers</h2>
          <p className="mb-3">
            DocChase relies on established cloud infrastructure providers to operate the service:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Supabase:</strong> For managed PostgreSQL database, authentication services, and private cloud file storage.
            </li>
            <li>
              <strong>Resend:</strong> For delivering transactional notification emails and client reminder dispatches.
            </li>
            <li>
              <strong>Stripe:</strong> For processing subscription payments (credit card numbers are processed directly by Stripe and never stored on DocChase servers).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">5. Data Retention & Account Deletion</h2>
          <p>
            Firm and client document records are retained as long as your workspace remains active. Firm administrators can request account deletion or data removal by contacting our support team.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">6. Changes to this Policy</h2>
          <p>
            We may update this Privacy Policy from time to time as platform features develop. Any material modifications will be reflected by updating the "Last Updated" date at the top of this page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">7. Contact Information</h2>
          <p>
            If you have questions about this Privacy Policy or your data, please contact us at{' '}
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
        <Link to="/terms" className="text-xs font-medium text-slate-500 hover:text-slate-800">
          Terms of Service →
        </Link>
      </div>
    </div>
  );
};
