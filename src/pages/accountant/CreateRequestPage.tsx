import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { clientService } from '../../services/clients';
import { templateService } from '../../services/templates';
import { requestService } from '../../services/requests';
import { emailService } from '../../services/email';
import type { ClientWithRequests, TemplateWithItems } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const CreateRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClientId = searchParams.get('client_id');
  const { currentWorkspace } = useAuth();

  const [clients, setClients] = useState<ClientWithRequests[]>([]);
  const [templates, setTemplates] = useState<TemplateWithItems[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(preselectedClientId || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [title, setTitle] = useState('Monthly Bookkeeping Documents');
  const [period, setPeriod] = useState('September 2026');
  const [dueDate, setDueDate] = useState('2026-10-05');
  const [items, setItems] = useState<Array<{ name: string; description?: string; required: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success modal with shareable link
  const [createdRequestLink, setCreatedRequestLink] = useState<string | null>(null);
  const [emailDeliveryMessage, setEmailDeliveryMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!currentWorkspace?.id) return;
      setLoading(true);
      try {
        const [cList, tList] = await Promise.all([
          clientService.getClients(currentWorkspace.id),
          templateService.getTemplates(currentWorkspace.id),
        ]);
        setClients(cList);
        setTemplates(tList);

        if (!selectedClientId && cList.length > 0) {
          setSelectedClientId(cList[0].id);
        }

        if (tList.length > 0) {
          setSelectedTemplateId(tList[0].id);
          setItems(tList[0].items.map((i) => ({ name: i.name, description: i.description || undefined, required: i.required })));
        }
      } catch (err) {
        console.error('Failed to load request setup data', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [currentWorkspace?.id]);

  const handleTemplateChange = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const found = templates.find((t) => t.id === tplId);
    if (found) {
      setTitle(`${found.name} Documents`);
      setItems(found.items.map((i) => ({ name: i.name, description: i.description || undefined, required: i.required })));
    }
  };

  const handleAddItem = () => {
    setItems([...items, { name: '', description: '', required: true }]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id) return;
    setError(null);

    const client = clients.find((c) => c.id === selectedClientId);
    if (!client) {
      setError('Please select or add a client.');
      return;
    }

    const validItems = items.filter((i) => i.name.trim() !== '');
    if (validItems.length === 0) {
      setError('Please include at least one document requirement in this request.');
      return;
    }

    setSubmitting(true);
    try {
      const { request, rawToken } = await requestService.createRequest(
        currentWorkspace.id,
        currentWorkspace.plan,
        {
          clientId: client.id,
          clientName: client.company_name || client.name,
          templateId: selectedTemplateId || undefined,
          title,
          period,
          dueDate,
          items: validItems,
        }
      );

      const portalUrl = `${window.location.origin}/request/${rawToken}`;
      setCreatedRequestLink(portalUrl);

      // Attempt transactional email dispatch via Resend Edge Function
      try {
        const emailRes = await emailService.sendInitialRequestEmail({
          workspaceId: currentWorkspace.id,
          requestId: request.id,
          clientPortalUrl: portalUrl,
        });

        if (emailRes.success) {
          setEmailDeliveryMessage(`Invitation email sent to ${client.email} via Resend.`);
        } else if (emailRes.configured === false) {
          setEmailDeliveryMessage('Request link ready (email delivery pending RESEND_API_KEY configuration).');
        } else if (emailRes.error) {
          setEmailDeliveryMessage(`Email notice: ${emailRes.error}`);
        }
      } catch (emailErr: any) {
        console.warn('Initial email dispatch error:', emailErr);
        setEmailDeliveryMessage('Request link ready (email delivery pending configuration).');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch request.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (!createdRequestLink) return;
    navigator.clipboard.writeText(createdRequestLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="material-symbols-outlined text-[32px] text-primary-container animate-spin mb-2">
          progress_activity
        </span>
        <p className="text-xs text-slate-500">Preparing request wizard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Document Request</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Snapshot a template, set client deadlines, and generate a secure upload link.
          </p>
        </div>
      </div>

      {createdRequestLink ? (
        <Card padding="lg" elevation="low" className="p-8 text-center bg-emerald-50/50 border-emerald-200 animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-[28px]">mark_email_read</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Request Dispatched & Ready!</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 mb-4">
            Your client can access their private document portal immediately via this secure link. No login or password required for the client.
          </p>

          {emailDeliveryMessage && (
            <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center justify-center gap-2 max-w-lg mx-auto">
              <span className="material-symbols-outlined text-[16px] text-blue-600">mail</span>
              <span>{emailDeliveryMessage}</span>
            </div>
          )}

          <div className="flex items-center gap-2 max-w-lg mx-auto bg-white p-2 rounded-xl border border-slate-200">
            <input
              type="text"
              readOnly
              value={createdRequestLink}
              className="flex-1 text-xs text-slate-700 bg-transparent outline-none px-2 select-all font-mono"
            />
            <Button variant="primary" size="sm" icon={copied ? 'done' : 'content_copy'} onClick={copyToClipboard}>
              {copied ? 'Copied' : 'Copy Link'}
            </Button>
          </div>

          <div className="flex justify-center gap-3 mt-6">
            <Button variant="secondary" size="md" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
            <Button variant="primary" size="md" onClick={() => window.open(createdRequestLink, '_blank')}>
              Open Client Portal
            </Button>
          </div>
        </Card>
      ) : (
        <Card padding="lg" elevation="low">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-rose-600">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Client Picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Target Client</label>
                {clients.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-between">
                    <span>No clients available.</span>
                    <Button variant="ghost" size="sm" type="button" onClick={() => navigate('/clients')}>
                      + Add Client First
                    </Button>
                  </div>
                ) : (
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:border-primary-container outline-none"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name || c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Template Picker */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Checklist Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-900 focus:border-primary-container outline-none"
                >
                  <option value="">Custom Checklist (No template)</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.frequency})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              label="Request Title"
              required
              placeholder="e.g. Monthly Bookkeeping Documents"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Billing / Reconciliation Period"
                required
                placeholder="e.g. September 2026"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />

              <Input
                label="Due Date"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            {/* Checklist items to be snapshotted */}
            <div className="mt-2 flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Document Requirements ({items.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-xs font-semibold text-primary-container hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span> Add Item
                </button>
              </div>

              {items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    required
                    placeholder="Document Name"
                    value={it.name}
                    onChange={(e) => {
                      const copy = [...items];
                      copy[idx].name = e.target.value;
                      setItems(copy);
                    }}
                    className="flex-1 h-8 px-2.5 rounded border border-slate-300 text-xs bg-white"
                  />
                  <label className="flex items-center gap-1 text-xs text-slate-600 select-none px-2">
                    <input
                      type="checkbox"
                      checked={it.required}
                      onChange={(e) => {
                        const copy = [...items];
                        copy[idx].required = e.target.checked;
                        setItems(copy);
                      }}
                      className="rounded text-primary-container"
                    />
                    <span>Required</span>
                  </label>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="secondary" size="md" type="button" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" isLoading={submitting} icon="send">
                Dispatch Request
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};
