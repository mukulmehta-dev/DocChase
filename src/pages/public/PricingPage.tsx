import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export const PricingPage: React.FC = () => {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      description: 'Ideal for solo bookkeepers validating DocChase with initial clients.',
      badge: 'Start Here',
      features: [
        '3 Active Clients',
        '1 Active Recurring Request',
        'Secure Client Upload Portals',
        'Document Review & Approval',
        'Manual Reminders',
        'Community Support',
      ],
      cta: 'Get Started Free',
      ctaVariant: 'secondary-dark' as const,
      popular: false,
    },
    {
      name: 'Starter',
      price: '$9',
      period: '/month',
      description: 'The standard plan for growing accounting practices with recurring monthly retainers.',
      badge: 'Most Popular',
      features: [
        '15 Active Clients',
        'Unlimited Recurring Templates',
        'Automated Smart Reminders',
        'Targeted Missing-Item Dispatches',
        'AI Checklist Generation (Gemini)',
        'Private Document Vault Storage',
        'Email & Chat Support',
      ],
      cta: 'Start 14-Day Free Trial',
      ctaVariant: 'primary' as const,
      popular: true,
    },
    {
      name: 'Pro',
      price: '$19',
      period: '/month',
      description: 'Designed for high-volume audit and bookkeeping firms managing multiple client accounts.',
      badge: 'Scale',
      features: [
        '100 Active Clients',
        'Everything in Starter',
        'AI Document Assistance (Period / Type Detection)',
        'Custom Firm Branding & Domain',
        'Multiple Workspace Team Members',
        'Custom Reminder Cadence Rules',
        'Priority Technical Support',
      ],
      cta: 'Start 14-Day Free Trial',
      ctaVariant: 'secondary-dark' as const,
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#070B14] relative overflow-hidden">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-dot-dark opacity-30 pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-0 bg-dc-center-glow opacity-60 pointer-events-none" aria-hidden="true" />

      <div className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">

        {/* ── Page Header ── */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-sky-400 mb-6">
            <span
              className="material-symbols-outlined text-[14px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >sell</span>
            Simple, Transparent Pricing
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            Save 10+ hours every month chasing clients.
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Every plan includes 256-bit encrypted storage, secure client link generation, and automatic reminder cutoff.
          </p>
        </div>

        {/* ── Pricing Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 ${
                p.popular
                  ? 'bg-[#111827] border-2 border-sky-400/70 shadow-[0_0_48px_rgba(14,165,233,0.15),0_8px_32px_rgba(0,0,0,0.5)]'
                  : 'bg-[#0B1120] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:border-white/[0.13] hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)]'
              }`}
            >
              {/* Popular ribbon */}
              {p.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full bg-sky-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-[0_0_16px_rgba(14,165,233,0.4)]">
                  Recommended
                </div>
              )}

              {/* Sky accent line on popular */}
              {p.popular && (
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-sky-400/50 to-transparent rounded-full" aria-hidden="true" />
              )}

              <div className="p-6 sm:p-7">
                {/* Plan name & badge */}
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-bold text-white">{p.name}</h3>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                      p.popular
                        ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                        : 'bg-white/[0.05] text-slate-400 border-white/[0.09]'
                    }`}
                  >
                    {p.badge}
                  </span>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-3">
                  <span className={`text-4xl font-extrabold tracking-tight ${p.popular ? 'text-white' : 'text-slate-100'}`}>
                    {p.price}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">{p.period}</span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed mb-6">{p.description}</p>

                <div className="h-px bg-white/[0.06] mb-6" />

                {/* Features */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    Features Included
                  </span>
                  {p.features.map((feat) => (
                    <div key={feat} className="flex items-start gap-2 text-xs text-slate-300">
                      <span
                        className="material-symbols-outlined text-emerald-400 text-[15px] flex-shrink-0 mt-0.5"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check_circle
                      </span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="px-6 sm:px-7 pb-6 sm:pb-7">
                <Link to={`/sign-up?plan=${p.name.toLowerCase()}`} id={`pricing-cta-${p.name.toLowerCase()}`}>
                  <Button variant={p.ctaVariant} size="md" fullWidth>
                    {p.cta}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer note ── */}
        <div className="mt-14 text-center">
          <p className="text-xs text-slate-500 leading-relaxed">
            All plans are transmitted over industry-standard TLS encryption. Need an enterprise setup with &gt; 500 clients?{' '}
            <a href="mailto:support@docchase.com" className="text-sky-400 underline font-medium hover:text-sky-300">
              Contact our team
            </a>
          </p>

          {/* Trust strip */}
          <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-6 px-6 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.07]">
            {[
              { icon: 'lock', label: '256-bit TLS Encryption' },
              { icon: 'credit_card_off', label: 'No Credit Card Required' },
              { icon: 'cancel', label: 'Cancel Anytime' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span
                  className="material-symbols-outlined text-[16px] text-sky-400"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {icon}
                </span>
                <span className="font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
