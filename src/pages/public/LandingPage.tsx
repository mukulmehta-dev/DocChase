import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

// ─── Security Card ────────────────────────────────────────────────────────────
const SecurityCard: React.FC<{
  icon: string;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div className="group flex flex-col p-5 rounded-xl bg-[#0B1120] border border-white/[0.07] hover:border-sky-500/30 hover:bg-[#0e1729] transition-all duration-200 hover:-translate-y-0.5">
    <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/25 text-sky-400 flex items-center justify-center mb-4 group-hover:bg-sky-500/15 transition-colors">
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </div>
    <h3 className="font-semibold text-white text-sm leading-snug">{title}</h3>
    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{description}</p>
  </div>
);

// ─── Hero Product Window ──────────────────────────────────────────────────────
const HeroProductWindow: React.FC = () => (
  <div className="relative w-full">
    {/* Ambient glow behind window */}
    <div
      className="absolute -inset-6 sm:-inset-10 bg-dc-hero-glow animate-dc-glow pointer-events-none"
      aria-hidden="true"
    />

    {/* Floating app window */}
    <div className="relative animate-dc-float rounded-2xl overflow-hidden border border-white/[0.09] shadow-[0_32px_80px_rgba(0,0,0,0.7),0_0_40px_rgba(14,165,233,0.07)]">

      {/* Title bar */}
      <div className="bg-[#0B1120] border-b border-white/[0.06] px-4 py-3 flex items-center gap-3">
        <div className="flex gap-1.5 shrink-0">
          <span className="w-3 h-3 rounded-full bg-rose-500/60" />
          <span className="w-3 h-3 rounded-full bg-amber-500/60" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
        </div>
        <div className="flex-1 bg-[#070B14] border border-white/[0.06] rounded-md px-3 py-1 flex items-center gap-1.5 max-w-[220px] mx-auto">
          <span
            className="material-symbols-outlined text-[11px] text-emerald-400 shrink-0"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >lock</span>
          <span className="text-[10px] text-slate-500 font-mono truncate">docchase.com/dashboard</span>
        </div>
      </div>

      {/* App body: sidebar + main */}
      <div className="flex bg-[#070B14]" style={{ minHeight: '310px' }}>

        {/* Sidebar */}
        <div className="w-32 sm:w-40 bg-[#0B1120] border-r border-white/[0.05] flex flex-col py-4 px-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2 mb-5">
            <div className="w-5 h-5 rounded-md bg-sky-500 flex items-center justify-center shrink-0">
              <span
                className="material-symbols-outlined text-[11px] text-white"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >fact_check</span>
            </div>
            <span className="text-white text-[11px] font-bold hidden sm:block">DocChase</span>
          </div>
          {[
            { icon: 'grid_view',    label: 'Overview',   active: false },
            { icon: 'people',       label: 'Clients',    active: false },
            { icon: 'assignment',   label: 'Requests',   active: true  },
            { icon: 'folder',       label: 'Documents',  active: false },
            { icon: 'notifications',label: 'Reminders',  active: false },
          ].map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-medium mb-0.5 select-none ${
                item.active
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                  : 'text-slate-600'
              }`}
            >
              <span className="material-symbols-outlined text-[13px] shrink-0">{item.icon}</span>
              <span className="hidden sm:block">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-3 sm:p-4 overflow-hidden min-w-0">

          {/* DEMO label */}
          <div
            id="hero-demo-data-label"
            className="flex items-center justify-between gap-2 px-2.5 py-1.5 mb-3 bg-amber-500/10 border border-amber-500/25 rounded-lg"
          >
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-400">
              DEMO — SAMPLE WORKFLOW
            </span>
            <span className="text-amber-500/60 text-[9px] hidden sm:block">
              Sample data — for demonstration only
            </span>
          </div>

          {/* Cycle header */}
          <div className="flex items-start sm:items-center justify-between gap-2 mb-2">
            <div>
              <p className="text-white text-[11px] font-semibold">ABC Ltd — September 2026 Cycle</p>
              <p className="text-slate-500 text-[9px] mt-0.5">Template: Monthly Bookkeeping • Due in 3 days</p>
            </div>
            <div className="flex items-center gap-1 text-[9px] bg-[#0B1120] border border-white/[0.06] rounded-lg px-2 py-1 shrink-0 text-slate-400">
              <span
                className="material-symbols-outlined text-[11px] text-emerald-400"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >verified</span>
              3 of 5
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-[#0B1120] rounded-full h-1 mb-3">
            <div
              className="bg-gradient-to-r from-sky-500 to-emerald-500 h-1 rounded-full"
              style={{ width: '60%' }}
            />
          </div>

          {/* Document rows */}
          <div className="flex flex-col gap-1.5">
            {[
              { icon: 'check_circle', c: 'text-emerald-400', name: 'September Bank Statement',       badge: 'Approved',        bc: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25' },
              { icon: 'check_circle', c: 'text-emerald-400', name: 'Credit Card Statement',           badge: 'Approved',        bc: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25' },
              { icon: 'schedule',     c: 'text-amber-400',   name: 'Sales Ledger Summary',            badge: 'Reminder Sent',   bc: 'text-amber-400 bg-amber-400/10 border-amber-400/25' },
              { icon: 'upload_file',  c: 'text-rose-400',    name: 'GST Invoice Bundle',              badge: 'Missing',         bc: 'text-rose-400 bg-rose-400/10 border-rose-400/25' },
            ].map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between p-2 bg-[#0B1120] rounded-lg border border-white/[0.05]"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`material-symbols-outlined ${item.c} text-[12px] shrink-0`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >{item.icon}</span>
                  <span className="text-[10px] text-slate-300 font-medium truncate">{item.name}</span>
                </div>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ml-2 ${item.bc}`}>
                  {item.badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ─── Landing Page ─────────────────────────────────────────────────────────────
export const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col w-full">

      {/* ══════════ HERO ══════════ */}
      <section className="relative overflow-hidden pt-16 sm:pt-20 pb-0 px-4 sm:px-6 lg:px-8 bg-[#070B14]">
        <div className="absolute inset-0 bg-dot-dark opacity-40 pointer-events-none" aria-hidden="true" />
        <div className="absolute inset-0 bg-dc-hero-glow pointer-events-none" aria-hidden="true" />

        <div className="relative max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center pb-16 sm:pb-24">

            {/* ── Text column ── */}
            <div className="text-center lg:text-left">
              {/* Eyebrow pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.09] text-xs font-semibold text-sky-400 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-dc-status" />
                Purpose-built for small accounting &amp; bookkeeping firms
              </div>

              {/* Headline */}
              <h1 className="text-5xl sm:text-[3.75rem] lg:text-[4.5rem] font-extrabold tracking-tighter text-white leading-[1.06] mb-6">
                Stop chasing clients
                <span className="block mt-1">
                  <span className="bg-gradient-to-r from-sky-400 to-cyan-400 bg-clip-text text-transparent">
                    for documents.
                  </span>
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-lg mx-auto lg:mx-0 mb-8">
                DocChase automates recurring client document collection. Clients upload via secure
                links, reminders target{' '}
                <em className="text-slate-200 not-italic font-medium">only</em> outstanding items,
                and cycles turn{' '}
                <span className="text-emerald-400 font-semibold">Ready</span>{' '}
                the moment every required file is approved.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-8">
                <Link to="/sign-up">
                  <Button
                    variant="primary"
                    size="lg"
                    icon="arrow_forward"
                    iconPosition="right"
                    className="shadow-[0_0_28px_rgba(14,165,233,0.28)] hover:shadow-[0_0_40px_rgba(14,165,233,0.38)]"
                  >
                    Start Free Trial
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button variant="outline-dark" size="lg" icon="sell">
                    View Pricing
                  </Button>
                </Link>
              </div>

              {/* Trust micro-line */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span
                    className="material-symbols-outlined text-[13px] text-emerald-400"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >check_circle</span>
                  No credit card required
                </span>
                <span className="w-px h-3 bg-white/[0.08]" />
                <span className="flex items-center gap-1.5">
                  <span
                    className="material-symbols-outlined text-[13px] text-emerald-400"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >check_circle</span>
                  Free plan available
                </span>
                <span className="w-px h-3 bg-white/[0.08]" />
                <span className="flex items-center gap-1.5">
                  <span
                    className="material-symbols-outlined text-[13px] text-emerald-400"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >lock</span>
                  TLS transport encryption
                </span>
              </div>
            </div>

            {/* ── Product visualization column ── */}
            <div className="w-full max-w-lg mx-auto lg:mx-0 lg:max-w-none">
              <HeroProductWindow />
            </div>
          </div>
        </div>

        {/* Bottom section fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-[#0B1120] pointer-events-none"
          aria-hidden="true"
        />
      </section>

      {/* ══════════ DOCUMENT RAIL ══════════ */}
      <section id="features" className="py-24 bg-[#0B1120] scroll-mt-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-dark opacity-25 pointer-events-none" aria-hidden="true" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section header */}
          <div className="text-center max-w-2xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-sky-400 mb-5">
              <span className="material-symbols-outlined text-[14px]">route</span>
              The Workflow
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
              One workflow.<br className="hidden sm:block" /> No more document chasing.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Engineered exclusively for client document collection. Not bloated accounting or CRM software.
            </p>
          </div>

          {/* Rail */}
          <div className="relative">
            {/* Desktop connecting glow line */}
            <div
              className="hidden lg:block absolute top-[38px] left-[10%] right-[10%] h-px overflow-visible"
              aria-hidden="true"
            >
              <div className="w-full h-full bg-gradient-to-r from-transparent via-sky-500/50 to-transparent animate-dc-rail" />
              <div className="absolute inset-0 blur-sm bg-gradient-to-r from-transparent via-sky-400/30 to-transparent" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-3">
              {[
                { step: '01', icon: 'assignment',        title: 'Create Template',     desc: 'Build standard checklists for Monthly Bookkeeping, GST, Annual Tax — or generate with AI from your client profile.', final: false },
                { step: '02', icon: 'link',              title: 'Client Secure Link',  desc: 'Clients never need accounts. They upload via a unique token-protected link on an uncluttered mobile portal.',         final: false },
                { step: '03', icon: 'notifications_active', title: 'Smart Reminders', desc: 'Reminders target only outstanding items. Stop the moment a file arrives — no blanket client nagging.',                 final: false },
                { step: '04', icon: 'rate_review',       title: 'Review & Replace',    desc: 'Approve or reject with one click. Clients re-upload with a clear reason if a document is wrong.',                      final: false },
                { step: '05', icon: 'task_alt',          title: 'Cycle → Ready',       desc: 'When every required document is approved, the cycle turns Ready. Reminders cease automatically.',                       final: true  },
              ].map((item, i) => (
                <div key={item.step} className="flex flex-col items-center text-center relative">
                  {/* Mobile vertical connector */}
                  {i < 4 && (
                    <div
                      className="lg:hidden absolute left-1/2 top-[76px] bottom-0 w-px bg-gradient-to-b from-sky-500/35 to-transparent"
                      aria-hidden="true"
                    />
                  )}

                  {/* Node */}
                  <div className={`relative w-[76px] h-[76px] rounded-2xl flex items-center justify-center mb-5 shrink-0 transition-all duration-300 hover:scale-105 ${
                    item.final
                      ? 'bg-emerald-500/10 border-2 border-emerald-500/40 shadow-[0_0_24px_rgba(16,185,129,0.12)]'
                      : 'bg-sky-500/10 border border-sky-500/30 hover:border-sky-500/55 hover:bg-sky-500/15 hover:shadow-[0_0_20px_rgba(14,165,233,0.10)]'
                  }`}>
                    <span
                      className={`material-symbols-outlined text-[24px] ${item.final ? 'text-emerald-400' : 'text-sky-400'}`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >{item.icon}</span>
                    <span className={`absolute -top-2 -right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                      item.final ? 'bg-emerald-500 text-white' : 'bg-sky-500 text-white'
                    }`}>{item.step}</span>
                  </div>

                  <h3 className="text-sm font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Rail CTA */}
          <div className="mt-16 text-center">
            <Link to="/sign-up">
              <Button variant="primary" size="lg" icon="arrow_forward" iconPosition="right">
                Start Free — No Credit Card
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════ EDITORIAL FEATURE PAIRS ══════════ */}
      <section className="py-24 bg-[#070B14] relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-dark opacity-20 pointer-events-none" aria-hidden="true" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Row A: Text left / Panel right ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-24">

            {/* Text */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-sky-400 mb-6">
                <span
                  className="material-symbols-outlined text-[14px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >repeat</span>
                Recurring Templates
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-5">
                Set it once.<br />Collect every month.
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-7">
                Create a standard document checklist for each client type. DocChase opens a fresh
                collection cycle each period and dispatches secure upload links automatically.
              </p>
              <ul className="space-y-3">
                {[
                  'AI-generated checklists from your client profile',
                  'Per-client recurring schedule control',
                  'Automatic cycle opening each period',
                  'Templates shared across team members',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <span
                      className="material-symbols-outlined text-emerald-400 text-[16px] mt-0.5 shrink-0"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Panel — Template view */}
            <div className="relative">
              <div className="absolute -inset-6 bg-dc-center-glow opacity-50 pointer-events-none" aria-hidden="true" />
              <div className="relative rounded-xl overflow-hidden border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.6)]" style={{ background: '#111827' }}>
                <div className="bg-[#0B1120] border-b border-white/[0.06] px-4 py-2.5 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono ml-2 truncate">Templates — Monthly Bookkeeping</span>
                </div>
                <div className="p-5">
                  <p className="text-[10px] text-amber-400/80 font-semibold uppercase tracking-wider mb-3">DEMO — SAMPLE TEMPLATE</p>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-white text-sm font-semibold">Monthly Bookkeeping</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 px-2 py-0.5 rounded-full">Active</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {['Bank Statement', 'Credit Card Statement', 'Sales Ledger', 'Purchase Invoices', 'GST Summary'].map((doc) => (
                      <div key={doc} className="flex items-center gap-2.5 p-2.5 bg-[#070B14] rounded-lg border border-white/[0.05]">
                        <span className="material-symbols-outlined text-[12px] text-slate-500">description</span>
                        <span className="text-[11px] text-slate-300 flex-1">{doc}</span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded text-sky-400 bg-sky-400/10">REQUIRED</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-slate-500">
                    <span>Opens: 1st of every month</span>
                    <span className="text-slate-600">12 active clients</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Horizontal divider */}
          <div
            className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-24"
            aria-hidden="true"
          />

          {/* ── Row B: Panel left / Text right ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Panel — Reminder / status view */}
            <div className="relative order-2 lg:order-1">
              <div className="relative rounded-xl overflow-hidden border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.6)]" style={{ background: '#111827' }}>
                <div className="bg-[#0B1120] border-b border-white/[0.06] px-4 py-2.5 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono ml-2">Active Reminders</span>
                </div>
                <div className="p-5">
                  <p className="text-[10px] text-amber-400/80 font-semibold uppercase tracking-wider mb-3">DEMO — SAMPLE DATA</p>
                  <div className="flex flex-col gap-2">
                    {[
                      { client: 'ABC Ltd',      doc: 'Sales Ledger Summary',   status: 'Reminder Sent', color: 'amber'   },
                      { client: 'XY Corp',      doc: 'GST Invoice Bundle',      status: 'Missing',       color: 'rose'    },
                      { client: 'PQ Partners',  doc: 'Bank Statement',          status: 'Uploaded ↑',    color: 'sky'     },
                      { client: 'Meridian Co.', doc: 'Purchase Invoices',       status: 'Approved',      color: 'emerald' },
                    ].map((item, idx) => (
                      <div key={item.client} className="flex items-center gap-3 p-3 bg-[#070B14] rounded-lg border border-white/[0.05]">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 animate-dc-status ${
                            item.color === 'amber'   ? 'bg-amber-400' :
                            item.color === 'rose'    ? 'bg-rose-400'  :
                            item.color === 'sky'     ? 'bg-sky-400'   : 'bg-emerald-400'
                          }`}
                          style={{ animationDelay: `${idx * 0.4}s` }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-white font-medium">{item.client}</p>
                          <p className="text-[10px] text-slate-500 truncate">{item.doc}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${
                          item.color === 'amber'   ? 'text-amber-400 bg-amber-400/10 border-amber-400/25'     :
                          item.color === 'rose'    ? 'text-rose-400 bg-rose-400/10 border-rose-400/25'         :
                          item.color === 'sky'     ? 'text-sky-400 bg-sky-400/10 border-sky-400/25'            :
                                                    'text-emerald-400 bg-emerald-400/10 border-emerald-400/25'
                        }`}>{item.status}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-sky-500/[0.05] border border-sky-500/20 rounded-lg">
                    <p className="text-[11px] text-sky-400/80 leading-relaxed">
                      Reminders stop the moment a document is uploaded — no client is ever nagged for files already provided.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-sky-400 mb-6">
                <span
                  className="material-symbols-outlined text-[14px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >notifications_active</span>
                Smart Reminders
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-5">
                Remind precisely.<br />Never over-send.
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-7">
                Reminders target only the specific documents still outstanding. The moment a file
                arrives, that reminder stops permanently. No blanket emails. No client frustration.
              </p>
              <ul className="space-y-3">
                {[
                  'Item-level targeting — not blanket client emails',
                  'Automatic cutoff when a document is uploaded',
                  'Cycle closes only when every file is approved',
                  'No manual tracking or follow-up spreadsheets',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <span
                      className="material-symbols-outlined text-emerald-400 text-[16px] mt-0.5 shrink-0"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ SECURITY VAULT ══════════ */}
      <section id="security" className="py-24 scroll-mt-16 relative overflow-hidden" style={{ background: '#060910' }}>
        {/* Vault atmosphere */}
        <div className="absolute inset-0 bg-dc-vault-glow pointer-events-none" aria-hidden="true" />
        {/* Sky accent top border */}
        <div
          className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-500/25 to-transparent"
          aria-hidden="true"
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-sky-400 mb-5">
              <span
                className="material-symbols-outlined text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >shield</span>
              Architecture &amp; Security
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Security architecture for accounting paperwork
            </h2>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
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
