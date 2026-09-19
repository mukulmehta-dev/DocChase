import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-primary-container mb-6 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
          <span>Purpose-Built For Small Accounting & Bookkeeping Firms</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.15]">
          Stop chasing clients <br className="hidden sm:inline" />
          <span className="text-primary-container">for documents.</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          DocChase automates your recurring client document collection. Clients upload via secure links,
          reminders target <em>only</em> outstanding documents, and cycles turn <strong>Ready</strong> the moment
          every required file is approved.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link to="/sign-up">
            <Button variant="primary" size="lg" icon="arrow_forward" iconPosition="right" className="shadow-md">
              Start Free Trial — 14 Days
            </Button>
          </Link>
          <Link to="/pricing">
            <Button variant="secondary" size="lg" icon="sell">
              View Transparent Pricing
            </Button>
          </Link>
        </div>

        {/* Live UI Preview Card */}
        <div className="mt-14 p-2 sm:p-3 bg-white rounded-2xl border border-slate-200 shadow-xl max-w-4xl mx-auto text-left overflow-hidden">
          <div className="bg-slate-50 rounded-xl p-4 sm:p-6 border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-slate-900">ABC Ltd — September 2026 Cycle</span>
                  <Badge variant="waiting">2 Missing</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Template: Monthly Bookkeeping • Due in 3 days</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
                <span>3 of 5 Approved (60%)</span>
              </div>
            </div>

            {/* Document checklist mockup */}
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                  <span className="font-medium text-slate-800">September Bank Statement</span>
                </div>
                <Badge variant="complete">Approved</Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                  <span className="font-medium text-slate-800">Credit Card Statement (Sep 2026)</span>
                </div>
                <Badge variant="complete">Approved</Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-rose-500 text-[18px]">priority_high</span>
                  <span className="font-medium text-slate-800">Sales Ledger Summary</span>
                </div>
                <span className="text-[11px] font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Targeted by Auto-Reminder
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Step Core Workflow */}
      <section id="features" className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              The 5-Step Zero-Friction Workflow
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Engineered exclusively for client document collection. Not bloated accounting or CRM software.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col">
              <div className="w-9 h-9 rounded-lg bg-primary-container text-white flex items-center justify-center font-bold text-sm mb-3">
                1
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Recurring Templates</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Set up your firm's standard checklists (Monthly Bookkeeping, GST, Annual Tax) or use our AI to generate checklists from your client profile.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col">
              <div className="w-9 h-9 rounded-lg bg-primary-container text-white flex items-center justify-center font-bold text-sm mb-3">
                2
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Client Secure Link</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Clients never need passwords or accounts. They tap a 256-bit secure link, open an uncluttered mobile portal, and upload requested items.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col">
              <div className="w-9 h-9 rounded-lg bg-primary-container text-white flex items-center justify-center font-bold text-sm mb-3">
                3
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Smart Item Reminders</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Reminders stop the moment a file arrives. No client is ever nagged for a document they have already provided.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col">
              <div className="w-9 h-9 rounded-lg bg-primary-container text-white flex items-center justify-center font-bold text-sm mb-3">
                4
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Review & Replacement</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Approve or reject with one click. If a file is illegible or for the wrong period, reject with a clear reason. The client gets notified to upload a replacement.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col">
              <div className="w-9 h-9 rounded-lg bg-primary-container text-white flex items-center justify-center font-bold text-sm mb-3">
                5
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Ready = Bookkeeping Begins</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Uploaded does not mean approved. When and only when every required document is approved, the cycle turns <strong>Ready</strong>. Reminders cease automatically.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/40 flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm mb-3">
                  ✓
                </div>
                <h3 className="font-semibold text-slate-900 text-base">Zero Unnecessary Features</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  We don't try to be QuickBooks, Xero, payroll, or an ERP. DocChase stays laser-focused on one job: gathering client paperwork on time.
                </p>
              </div>
              <Link to="/sign-up" className="mt-4">
                <Button variant="primary" size="sm" fullWidth>
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
