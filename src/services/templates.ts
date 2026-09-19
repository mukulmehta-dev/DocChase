import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { TemplateWithItems, TemplateItem, TemplateFrequency } from '../types';

export const templateService = {
  async getTemplates(workspaceId: string): Promise<TemplateWithItems[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('templates')
        .select(`
          *,
          items:template_items(*)
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        items: (t.items || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      }));
    }

    const key = `docchase_templates_${workspaceId}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      // Default starter templates if empty
      const defaultTemplates: TemplateWithItems[] = [
        {
          id: 'tpl_monthly_bookkeeping',
          workspace_id: workspaceId,
          name: 'Monthly Bookkeeping',
          description: 'Standard monthly recurring checklist for small businesses and retail shops.',
          frequency: 'monthly',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items: [
            { id: 'ti_1', template_id: 'tpl_monthly_bookkeeping', name: 'Bank Statement', description: 'Checking/Savings accounts for the period (PDF)', required: true, sort_order: 1, created_at: new Date().toISOString() },
            { id: 'ti_2', template_id: 'tpl_monthly_bookkeeping', name: 'Credit Card Statement', description: 'Business credit card statements for all cards', required: true, sort_order: 2, created_at: new Date().toISOString() },
            { id: 'ti_3', template_id: 'tpl_monthly_bookkeeping', name: 'Sales Ledger / POS Summary', description: 'Monthly revenue, invoices, or POS summary', required: true, sort_order: 3, created_at: new Date().toISOString() },
            { id: 'ti_4', template_id: 'tpl_monthly_bookkeeping', name: 'Expense Receipts (> $75)', description: 'Major vendor bills, hardware, and office receipts', required: false, sort_order: 4, created_at: new Date().toISOString() },
            { id: 'ti_5', template_id: 'tpl_monthly_bookkeeping', name: 'Payroll Register / Taxes', description: 'Monthly payroll tax filings and deductions', required: true, sort_order: 5, created_at: new Date().toISOString() },
          ],
        },
        {
          id: 'tpl_tax_filing',
          workspace_id: workspaceId,
          name: 'Annual Tax Documents',
          description: 'Comprehensive year-end statutory review checklist.',
          frequency: 'yearly',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items: [
            { id: 'ti_t1', template_id: 'tpl_tax_filing', name: 'Year-End Bank Reconciliation', description: 'Dec 31 balance certificate', required: true, sort_order: 1, created_at: new Date().toISOString() },
            { id: 'ti_t2', template_id: 'tpl_tax_filing', name: 'Fixed Asset Additions', description: 'Equipment purchases above capitalization threshold', required: true, sort_order: 2, created_at: new Date().toISOString() },
            { id: 'ti_t3', template_id: 'tpl_tax_filing', name: 'W-2 / 1099 Summary Forms', description: 'Employee wages and independent contractor payouts', required: true, sort_order: 3, created_at: new Date().toISOString() },
          ],
        },
      ];
      localStorage.setItem(key, JSON.stringify(defaultTemplates));
      return defaultTemplates;
    }
    return JSON.parse(raw);
  },

  async createTemplate(
    workspaceId: string,
    templateData: {
      name: string;
      description?: string;
      frequency: TemplateFrequency;
    },
    items: Array<{ name: string; description?: string; required: boolean }>
  ): Promise<TemplateWithItems> {
    if (isSupabaseConfigured()) {
      const { data: template, error: tplError } = await supabase
        .from('templates')
        .insert({
          workspace_id: workspaceId,
          name: templateData.name,
          description: templateData.description || null,
          frequency: templateData.frequency,
          is_active: true,
        })
        .select()
        .single();

      if (tplError || !template) throw tplError || new Error('Failed to create template');

      const itemInserts = items.map((item, idx) => ({
        template_id: template.id,
        name: item.name,
        description: item.description || null,
        required: item.required,
        sort_order: idx + 1,
      }));

      const { data: createdItems, error: itemsError } = await supabase
        .from('template_items')
        .insert(itemInserts)
        .select();

      if (itemsError) throw itemsError;

      return {
        ...template,
        items: createdItems || [],
      };
    }

    const tplId = 'tpl_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    const createdItems: TemplateItem[] = items.map((item, idx) => ({
      id: 'ti_' + Math.random().toString(36).substring(2, 9),
      template_id: tplId,
      name: item.name,
      description: item.description || null,
      required: item.required,
      sort_order: idx + 1,
      created_at: now,
    }));

    const newTemplate: TemplateWithItems = {
      id: tplId,
      workspace_id: workspaceId,
      name: templateData.name,
      description: templateData.description || null,
      frequency: templateData.frequency,
      is_active: true,
      created_at: now,
      updated_at: now,
      items: createdItems,
    };

    const templates = await this.getTemplates(workspaceId);
    templates.unshift(newTemplate);
    localStorage.setItem(`docchase_templates_${workspaceId}`, JSON.stringify(templates));

    return newTemplate;
  },

  async deleteTemplate(workspaceId: string, templateId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateId)
        .eq('workspace_id', workspaceId);

      if (error) throw error;
      return;
    }

    const templates = await this.getTemplates(workspaceId);
    const filtered = templates.filter((t) => t.id !== templateId);
    localStorage.setItem(`docchase_templates_${workspaceId}`, JSON.stringify(filtered));
  },
};
