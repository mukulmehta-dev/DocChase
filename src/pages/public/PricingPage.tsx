import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

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
      ctaVariant: 'secondary' as const,
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
      ctaVariant: 'secondary' as const,
      popular: false,
    },
  ];

  return (
    <div className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <Badge variant="neutral" className="mb-4">
          Simple, Transparent Pricing
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Save 10+ hours every month chasing clients.
        </h1>
        <p className="mt-4 text-slate-500 text-sm sm:text-base leading-relaxed">
          Every plan includes 256-bit encrypted storage, secure client link generation, and automatic reminder cutoff.
        </p>
      </div>

      {/* Pricing grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`relative rounded-2xl flex flex-col justify-between transition-all duration-200 ${
              p.popular
                ? 'bg-white border-2 border-sky-400 shadow-[0_8px_32px_rgba(14,165,233,0.15)] ring-4 ring-sky-400/10 hover:shadow-[0_12px_40px_rgba(14,165,233,0.2)] hover:-translate-y-0.5'
                : 'bg-white border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            {/* Recommended ribbon */}
            {p.popular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full bg-sky-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                Recommended
              </div>
            )}

            <div className="p-6 sm:p-7">
              {/* Plan name & badge */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    p.popular
                      ? 'bg-sky-50 text-sky-600 border border-sky-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {p.badge}
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{p.price}</span>
                <span className="text-xs text-slate-400 font-medium">{p.period}</span>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed mb-6">{p.description}</p>

              <div className="h-px bg-slate-100 mb-6" />

              {/* Features */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Features Included
                </span>
                {p.features.map((feat) => (
                  <div key={feat} className="flex items-start gap-2 text-xs text-slate-700">
                    <span
                      className="material-symbols-outlined text-emerald-500 text-[15px] flex-shrink-0 mt-0.5"
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

      {/* Footer note */}
      <div className="mt-14 text-center">
        <p className="text-xs text-slate-500 leading-relaxed">
          All plans are backed by bank-grade TLS encryption. Need an enterprise setup with &gt; 500 clients?{' '}
          <a href="mailto:support@docchase.com" className="text-sky-600 underline font-medium hover:text-sky-700">
            Contact our team
          </a>
        </p>

        {/* Trust strip */}
        <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-6 px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200">
          {[
            { icon: 'lock', label: '256-bit TLS Encryption' },
            { icon: 'credit_card_off', label: 'No Credit Card Required' },
            { icon: 'cancel', label: 'Cancel Anytime' },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span
                className="material-symbols-outlined text-[16px] text-sky-500"
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
  );
};
