import React, { useState } from 'react';
import { aiService, type GeneratedChecklist } from '../../services/ai';
import { templateService } from '../../services/templates';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

interface AiChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateCreated?: () => void;
}

export const AiChecklistModal: React.FC<AiChecklistModalProps> = ({
  isOpen,
  onClose,
  onTemplateCreated,
}) => {
  const { currentWorkspace } = useAuth();
  const [prompt, setPrompt] = useState('Monthly bookkeeping documents for a small retail shop with inventory and 4 employees');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedChecklist | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const result = await aiService.generateChecklist(prompt, currentWorkspace?.id);
      setGenerated(result);
    } catch (err: any) {
      setError(err.message || 'Failed to generate checklist');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!currentWorkspace?.id || !generated) return;
    setIsSaving(true);
    try {
      await templateService.createTemplate(
        currentWorkspace.id,
        {
          name: generated.template_name,
          description: `AI-generated template: ${prompt}`,
          frequency: generated.frequency,
        },
        generated.items
      );
      if (onTemplateCreated) onTemplateCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleItemRequired = (idx: number) => {
    if (!generated) return;
    const updated = { ...generated };
    updated.items[idx].required = !updated.items[idx].required;
    setGenerated(updated);
  };

  const removeItem = (idx: number) => {
    if (!generated) return;
    const updated = { ...generated };
    updated.items = updated.items.filter((_, i) => i !== idx);
    setGenerated(updated);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Checklist Generator"
      description="Powered by Gemini: Describe your client's industry or business model to generate tailored document requirements."
      maxWidth="lg"
    >
      <div className="flex flex-col gap-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-rose-600">error</span>
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">
            Describe the Client & Engagement:
          </label>
          <textarea
            className="w-full h-20 p-3 rounded-lg border border-slate-300 text-xs text-slate-800 focus:border-primary-container focus:ring-2 focus:ring-primary-container/15 outline-none resize-none"
            placeholder="e.g. Quarterly GST and payroll filings for a logistics firm with 15 contracted drivers."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Accountant review is mandatory before saving. AI suggestions are non-binding.
          </span>
          <Button
            variant="primary"
            size="sm"
            icon="auto_awesome"
            isLoading={isGenerating}
            onClick={handleGenerate}
          >
            Generate Checklist
          </Button>
        </div>

        {/* Generated Preview */}
        {generated && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <Input
                label="Template Name"
                value={generated.template_name}
                onChange={(e) => setGenerated({ ...generated, template_name: e.target.value })}
              />
              <span className="text-xs font-semibold text-primary-container bg-blue-50 border border-blue-200 px-2 py-1 rounded ml-3 self-end mb-1">
                {generated.frequency.toUpperCase()}
              </span>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Proposed Document Requirements ({generated.items.length})
              </span>

              {generated.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-3 p-3 bg-white rounded-lg border border-slate-200 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{item.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleItemRequired(idx)}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                          item.required
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.required ? 'REQUIRED' : 'OPTIONAL'}
                      </button>
                    </div>
                    <p className="text-slate-500 mt-0.5">{item.description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded"
                    title="Remove item"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-200">
              <Button variant="secondary" size="sm" onClick={() => setGenerated(null)}>
                Discard
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon="save"
                isLoading={isSaving}
                onClick={handleSaveAsTemplate}
              >
                Save as Reusable Template
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
