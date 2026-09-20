import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { requestService } from '../../services/requests';
import { documentService } from '../../services/documents';
import { aiService, type DocumentAnalysisResult } from '../../services/ai';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';

export const DocumentReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentWorkspace } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<any | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<DocumentAnalysisResult | null>(null);

  // Reject Modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!currentWorkspace?.id || !id) return;
      setLoading(true);
      try {
        const req = await requestService.getRequestDetails(currentWorkspace.id, id);
        if (req) {
          setRequest(req);
          const firstUploaded = req.items.find((i) => i.status === 'uploaded' || (i as any).file_name) || req.items[0];
          setSelectedItem(firstUploaded);
          if (firstUploaded) {
            const analysis = aiService.analyzeDocument(firstUploaded.name, (firstUploaded as any).file_name || firstUploaded.name);
            setAiAnalysis(analysis);
          }
        }
      } catch (err) {
        console.error('Failed to load document review', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentWorkspace?.id, id]);

  const handleSelectItem = (item: any) => {
    setSelectedItem(item);
    const analysis = aiService.analyzeDocument(item.name, (item as any).file_name || item.name);
    setAiAnalysis(analysis);
  };

  const handleApprove = async () => {
    if (!currentWorkspace?.id || !request || !selectedItem) return;
    setIsSubmitting(true);
    try {
      const res = await documentService.reviewDocument({
        workspaceId: currentWorkspace.id,
        requestId: request.id,
        requestItemId: selectedItem.id,
        itemName: selectedItem.name,
        action: 'approve',
        clientName: (request as any).client_name || request.client?.name,
      });

      if (res.isReady) {
        alert('🎉 All required documents have been approved! Request cycle marked READY.');
      }

      // Reload
      const updated = await requestService.getRequestDetails(currentWorkspace.id, request.id);
      setRequest(updated);
      const nextItem = updated?.items.find((i) => i.id === selectedItem.id);
      setSelectedItem(nextItem);
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id || !request || !selectedItem) return;
    if (!rejectionReason.trim()) {
      alert('Please specify why this document is rejected.');
      return;
    }

    setIsSubmitting(true);
    try {
      await documentService.reviewDocument({
        workspaceId: currentWorkspace.id,
        requestId: request.id,
        requestItemId: selectedItem.id,
        itemName: selectedItem.name,
        action: 'reject',
        rejectionReason,
        clientName: (request as any).client_name || request.client?.name,
      });

      setIsRejectModalOpen(false);
      setRejectionReason('');

      // Reload
      const updated = await requestService.getRequestDetails(currentWorkspace.id, request.id);
      setRequest(updated);
      const nextItem = updated?.items.find((i) => i.id === selectedItem.id);
      setSelectedItem(nextItem);
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="material-symbols-outlined text-[32px] text-primary-container animate-spin mb-2">
          progress_activity
        </span>
        <p className="text-xs text-slate-500">Loading document review pane...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-bold text-slate-900">Request not found</h2>
        <Button variant="secondary" size="sm" onClick={() => navigate('/documents')} className="mt-4">
          Return to Documents
        </Button>
      </div>
    );
  }

  const handleOpenOriginal = async () => {
    const storagePath =
      selectedItem?.current_document?.storage_path ||
      (selectedItem as any)?.storage_path ||
      (currentWorkspace?.id && request?.client_id && request?.id && selectedItem?.id
        ? `${currentWorkspace.id}/${request.client_id}/${request.id}/${selectedItem.id}/${(selectedItem as any).file_name || 'document'}`
        : null);

    if (!storagePath) {
      alert('No uploaded document file available for this requirement.');
      return;
    }

    setIsSubmitting(true);
    try {
      const signedUrl = await documentService.getSignedDocumentUrl(storagePath, 3600);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      alert(err.message || 'Failed to generate secure signed URL for document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/requests/${request.id}`)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Document Review: {request.title}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Client: {(request as any).client_name || request.client?.name} • Period: {request.period}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={selectedItem?.status}>{selectedItem?.status?.toUpperCase()}</Badge>
        </div>
      </div>

      {/* Dual Pane Layout (Stitch Compliant) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Item Selector & Document Viewer Preview (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Item Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {request.items.map((item: any) => (
              <button
                key={item.id}
                onClick={() => handleSelectItem(item)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 border ${
                  selectedItem?.id === item.id
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-primary-container dark:text-sky-400 border-blue-200 dark:border-blue-800 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>{item.name}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    item.status === 'approved'
                      ? 'bg-emerald-500'
                      : item.status === 'rejected'
                      ? 'bg-rose-500'
                      : item.status === 'uploaded'
                      ? 'bg-blue-500'
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Document Preview Canvas */}
          <Card elevation="low" className="p-0 overflow-hidden min-h-[480px] flex flex-col bg-slate-900 text-white">
            <div className="px-4 py-2.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-300 truncate">
                {(selectedItem as any)?.file_name || `${selectedItem?.name}.pdf`}
              </span>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="material-symbols-outlined text-[16px] cursor-pointer hover:text-white">zoom_in</span>
                <span className="material-symbols-outlined text-[16px] cursor-pointer hover:text-white">zoom_out</span>
                <span className="material-symbols-outlined text-[16px] cursor-pointer hover:text-white">download</span>
              </div>
            </div>

            {/* Document Render Body */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950/60">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[36px] text-white/70">picture_as_pdf</span>
              </div>
              <h4 className="font-semibold text-sm text-white">{selectedItem?.name}</h4>
              <p className="text-xs text-white/50 max-w-sm mt-1 mb-4">
                256-bit encrypted preview. Uploaded by client for {request.period} bookkeeping cycle.
              </p>
              <Button
                variant="secondary"
                size="sm"
                icon="open_in_new"
                onClick={handleOpenOriginal}
              >
                Open Original in Full Window
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: AI Document Assistance & Review Action (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* AI Intelligence Card */}
          <Card elevation="low" className="p-5 flex flex-col gap-3 bg-blue-50/30 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container dark:text-sky-400 text-[20px]">psychology</span>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">DocChase AI Document Intelligence</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Heuristic & Gemini assistant scan. AI does <strong>not</strong> auto-approve documents.
            </p>

            {aiAnalysis && (
              <div className="mt-2 flex flex-col gap-2.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Likely Document Type:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{aiAnalysis.detected_type}</strong>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Detected Period / Month:</span>
                  <strong className="text-slate-800 dark:text-slate-200">{aiAnalysis.detected_period || 'Not explicitly stated'}</strong>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Legibility / Quality:</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 capitalize">{aiAnalysis.readability_indicator}</span>
                </div>

                {aiAnalysis.potential_mismatch && (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded text-xs text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">
                      warning
                    </span>
                    <span>{aiAnalysis.potential_mismatch}</span>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Review Decision Panel */}
          <Card elevation="low" className="p-5 flex flex-col gap-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Accountant Review Decision</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Once approved, this item will no longer be targeted by reminders. If all required items are approved,
              the request cycle will become <strong>Ready</strong>.
            </p>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="destructive"
                size="md"
                fullWidth
                icon="cancel"
                onClick={() => setIsRejectModalOpen(true)}
              >
                Reject with Reason
              </Button>
              <Button
                variant="primary"
                size="md"
                fullWidth
                icon="check_circle"
                isLoading={isSubmitting}
                onClick={handleApprove}
              >
                Approve Document
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title={`Reject "${selectedItem?.name}"`}
        description="Your client will see this exact message on their portal and receive a replacement upload notice."
      >
        <form onSubmit={handleConfirmReject} className="flex flex-col gap-4">
          <Input
            label="Rejection Reason"
            required
            placeholder="e.g. Wrong month — please upload September statement."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
            <Button variant="secondary" size="md" type="button" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="md" type="submit" isLoading={isSubmitting} icon="cancel">
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
