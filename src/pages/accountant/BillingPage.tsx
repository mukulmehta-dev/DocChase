import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { billingService, type WorkspaceEntitlements } from '../../services/billing';

export const BillingPage: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const [searchParams] = useSearchParams();
  const [entitlements, setEntitlements] = useState<WorkspaceEntitlements | null>(null);
  const [upgradingPlan, setUpgradingPlan] = useState<'starter' | 'pro' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isCheckoutSuccess = searchParams.get('success') === 'true';
  const isCheckoutCanceled = searchParams.get('canceled') === 'true';

  useEffect(() => {
    let isMounted = true;
    const loadEntitlements = async () => {
      if (!currentWorkspace?.id) return;
      try {
        const data = await billingService.getWorkspaceEntitlements(currentWorkspace.id);
        if (isMounted) setEntitlements(data);
      } catch (err: any) {
        if (isMounted) setErrorMessage(err.message || 'Failed to load subscription details.');
      }
    };

    loadEntitlements();
    return () => {
      isMounted = false;
    };
  }, [currentWorkspace?.id]);

  const handleUpgrade = async (plan: 'starter' | 'pro') => {
    if (!currentWorkspace?.id) return;
    try {
      setUpgradingPlan(plan);
      setErrorMessage(null);
      const { url } = await billingService.createCheckoutSession(currentWorkspace.id, plan);
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not start Stripe checkout.');
    } finally {
      setUpgradingPlan(null);
    }
  };

  const currentPlan = (entitlements?.plan || currentWorkspace?.plan || 'free').toUpperCase();
  const status = entitlements?.status || 'active';
  const clientsCount = entitlements?.active_clients_count ?? 0;
  const clientLimit = entitlements?.client_limit ?? 3;
  const requestsCount = entitlements?.active_requests_count ?? 0;
  const requestLimit = entitlements?.active_request_limit ?? 1;

  const clientPercent = Math.min(100, Math.round((clientsCount / clientLimit) * 100));
  const requestPercent = Math.min(100, Math.round((requestsCount / requestLimit) * 100));

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Subscription & Billing</h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Manage your firm's plan, usage quotas, and Stripe billing.</p>
      </div>

      {isCheckoutSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>Stripe checkout completed successfully! Your workspace subscription has been updated.</span>
        </div>
      )}

      {isCheckoutCanceled && (
        <div className="p-4 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs text-neutral-600 dark:text-neutral-400">
          Stripe checkout was canceled. No charges were made.
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg text-xs text-rose-800 dark:text-rose-300">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card elevation="low" className="p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Current Plan</span>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{currentPlan}</span>
              {status === 'active' ? (
                <Badge variant="ready">Active</Badge>
              ) : status === 'past_due' ? (
                <Badge variant="review">Past Due</Badge>
              ) : (
                <Badge variant="error">{status.toUpperCase()}</Badge>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {currentPlan === 'FREE' && 'Free tier: 3 clients, 1 active request.'}
              {currentPlan === 'STARTER' && 'Starter: 15 clients, 50 active cycles, AI checklist.'}
              {currentPlan === 'PRO' && 'Pro: 100 clients, 500 active cycles, AI Suite.'}
            </p>
            {entitlements?.cancel_at_period_end && entitlements.current_period_end && (
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-1">
                Cancels on {new Date(entitlements.current_period_end).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {currentPlan === 'FREE' && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={upgradingPlan === 'starter'}
                  onClick={() => handleUpgrade('starter')}
                >
                  Upgrade to Starter ($9/mo)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={upgradingPlan === 'pro'}
                  onClick={() => handleUpgrade('pro')}
                >
                  Upgrade to Pro ($19/mo)
                </Button>
              </>
            )}
            {currentPlan === 'STARTER' && (
              <Button
                variant="primary"
                size="sm"
                isLoading={upgradingPlan === 'pro'}
                onClick={() => handleUpgrade('pro')}
              >
                Upgrade to Pro ($19/mo)
              </Button>
            )}
            {currentPlan === 'PRO' && (
              <Badge variant="ready" className="w-fit">
                Highest Plan Active
              </Badge>
            )}
          </div>
        </Card>

        <Card elevation="low" className="p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Client Quota</span>
            <div className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">
              {clientsCount} / {clientLimit} <span className="text-xs font-normal text-neutral-400 dark:text-neutral-500">clients</span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {clientsCount >= clientLimit ? 'Quota reached. Upgrade to add more.' : `${clientLimit - clientsCount} client slot(s) available.`}
            </p>
          </div>
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full mt-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${clientPercent >= 100 ? 'bg-rose-500' : 'bg-neutral-900 dark:bg-white'}`}
              style={{ width: `${clientPercent}%` }}
            />
          </div>
        </Card>

        <Card elevation="low" className="p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Active Request Cycles</span>
            <div className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-100">
              {requestsCount} / {requestLimit} <span className="text-xs font-normal text-neutral-400 dark:text-neutral-500">active</span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {requestsCount >= requestLimit ? 'Active cycle quota reached.' : `${requestLimit - requestsCount} request slot(s) available.`}
            </p>
          </div>
          <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full mt-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${requestPercent >= 100 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${requestPercent}%` }}
            />
          </div>
        </Card>
      </div>

      <Card elevation="low" className="p-6">
        <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-1">Stripe Test Mode Billing</h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
          All checkout and subscription actions run in Stripe TEST MODE. Invoices and payment methods are securely managed through Stripe.
        </p>
        <div className="flex items-center gap-3">
          <Badge variant="neutral">TEST MODE</Badge>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">Zero live card charges</span>
        </div>
      </Card>
    </div>
  );
};
