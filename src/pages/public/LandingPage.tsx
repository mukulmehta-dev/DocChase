import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

const WorkflowStep: React.FC<{
  step: number;
  title: string;
  description: string;
}> = ({ step, title, description }) => (
  <div className="flex flex-col elevation-1 rounded-xl p-5 hover:elevation-2 transition-all duration-200 hover:-translate-y-0.5 group">
    <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center font-bold text-sm mb-4 group-hover:bg-sky-400 transition-colors">
      {step}
    </div>
    <h3 className="font-semibold text-slate-900 text-sm leading-snug">{title}</h3>
    <p className="text-xs text-slate-500 mt-2 leading-relaxed">{description}</p>
  </div>
);

const SecurityCard: React.FC<{
  icon: string;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div className="flex flex-col p-5 rounded-xl elevation-1 hover:elevation-2 transition-all duration-200 hover:-translate-y-0.5">
    <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center mb-4">
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </div>
    <h3 className="font-semibold text-slate-900 text-sm leading-snug">{title}</h3>
    <p className="text-xs text-slate-500 mt-2 leading-relaxed">{description}</p>
  </div>
);

export const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col w-full">

      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden pt-20 pb-24 px-4 sm:px-6 lg:px-8">
        {/* Atmospheric background */}
        <div className="absolute inset-0 bg-radial-hero pointer-events-none" aria-hidden="true" />
        <div className="absolute inset-0 bg-grid-subtle pointer-events-none opacity-60" aria-hidden="true" />

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-xs font-semibold text-sky-700 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            Purpose-built for small accounting &amp; bookkeeping firms
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-slate-900 leading-[1.12] max-w-3xl mx-auto">
            Stop chasing clients{' '}
            <span className="relative inline-block">
              <span className="relative z-10 text-sky-500">for documents.</span>
              <span
                className="absolute -bottom-1 left-0 right-0 h-[3px] bg-sky-200 rounded-full"
                aria-hidden="true"
              />
            </span>
          </h1>

          <p className="mt-7 text-base sm:text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
            DocChase automates your recurring client document collection. Clients upload via secure links,
            reminders target <em className="text-slate-700 not-italic font-medium">only</em> outstanding items, and cycles turn{' '}
            <strong className="text-emerald-600 font-semibold">Ready</strong> the moment every required file is approved.
          </p>

          {/* CTAs */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/sign-up">
              <Button variant="primary" size="lg" icon="arrow_forward" iconPosition="right" className="shadow-[0_2px_8px_rgba(14,165,233,0.3)] hover:shadow-[0_4px_16px_rgba(14,165,233,0.35)]">
                Start Free Trial — 14 Days
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="secondary" size="lg" icon="sell">
                View Transparent Pricing
              </Button>
            </Link>
          </div>

          {/* Trust micro-line */}
          <p className="mt-5 text-[11px] text-slate-400 flex items-center justify-center gap-3">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-emerald-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              No credit card required
            </span>
            <span className="w-px h-3 bg-slate-200" />
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-emerald-500" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              Free plan available
            </span>
            <span className="w-px h-3 bg-slate-200" />
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-emerald-500" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
              Bank-grade TLS encryption
            </span>
          </p>

          {/* Live UI Preview Card */}
          <div className="mt-14 mx-auto max-w-2xl text-left">
            {/* Browser chrome frame */}
            <div className="elevation-3 rounded-2xl overflow-hidden">
              {/* Faux browser toolbar */}
              <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-1 text-[11px] text-slate-400 font-mono flex items-center gap-1.5 max-w-[280px] mx-auto">
                  <span className="material-symbols-outlined text-[12px] text-emerald-500" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                  docchase.com/dashboard
                </div>
              </div>

              {/* App content mockup */}
              <div className="bg-slate-50 px-4 sm:px-6 py-5">
                {/* Demo label */}
                <div
                  id="hero-demo-data-label"
                  className="flex items-center justify-between gap-2 px-3 py-1.5 mb-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px] font-medium"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-amber-600">info</span>
                    <span className="font-bold uppercase tracking-wider text-[10px]">DEMO — SAMPLE WORKFLOW</span>
                  </div>
                  <span className="text-amber-700 text-[10px]">Sample data — for demonstration only</span>
                </div>

                {/* Cycle header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">ABC Ltd — September 2026 Cycle</span>
                      <Badge variant="waiting">2 Missing</Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Template: Monthly Bookkeeping • Due in 3 days</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                    <span className="material-symbols-outlined text-[14px] text-emerald-500" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    <span>3 of 5 Approved (60%)</span>
                  </div>
                </div>

                {/* Document items */}
                <div className="mt-3 flex flex-col gap-2">
                  {[
                    { icon: 'check_circle', color: 'text-emerald-500', name: 'September Bank Statement', badge: <Badge variant="complete">Approved</Badge> },
                    { icon: 'check_circle', color: 'text-emerald-500', name: 'Credit Card Statement (Sep 2026)', badge: <Badge variant="complete">Approved</Badge> },
                    { icon: 'priority_high', color: 'text-rose-500', name: 'Sales Ledger Summary', badge: <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">Targeted by Auto-Reminder</span> },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined ${item.color} text-[16px]`} style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                        <span className="text-xs font-medium text-slate-800">{item.name}</span>
                      </div>
                      {item.badge}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5-Step Workflow ─── */}
      <section id="features" className="py-20 bg-white border-y border-slate-200 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 mb-4">
              <span className="material-symbols-outlined text-[14px] text-sky-500">route</span>
              How It Works
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              The 5-Step Zero-Friction Workflow
            </h2>
            <p className="text-sm text-slate-500 mt-3 leading-relaxed">
              Engineered exclusively for client document collection. Not bloated accounting or CRM software.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <WorkflowStep
              step={1}
              title="Recurring Templates"
              description="Set up your firm's standard checklists (Monthly Bookkeeping, GST, Annual Tax) or use our AI to generate checklists from your client profile."
            />
            <WorkflowStep
              step={2}
              title="Client Secure Link"
              description="Clients never need passwords or accounts. They tap a 256-bit secure link, open an uncluttered mobile portal, and upload requested items."
            />
            <WorkflowStep
              step={3}
              title="Smart Item Reminders"
              description="Reminders stop the moment a file arrives. No client is ever nagged for a document they have already provided."
            />
            <WorkflowStep
              step={4}
              title="Review &amp; Replacement"
              description="Approve or reject with one click. If a file is illegible or for the wrong period, reject with a clear reason. The client gets notified to upload a replacement."
            />
            <WorkflowStep
              step={5}
              title="Ready = Bookkeeping Begins"
              description="Uploaded does not mean approved. When and only when every required document is approved, the cycle turns Ready. Reminders cease automatically."
            />

            {/* CTA card */}
            <div className="flex flex-col p-5 rounded-xl border border-sky-200 bg-sky-50/60 justify-between hover:-translate-y-0.5 transition-all duration-200">
              <div>
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-sm font-bold mb-4">
                  <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                </div>
                <h3 className="font-semibold text-slate-900 text-sm">Zero Unnecessary Features</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  We don't try to be QuickBooks, Xero, payroll, or an ERP. DocChase stays laser-focused on one job: gathering client paperwork on time.
                </p>
              </div>
              <Link to="/sign-up" className="mt-5">
                <Button variant="primary" size="sm" fullWidth icon="arrow_forward" iconPosition="right">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Security Architecture ─── */}
      <section id="security" className="py-20 scroll-mt-16 relative overflow-hidden">
        {/* Subtle dark vault atmosphere */}
        <div className="absolute inset-0 bg-[#f8fafc] pointer-events-none" aria-hidden="true" />
        <div className="absolute inset-0 bg-grid-subtle pointer-events-none opacity-40" aria-hidden="true" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-xs font-semibold text-sky-700 mb-4">
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
              Architecture &amp; Security
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Bank-grade security for accounting paperwork
            </h2>
            <p className="text-sm text-slate-500 mt-3 leading-relaxed">
              How DocChase protects client documents, firm data, and communications at every layer.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <SecurityCard
              icon="lock"
              title="Encrypted Transport"
              description="All traffic between clients, accountants, and servers is strictly transmitted over HTTPS using industry-standard TLS transport encryption."
            />
            <SecurityCard
              icon="dataset"
              title="Database Row-Level Security"
              description="PostgreSQL Row Level Security (RLS) is enforced directly at the database engine level, guaranteeing users can only read and write data in their workspace."
            />
            <SecurityCard
              icon="domain"
              title="Workspace Isolation"
              description="Firm workspaces enforce strict multi-tenant boundaries. Team members access only their firm's clients, requests, and document cycles."
            />
            <SecurityCard
              icon="vpn_key"
              title="Token-Protected Client Portals"
              description="Clients upload via unique, cryptographically random secure link tokens. Clients never need passwords, reducing phishing and credential risk."
            />
            <SecurityCard
              icon="folder_managed"
              title="Protected Document Vault"
              description="Client uploads are stored in private cloud storage buckets with access restricted exclusively to authorized firm personnel."
            />
            <SecurityCard
              icon="verified_user"
              title="Hardened Authentication"
              description="Firm accounts are protected by secure credential hashing, automated session token management, and verified email confirmation controls."
            />
          </div>
        </div>
      </section>

    </div>
  );
};
