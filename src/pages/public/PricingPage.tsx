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
    <div className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-14">
        <Badge variant="neutral" className="mb-3">
          Simple, Transparent Pricing
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Save 10+ hours every month chasing clients.
        </h1>
        <p className="mt-3 text-slate-600 text-sm sm:text-base">
          Every plan includes 256-bit encrypted storage, secure client link generation, and automatic reminder cutoff.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all bg-white ${
              p.popular
                ? 'border-2 border-primary-container shadow-xl ring-4 ring-primary-container/10 relative'
                : 'border border-slate-200 shadow-sm'
            }`}
          >
            {p.popular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary-container text-white text-[11px] font-bold uppercase tracking-wider shadow-sm">
                Recommended
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {p.badge}
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{p.price}</span>
                <span className="text-xs text-slate-500 font-medium">{p.period}</span>
              </div>

              <p className="mt-2 text-xs text-slate-600 leading-relaxed">{p.description}</p>

              <div className="h-[1px] bg-slate-100 my-6" />

              <div className="flex flex-col gap-2.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Features Included:
                </span>
                {p.features.map((feat) => (
                  <div key={feat} className="flex items-start gap-2 text-xs text-slate-700">
                    <span className="material-symbols-outlined text-emerald-600 text-[16px] flex-shrink-0 mt-0.5">
                      check_circle
                    </span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <Link to="/sign-up">
                <Button variant={p.ctaVariant} size="md" fullWidth>
                  {p.cta}
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center text-xs text-slate-500">
        All plans are backed by bank-grade TLS encryption. Need an enterprise setup with &gt; 500 clients?{' '}
        <a href="mailto:support@docchase.com" className="text-primary-container underline font-medium">
          Contact our team
        </a>
      </div>
    </div>
  );
};
