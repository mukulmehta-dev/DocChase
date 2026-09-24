import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { HeroDocumentVisual } from '../../components/landing/HeroDocumentVisual';

// ─── Security Card ────────────────────────────────────────────────────────────
const SecurityCard: React.FC<{
  icon: string;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div className="group flex flex-col p-5 rounded-xl bg-[#121215] border border-white/[0.08] hover:border-white/30 hover:bg-[#16161c] transition-all duration-200 hover:-translate-y-0.5">
    <div className="w-9 h-9 rounded-lg bg-neutral-900 border border-white/15 text-white flex items-center justify-center mb-4 group-hover:border-white/30 transition-colors shadow-sm">
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
    </div>
    <h3 className="font-semibold text-white text-sm leading-snug">{title}</h3>
    <p className="text-xs text-neutral-400 mt-2 leading-relaxed">{description}</p>
  </div>
);

// ─── Landing Page ─────────────────────────────────────────────────────────────
export const LandingPage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated user automatically to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  // Cursor-following soft white light effect (only on fine pointers / desktop)
  const glowRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: -1000, y: -1000 });
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    // Only enable on devices that support hover and fine pointer
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!mediaQuery.matches) return;

    const updateGlow = () => {
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${posRef.current.x - 225}px, ${posRef.current.y - 225}px, 0)`;
        glowRef.current.style.opacity = '1';
      }
      rafId.current = null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      if (!rafId.current) {
        rafId.current = requestAnimationFrame(updateGlow);
      }
    };

    const handleMouseLeave = () => {
      if (glowRef.current) {
        glowRef.current.style.opacity = '0';
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.body.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div className="flex flex-col w-full relative">
      {/* Interactive Cursor-Following Soft White Glow (Desktop only, pointer-events-none) */}
      <div
        ref={glowRef}
        className="fixed top-0 left-0 pointer-events-none z-30 rounded-full transition-opacity duration-300 opacity-0"
        style={{
          width: '450px',
          height: '450px',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.045) 0%, rgba(255, 255, 255, 0.01) 35%, transparent 70%)',
          willChange: 'transform',
        }}
        aria-hidden="true"
      />

      {/* ══════════ HERO ══════════ */}
      <section className="relative overflow-hidden pt-16 sm:pt-20 pb-0 px-4 sm:px-6 lg:px-8 bg-[#09090b]">
        <div className="absolute inset-0 bg-dot-dark opacity-40 pointer-events-none" aria-hidden="true" />
        <div className="absolute inset-0 bg-dc-hero-glow pointer-events-none" aria-hidden="true" />

        <div className="relative max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center pb-16 sm:pb-24">

            {/* ── Text column (Desktop: Left, Mobile: Second after visual) ── */}
            <div className="text-center lg:text-left order-2 lg:order-1">
              {/* Eyebrow pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.12] text-xs font-semibold text-white mb-8 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-dc-status" />
                Purpose-built for small accounting &amp; bookkeeping firms
              </div>

              {/* Headline */}
              <h1 className="text-5xl sm:text-[3.75rem] lg:text-[4.5rem] font-extrabold tracking-tighter text-white leading-[1.06] mb-6">
                Stop chasing clients
                <span className="block mt-1 text-neutral-400">
                  for documents.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-neutral-400 leading-relaxed max-w-lg mx-auto lg:mx-0 mb-8">
                DocChase automates recurring client document collection. Clients upload via secure
                links, reminders target{' '}
                <em className="text-neutral-200 not-italic font-medium">only</em> outstanding items,
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
                    className="shadow-[0_0_24px_rgba(255,255,255,0.18)] hover:shadow-[0_0_36px_rgba(255,255,255,0.28)]"
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
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2 text-[11px] text-neutral-500">
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

            {/* ── Central Document Visual (Desktop: Right, Mobile: First) ── */}
            <div className="w-full max-w-lg mx-auto lg:mx-0 lg:max-w-none order-1 lg:order-2 flex items-center justify-center">
              <HeroDocumentVisual />
            </div>
          </div>
        </div>

        {/* Bottom section fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-[#0c0c0e] pointer-events-none"
          aria-hidden="true"
        />
      </section>

      {/* ══════════ DOCUMENT RAIL ══════════ */}
      <section id="features" className="py-24 bg-[#0c0c0e] scroll-mt-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-dark opacity-25 pointer-events-none" aria-hidden="true" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Section header */}
          <div className="text-center max-w-2xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-xs font-semibold text-white mb-5">
              <span className="material-symbols-outlined text-[14px]">route</span>
              The Workflow
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
              One workflow.<br className="hidden sm:block" /> No more document chasing.
            </h2>
            <p className="text-sm text-neutral-400 leading-relaxed">
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
              <div className="w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-dc-rail" />
              <div className="absolute inset-0 blur-sm bg-gradient-to-r from-transparent via-white/20 to-transparent" />
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
                      className="lg:hidden absolute left-1/2 top-[76px] bottom-0 w-px bg-gradient-to-b from-white/20 to-transparent"
                      aria-hidden="true"
                    />
                  )}

                  {/* Node */}
                  <div className={`relative w-[76px] h-[76px] rounded-2xl flex items-center justify-center mb-5 shrink-0 transition-all duration-300 hover:scale-105 ${
                    item.final
                      ? 'bg-emerald-500/10 border-2 border-emerald-500/40 shadow-[0_0_24px_rgba(16,185,129,0.12)]'
                      : 'bg-neutral-900 border border-neutral-800 hover:border-white/40 hover:bg-neutral-800 shadow-[0_4px_16px_rgba(0,0,0,0.5)]'
                  }`}>
                    <span
                      className={`material-symbols-outlined text-[24px] ${item.final ? 'text-emerald-400' : 'text-white'}`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >{item.icon}</span>
                    <span className={`absolute -top-2 -right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none shadow-sm ${
                      item.final ? 'bg-emerald-500 text-white' : 'bg-white text-black'
                    }`}>{item.step}</span>
                  </div>

                  <h3 className="text-sm font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">{item.desc}</p>
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
      <section className="py-24 bg-[#09090b] relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-dark opacity-20 pointer-events-none" aria-hidden="true" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Row A: Text left / Panel right ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-24">

            {/* Text */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-xs font-semibold text-white mb-6">
                <span
                  className="material-symbols-outlined text-[14px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >repeat</span>
                Recurring Templates
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-5">
                Set it once.<br />Collect every month.
              </h2>
              <p className="text-neutral-400 text-sm leading-relaxed mb-7">
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
                  <li key={item} className="flex items-start gap-2.5 text-sm text-neutral-300">
                    <span
                      className="material-symbols-outlined text-emerald-400 text-[16px] mt-0.5 shrink-0"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual — Abstract Recurring Specification Engine */}
            <div className="relative">
              <div className="absolute -inset-6 bg-dc-center-glow opacity-50 pointer-events-none" aria-hidden="true" />
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.7)] bg-[#121215] p-6 sm:p-7">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                    SPECIFICATION // RECURRING ENGINE
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-neutral-300 bg-white/5 border border-white/10">
                    CADENCE: MONTHLY
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {/* Step 1: Trigger */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#09090b] border border-white/[0.05]">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-white">
                      <span className="material-symbols-outlined text-[18px]">event_repeat</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white">Automated Schedule Trigger</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">Dispatches collection requests on your firm's calendar</p>
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <div className="flex justify-center -my-1 text-neutral-600">
                    <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                  </div>

                  {/* Step 2: Requirements Matrix */}
                  <div className="p-3.5 rounded-xl bg-[#09090b] border border-white/[0.05] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-neutral-400">ARTIFACT REQUIREMENT MATRIX</span>
                      <span className="text-[10px] font-semibold text-neutral-300">AUTO-APPLIED</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {['Financial Ledgers', 'Bank Disclosures', 'Tax Filing Records', 'Operating Receipts'].map((name) => (
                        <div key={name} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                          <span className="text-[11px] text-neutral-300 truncate">{name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <div className="flex justify-center -my-1 text-neutral-600">
                    <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                  </div>

                  {/* Step 3: Zero Friction Link */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#09090b] border border-white/[0.05]">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-white">
                      <span className="material-symbols-outlined text-[18px]">key</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white">Single-Click Secure Token</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">Clients upload directly without portal logins or account setup</p>
                    </div>
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

            {/* Visual — Abstract State Machine / Resolution Loop */}
            <div className="relative order-2 lg:order-1">
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.7)] bg-[#121215] p-6 sm:p-7">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                    LOGIC // RESOLUTION ENGINE
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-white bg-white/10 border border-white/20">
                    SELECTIVE NOTIFICATION
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {/* State 1: Outstanding */}
                  <div className="p-3.5 rounded-xl bg-[#09090b] border border-white/[0.06] flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                        <span className="material-symbols-outlined text-[18px]">schedule</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white">Item Outstanding</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">Gentle scheduled reminders active for this requirement</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                      ACTIVE
                    </span>
                  </div>

                  {/* Event Node */}
                  <div className="flex items-center gap-2 pl-4 py-1 text-neutral-400 text-xs font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                    <span>Event: Document received & verified</span>
                  </div>

                  {/* State 2: Extinguished */}
                  <div className="p-3.5 rounded-xl bg-[#09090b] border border-white/[0.12] flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
                        <span className="material-symbols-outlined text-[18px]">notifications_off</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white">Reminders Permanently Extinguished</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">Sequence halts instantly for received file; outstanding items remain targeted</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-1 rounded bg-white/10 text-white border border-white/20 shrink-0">
                      STOPPED
                    </span>
                  </div>

                  {/* Event Node */}
                  <div className="flex items-center gap-2 pl-4 py-1 text-neutral-400 text-xs font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                    <span>Event: All required files gathered</span>
                  </div>

                  {/* State 3: Archived */}
                  <div className="p-3.5 rounded-xl bg-[#09090b] border border-emerald-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <span className="material-symbols-outlined text-[18px]">task_alt</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white">Collection Cycle Concluded</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">Complete audit trail generated; files locked into vault</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      RESOLVED
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-xs font-semibold text-white mb-6">
                <span
                  className="material-symbols-outlined text-[14px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >notifications_active</span>
                Smart Reminders
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-5">
                Remind precisely.<br />Never over-send.
              </h2>
              <p className="text-neutral-400 text-sm leading-relaxed mb-7">
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
                  <li key={item} className="flex items-start gap-2.5 text-sm text-neutral-300">
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
      <section id="security" className="py-24 scroll-mt-16 relative overflow-hidden bg-[#0c0c0e]">
        {/* Vault atmosphere */}
        <div className="absolute inset-0 bg-dc-vault-glow pointer-events-none" aria-hidden="true" />
        {/* White accent top border */}
        <div
          className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
          aria-hidden="true"
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-xs font-semibold text-white mb-5">
              <span
                className="material-symbols-outlined text-[14px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >shield</span>
              Architecture &amp; Security
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Security architecture for accounting paperwork
            </h2>
            <p className="text-sm text-neutral-400 mt-3 leading-relaxed">
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
