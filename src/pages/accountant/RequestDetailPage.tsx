import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { requestService } from '../../services/requests';
import { documentService } from '../../services/documents';
import { reminderService } from '../../services/reminders';
import type { RequestDetail, RequestItemWithDoc } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';

export const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentWorkspace } = useAuth();
  const navigate = useNavigate();

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isReminding, setIsReminding] = useState(false);

  // Reject Modal State
  const [rejectingItem, setRejectingItem] = useState<RequestItemWithDoc | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const loadDetails = async () => {
    if (!currentWorkspace?.id || !id) return;
    setLoading(true);
    try {
      const data = await requestService.getRequestDetails(currentWorkspace.id, id);
      setRequest(data);
    } catch (err) {
      console.error('Failed to load request details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [currentWorkspace?.id, id]);

  const clientPortalUrl = request
    ? `${window.location.origin}/request/${(request as any).access_token || (request as any).access_token_hash?.slice(0, 16)}`
    : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(clientPortalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApprove = async (item: RequestItemWithDoc) => {
    if (!currentWorkspace?.id || !request) return;
    try {
      const res = await documentService.reviewDocument({
        workspaceId: currentWorkspace.id,
        requestId: request.id,
        requestItemId: item.id,
        itemName: item.name,
        action: 'approve',
        clientName: (request as any).client_name || request.client?.name,
      });

      if (res.isReady) {
        alert('🎉 All required documents are now approved! This request cycle is officially READY.');
      }
      await loadDetails();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id || !request || !rejectingItem) return;
    if (!rejectionReason.trim()) {
      alert('Please provide a specific rejection reason so the client knows how to correct it.');
      return;
    }

    setIsRejecting(true);
    try {
      await documentService.reviewDocument({
        workspaceId: currentWorkspace.id,
        requestId: request.id,
        requestItemId: rejectingItem.id,
        itemName: rejectingItem.name,
        action: 'reject',
        rejectionReason,
        clientName: (request as any).client_name || request.client?.name,
        clientPortalUrl,
      });

      setRejectingItem(null);
      setRejectionReason('');
      await loadDetails();
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleSendReminder = async () => {
    if (!currentWorkspace?.id || !request) return;
    const missingOrRejected = request.items
      .filter((i) => i.status === 'missing' || i.status === 'rejected')
      .map((i) => i.name);

    if (missingOrRejected.length === 0) {
      alert('All documents have already been uploaded or approved! No reminder needed.');
      return;
    }

    setIsReminding(true);
    try {
      const res = await reminderService.sendSmartReminder({
        workspaceId: currentWorkspace.id,
        requestId: request.id,
        clientName: (request as any).client_name || request.client?.name || 'Client',
        clientEmail: request.client?.email || 'client@example.com',
        requestTitle: request.title,
        dueDate: request.due_date,
        outstandingItems: missingOrRejected,
        clientPortalUrl,
      });

      alert(res.message);
    } finally {
      setIsReminding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="material-symbols-outlined text-[32px] text-neutral-900 dark:text-white animate-spin mb-2">
          progress_activity
        </span>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading collection request details...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Request not found</h2>
        <Button variant="secondary" size="sm" onClick={() => navigate('/requests')} className="mt-4">
          Return to Requests
        </Button>
      </div>
    );
  }

  const items = request.items || [];
  const approvedCount = items.filter((i) => i.status === 'approved').length;
  const requiredCount = items.filter((i) => i.required).length;
  const isReady = request.status === 'ready';

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/requests')}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{request.title}</h1>
              <Badge variant={request.status}>{request.status?.toUpperCase()}</Badge>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Client: <strong className="text-neutral-700 dark:text-neutral-200">{(request as any).client_name || request.client?.name}</strong> • Period: {request.period} • Due: {request.due_date}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isReady && (
            <Button
              variant="primary"
              size="sm"
              icon="notifications_active"
              isLoading={isReminding}
              onClick={handleSendReminder}
            >
              Send Smart Reminder
            </Button>
          )}
        </div>
      </div>

      {/* Shareable Client Link Bar */}
      <Card padding="md" elevation="low" className="bg-neutral-50 dark:bg-[#121215] border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="material-symbols-outlined text-[18px] text-neutral-900 dark:text-white">lock</span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">Client Secure Upload Link:</span>
            <span className="font-mono text-[11px] text-neutral-600 dark:text-neutral-400 truncate max-w-xs sm:max-w-md">
              {clientPortalUrl}
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button variant="secondary" size="sm" icon={copied ? 'done' : 'content_copy'} onClick={handleCopyLink}>
              {copied ? 'Copied' : 'Copy Link'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon="open_in_new"
              onClick={() => window.open(clientPortalUrl, '_blank')}
            >
              Preview
            </Button>
          </div>
        </div>
      </Card>

      {/* Progress Metric Bar */}
      <Card padding="md" elevation="low">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-neutral-700 dark:text-neutral-300">Readiness Verification</span>
          <span className="font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
            {approvedCount} of {items.length} Approved ({requiredCount} Required)
          </span>
        </div>
        <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isReady ? 'bg-emerald-500' : 'bg-neutral-900 dark:bg-white'
            }`}
            style={{ width: `${items.length > 0 ? (approvedCount / items.length) * 100 : 0}%` }}
          />
        </div>
      </Card>

      {/* Checklist Items Breakdown */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
          Requested Document Items ({items.length})
        </h2>

        {items.map((item) => (
          <Card key={item.id} elevation="low" className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">{item.name}</span>
                {item.required ? (
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200/50 dark:border-rose-900/50">
                    Required
                  </span>
                ) : (
                  <span className="text-[10px] text-neutral-400">Optional</span>
                )}
                <Badge variant={item.status}>{item.status.toUpperCase()}</Badge>
              </div>
              {item.description && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{item.description}</p>
              )}

              {/* Document metadata or rejection note */}
              {(item as any).file_name && (
                <div className="mt-2 text-[11px] text-neutral-600 dark:text-neutral-300 flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-900 px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800 w-fit">
                  <span className="material-symbols-outlined text-[14px]">description</span>
                  <span>Uploaded: {(item as any).file_name}</span>
                </div>
              )}

              {item.status === 'rejected' && item.rejection_reason && (
                <div className="mt-2 text-xs text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 p-2 rounded border border-rose-200 dark:border-rose-900/50">
                  <strong>Rejection Note:</strong> {item.rejection_reason}
                </div>
              )}
            </div>

            {/* Actions for this item */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              {item.status !== 'approved' && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon="cancel"
                    onClick={() => {
                      setRejectingItem(item);
                      setRejectionReason('');
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon="check"
                    onClick={() => handleApprove(item)}
                  >
                    Approve
                  </Button>
                </>
              )}

              {item.status === 'approved' && (
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600 dark:text-emerald-400">verified</span>
                  Approved
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={Boolean(rejectingItem)}
        onClose={() => setRejectingItem(null)}
        title={`Reject "${rejectingItem?.name}"`}
        description="Provide a specific reason so your client understands why this file cannot be accepted."
      >
        <form onSubmit={handleConfirmReject} className="flex flex-col gap-4">
          <Input
            label="Rejection Reason"
            required
            placeholder="e.g. Wrong month — please upload statement covering September."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            helperText="The client will see this note directly on their upload portal."
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800 mt-2">
            <Button variant="secondary" size="md" type="button" onClick={() => setRejectingItem(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="md" type="submit" isLoading={isRejecting} icon="cancel">
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
