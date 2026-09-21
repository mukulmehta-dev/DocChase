import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { templateService } from '../../services/templates';
import type { TemplateWithItems } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { AiChecklistModal } from './AiChecklistModal';

export const TemplatesPage: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const [templates, setTemplates] = useState<TemplateWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // New manual template form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly' | 'yearly' | 'custom'>('monthly');
  const [items, setItems] = useState<Array<{ name: string; description: string; required: boolean }>>([
    { name: 'Bank Statement', description: 'Checking/Savings accounts', required: true },
    { name: 'Credit Card Statement', description: 'Monthly business credit cards', required: true },
  ]);

  const loadTemplates = async () => {
    if (!currentWorkspace?.id) return;
    setLoading(true);
    try {
      const data = await templateService.getTemplates(currentWorkspace.id);
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [currentWorkspace?.id]);

  const handleAddItemSlot = () => {
    setItems([...items, { name: '', description: '', required: true }]);
  };

  const handleRemoveItemSlot = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id) return;
    const validItems = items.filter((i) => i.name.trim() !== '');
    if (validItems.length === 0) {
      alert('Please include at least one document requirement.');
      return;
    }

    await templateService.createTemplate(
      currentWorkspace.id,
      { name, description, frequency },
      validItems
    );

    setIsNewModalOpen(false);
    setName('');
    setDescription('');
    setItems([
      { name: 'Bank Statement', description: 'Checking/Savings accounts', required: true },
      { name: 'Credit Card Statement', description: 'Monthly business credit cards', required: true },
    ]);
    await loadTemplates();
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Recurring Templates</h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Standard checklists copied automatically whenever you dispatch document requests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon="auto_awesome"
            onClick={() => setIsAiModalOpen(true)}
          >
            AI Generator
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon="add"
            onClick={() => setIsNewModalOpen(true)}
          >
            New Template
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-[32px] text-neutral-900 dark:text-white animate-spin mb-2">
            progress_activity
          </span>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading templates...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {templates.map((tpl) => (
            <Card key={tpl.id} elevation="low" className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-base text-neutral-900 dark:text-neutral-100">{tpl.name}</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{tpl.description}</p>
                  </div>
                  <Badge variant="neutral">{tpl.frequency?.toUpperCase()}</Badge>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                    Required Document Slots ({tpl.items?.length || 0}):
                  </span>
                  <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                    {(tpl.items || []).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-700 dark:text-neutral-200"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="material-symbols-outlined text-[15px] text-neutral-400">
                            description
                          </span>
                          <span className="truncate">{item.name}</span>
                        </div>
                        {item.required ? (
                          <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200/50 dark:border-rose-900/50">
                            Required
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-400">Optional</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                <span>{(tpl.items || []).length} Document Slots</span>
                <span className="text-[11px] text-neutral-400 dark:text-neutral-500">Immutable snapshot on request</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Manual Template Modal */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Create Recurring Template"
        description="Design a reusable checklist for your firm's recurring engagements."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateTemplate} className="flex flex-col gap-4">
          <Input
            label="Template Title"
            required
            placeholder="e.g. Monthly Payroll Documents"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Description"
            placeholder="e.g. Collection checklist for monthly payroll client filings."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div>
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">Cadence / Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as any)}
              className="w-full h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-800 text-xs bg-white dark:bg-[#121215] text-neutral-800 dark:text-neutral-100 focus:border-neutral-900 dark:focus:border-white focus:ring-1 focus:ring-neutral-900/15 dark:focus:ring-white/20 outline-none"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom / One-Time</option>
            </select>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Document Requirement Slots</span>
              <button
                type="button"
                onClick={handleAddItemSlot}
                className="text-xs font-semibold text-neutral-900 dark:text-white hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">add</span> Add Slot
              </button>
            </div>

            {items.map((it, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Document Name (e.g. Bank Statement)"
                  value={it.name}
                  onChange={(e) => {
                    const copy = [...items];
                    copy[idx].name = e.target.value;
                    setItems(copy);
                  }}
                  className="flex-1 h-9 px-3 rounded-lg border border-neutral-300 dark:border-neutral-800 text-xs bg-white dark:bg-[#121215] text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-white focus:ring-1 focus:ring-neutral-900/15 dark:focus:ring-white/20"
                />
                <label className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300 select-none">
                  <input
                    type="checkbox"
                    checked={it.required}
                    onChange={(e) => {
                      const copy = [...items];
                      copy[idx].required = e.target.checked;
                      setItems(copy);
                    }}
                    className="rounded accent-neutral-900 dark:accent-white cursor-pointer"
                  />
                  <span>Req</span>
                </label>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItemSlot(idx)}
                    className="p-1 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800 mt-2">
            <Button variant="secondary" size="md" type="button" onClick={() => setIsNewModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" icon="check">
              Create Template
            </Button>
          </div>
        </form>
      </Modal>

      {/* AI Checklist Modal */}
      <AiChecklistModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onTemplateCreated={loadTemplates}
      />
    </div>
  );
};
