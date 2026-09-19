import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface GeneratedChecklistItem {
  name: string;
  description: string;
  required: boolean;
}

export interface GeneratedChecklist {
  template_name: string;
  frequency: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  items: GeneratedChecklistItem[];
}

export interface DocumentAnalysisResult {
  detected_type: string;
  detected_period: string | null;
  readability_indicator: 'clear' | 'blurry' | 'truncated' | 'unknown';
  potential_mismatch: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export const aiService = {
  async generateChecklist(promptInput: string | Record<string, any>, workspaceId?: string): Promise<GeneratedChecklist> {
    const promptText = typeof promptInput === 'string' ? promptInput : JSON.stringify(promptInput);

    // 1. Production / Cloud Path: Call secure server-side Edge Function (Key never on client)
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.functions.invoke('generate-checklist', {
          body: { description: promptText, workspaceId },
        });

        if (!error && data?.success && data.data?.template_name) {
          return data.data;
        }

        const errMsg = data?.error || error?.message || 'Failed to generate checklist via Gemini Edge Function.';
        throw new Error(errMsg);
      } catch (err: any) {
        // Re-throw genuine server/validation errors so UI displays honest failure
        throw new Error(err.message || 'Unable to reach generate-checklist Edge Function.');
      }
    }

    // 2. Local Heuristic Rule-Based Fallback (Offline Development Only)
    return this.generateHeuristicChecklist(promptText);
  },

  // Local Rule-Based Heuristic Fallback for offline development
  generateHeuristicChecklist(promptText: string): GeneratedChecklist {

    // High-fidelity structured fallback based on prompt keywords
    const lower = promptText.toLowerCase();
    let template_name = 'Custom Client Checklist';
    let frequency: 'monthly' | 'quarterly' | 'yearly' | 'custom' = 'monthly';
    const items: GeneratedChecklistItem[] = [];

    if (lower.includes('retail') || lower.includes('shop') || lower.includes('store')) {
      template_name = 'Retail & E-commerce Monthly Checklist';
      items.push(
        { name: 'POS Monthly Settlement Report', description: 'Point of Sale (Square, Clover, or Shopify) end of month register summary', required: true },
        { name: 'Business Bank Statement', description: 'Checking account PDF covering entire monthly cycle', required: true },
        { name: 'Wholesale Supplier Invoices', description: 'Major inventory stock purchase receipts and bills', required: false },
        { name: 'Sales Tax Return & Receipts', description: 'Monthly or quarterly state sales tax remittance proof', required: true },
        { name: 'Payroll Register', description: 'Staff wages, overtime, and tax withholdings', required: true }
      );
    } else if (lower.includes('tax') || lower.includes('year') || lower.includes('annual')) {
      template_name = 'Year-End Statutory Tax Package';
      frequency = 'yearly';
      items.push(
        { name: 'Year-End Bank & Loan Certificates', description: 'Official balance statements as of December 31', required: true },
        { name: 'Fixed Asset Additions / Disposals', description: 'Invoices for machinery, computers, or vehicles acquired this tax year', required: true },
        { name: 'W-2 and 1099 Forms Filed', description: 'Annual copies of wage and non-employee compensation filings', required: true },
        { name: 'Health & Benefit Payment Logs', description: 'Owner and employee health insurance premiums paid', required: false }
      );
    } else {
      template_name = 'Monthly Bookkeeping Standard';
      items.push(
        { name: 'Primary Bank Statement', description: 'All pages of monthly operating checking account', required: true },
        { name: 'Corporate Credit Card Statements', description: 'Monthly statements for all issued employee cardholders', required: true },
        { name: 'Revenue / Invoicing Register', description: 'Accounts receivable ledger or customer billing report', required: true },
        { name: 'Vendor Bills & Receipts (> $75)', description: 'Major business expense receipts and purchase orders', required: false },
        { name: 'Payroll Summary Register', description: 'Monthly payroll deductions and tax summary', required: true }
      );
    }

    return {
      template_name,
      frequency,
      items,
    };
  },

  analyzeDocument(requestedItemName: string, filename: string, requestPeriod?: string): DocumentAnalysisResult {
    const lowerReq = requestedItemName.toLowerCase();
    const lowerFile = filename.toLowerCase();
    const periodContext = (requestPeriod || '').toLowerCase();

    // Detect file type
    let detected_type = 'Unclassified Document';
    if (lowerFile.includes('statement') || lowerFile.includes('stmt') || lowerFile.includes('bank')) {
      detected_type = 'Bank Statement';
    } else if (lowerFile.includes('tax') || lowerFile.includes('1099') || lowerFile.includes('w2') || lowerFile.includes('gst')) {
      detected_type = 'Tax Document / Return';
    } else if (lowerFile.includes('payroll') || lowerFile.includes('wage') || lowerFile.includes('salary')) {
      detected_type = 'Payroll Register';
    } else if (lowerFile.includes('invoice') || lowerFile.includes('bill') || lowerFile.includes('receipt')) {
      detected_type = 'Vendor Invoice / Receipt';
    } else if (lowerFile.includes('sales') || lowerFile.includes('pos') || lowerFile.includes('ledger')) {
      detected_type = 'Sales Ledger';
    }

    // Detect period
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    let detected_period: string | null = null;
    const yearMatch = lowerFile.match(/(202\d)/);
    for (const m of months) {
      if (lowerFile.includes(m)) {
        const monthCap = m.charAt(0).toUpperCase() + m.slice(1);
        detected_period = yearMatch ? `${monthCap} ${yearMatch[1]}` : monthCap;
        break;
      }
    }

    // Check potential mismatch
    let potential_mismatch: string | null = null;
    if (lowerReq.includes('bank') && !lowerFile.includes('bank') && !lowerFile.includes('stmt') && !lowerFile.includes('statement')) {
      potential_mismatch = 'Uploaded file name does not resemble a bank statement.';
    } else if (detected_period) {
      const monthOnly = detected_period.split(' ')[0].toLowerCase();
      const targetMonthInContext = months.find((m) => lowerReq.includes(m) || periodContext.includes(m));
      if (targetMonthInContext && targetMonthInContext !== monthOnly) {
        potential_mismatch = `File references period "${detected_period}", but cycle requests "${targetMonthInContext}".`;
      }
    }

    return {
      detected_type,
      detected_period,
      readability_indicator: 'clear',
      potential_mismatch,
      confidence: potential_mismatch ? 'medium' : 'high',
    };
  },
};
