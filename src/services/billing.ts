import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { PlanType } from '../types';

export interface PlanLimit {
  maxClients: number;
  maxActiveRequests: number;
  allowAiChecklist: boolean;
  allowAiDocAssistance: boolean;
  maxStorageMb: number;
  allowCustomBranding: boolean;
}

export interface WorkspaceEntitlements {
  workspace_id: string;
  plan: PlanType;
  status: string;
  client_limit: number;
  active_clients_count: number;
  active_request_limit: number;
  active_requests_count: number;
  ai_checklist_enabled: boolean;
  ai_doc_assistance_enabled: boolean;
  storage_limit_mb: number;
  custom_branding_enabled: boolean;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimit> = {
  free: {
    maxClients: 3,
    maxActiveRequests: 1,
    allowAiChecklist: false,
    allowAiDocAssistance: false,
    maxStorageMb: 500,
    allowCustomBranding: false,
  },
  starter: {
    maxClients: 15,
    maxActiveRequests: 50,
    allowAiChecklist: true,
    allowAiDocAssistance: false,
    maxStorageMb: 5000,
    allowCustomBranding: false,
  },
  pro: {
    maxClients: 100,
    maxActiveRequests: 500,
    allowAiChecklist: true,
    allowAiDocAssistance: true,
    maxStorageMb: 25000,
    allowCustomBranding: true,
  },
};

export const billingService = {
  getPlanLimits(plan: PlanType = 'free'): PlanLimit {
    return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  },

  async getWorkspaceEntitlements(workspaceId: string): Promise<WorkspaceEntitlements> {
    if (isSupabaseConfigured()) {
      const { data, error } = await (supabase as any).rpc('get_workspace_entitlements', {
        p_workspace_id: workspaceId,
      });

      if (error) {
        console.error('Failed to fetch server-side workspace entitlements:', error);
      } else if (data) {
        return data as WorkspaceEntitlements;
      }
    }

    // Default fallback
    return {
      workspace_id: workspaceId,
      plan: 'free',
      status: 'active',
      client_limit: 3,
      active_clients_count: 0,
      active_request_limit: 1,
      active_requests_count: 0,
      ai_checklist_enabled: false,
      ai_doc_assistance_enabled: false,
      storage_limit_mb: 500,
      custom_branding_enabled: false,
      cancel_at_period_end: false,
      current_period_end: null,
    };
  },

  async createCheckoutSession(
    workspaceId: string,
    plan: 'starter' | 'pro',
    successUrl?: string,
    cancelUrl?: string
  ): Promise<{ url: string; sessionId: string }> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      throw new Error('You must be logged in to initiate checkout.');
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const finalSuccessUrl =
      successUrl || (origin ? `${origin}/billing?session_id={CHECKOUT_SESSION_ID}&success=true` : undefined);
    const finalCancelUrl =
      cancelUrl || (origin ? `${origin}/billing?canceled=true` : undefined);

    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
      body: { workspaceId, plan, successUrl: finalSuccessUrl, cancelUrl: finalCancelUrl },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to start Stripe checkout');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Stripe checkout could not be created');
    }

    return {
      url: data.url,
      sessionId: data.sessionId,
    };
  },

  checkClientCreationAllowed(plan: PlanType, currentClientCount: number): { allowed: boolean; message?: string } {
    const limit = this.getPlanLimits(plan);
    if (currentClientCount >= limit.maxClients) {
      return {
        allowed: false,
        message: `Plan limit reached. Your ${plan.toUpperCase()} plan allows a maximum of ${limit.maxClients} clients. Please upgrade to add more clients.`,
      };
    }
    return { allowed: true };
  },

  checkRequestCreationAllowed(plan: PlanType, currentActiveRequestCount: number): { allowed: boolean; message?: string } {
    const limit = this.getPlanLimits(plan);
    if (currentActiveRequestCount >= limit.maxActiveRequests) {
      return {
        allowed: false,
        message: `Active cycle limit reached. Your ${plan.toUpperCase()} plan allows ${limit.maxActiveRequests} active request cycle(s) concurrently.`,
      };
    }
    return { allowed: true };
  },

  checkAiFeatureAllowed(plan: PlanType, feature: 'checklist' | 'doc_assistance'): { allowed: boolean; message?: string } {
    const limit = this.getPlanLimits(plan);
    if (feature === 'checklist' && !limit.allowAiChecklist) {
      return {
        allowed: false,
        message: 'AI Checklist generation requires a STARTER or PRO plan.',
      };
    }
    if (feature === 'doc_assistance' && !limit.allowAiDocAssistance) {
      return {
        allowed: false,
        message: 'AI Document Intelligence requires a PRO plan.',
      };
    }
    return { allowed: true };
  },
};
