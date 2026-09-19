import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { requestService } from '../../services/requests';
import { documentService } from '../../services/documents';
import { Badge } from '../../components/ui/Badge';
import type { ClientPortalData, ClientPortalItem } from '../../types';

export const ClientPortalPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [portalData, setPortalData] = useState<ClientPortalData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Uploading state
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // File input ref map
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchPortalRequest = async () => {
    setLoading(true);
    try {
      if (!token || token.length < 8) {
        setError('Invalid, expired, or revoked document request link.');
        return;
      }

      const found = await requestService.getClientRequestByToken(token);
      if (found) {
        setPortalData(found);
      } else {
        setError('Invalid, expired, or cancelled request link.');
      }
    } catch (err) {
      setError('Failed to load document request.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalRequest();
  }, [token]);

  const handleTriggerUpload = (itemId: string) => {
    const input = fileInputRefs.current[itemId];
    if (input) {
      input.click();
    }
  };

  const handleFileChange = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !portalData) return;
    const file = files[0];

    setUploadError(null);
    setUploadingItemId(itemId);
    setUploadProgress(20);

    try {
      // Simulate progress progression
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => (prev < 90 ? prev + 25 : prev));
      }, 150);

      await documentService.uploadDocument({
        workspaceId: portalData.request.workspace_id,
        clientId: portalData.request.client_id,
        requestId: portalData.request.id,
        requestItemId: itemId,
        file,
        token,
        clientName: portalData.client.name,
      });

      clearInterval(progressTimer);
      setUploadProgress(100);

      setTimeout(async () => {
        setUploadingItemId(null);
        setUploadProgress(0);
        await fetchPortalRequest();
      }, 400);
    } catch (err: any) {
      setUploadError(err.message || 'File upload failed');
      setUploadingItemId(null);
      setUploadProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4">
        <span className="material-symbols-outlined text-[36px] text-primary-container animate-spin mb-3">
          progress_activity
        </span>
        <p className="text-xs text-slate-500 font-medium">Verifying secure portal access...</p>
      </div>
    );
  }

  if (error || !portalData) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3 shadow-sm">
          <span className="material-symbols-outlined text-[28px]">link_off</span>
        </div>
        <h1 className="font-bold text-lg text-slate-900">Request Link Invalid or Revoked</h1>
        <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
          {error || 'This link may have expired or was cancelled by your accounting firm.'}
        </p>
        <p className="text-[11px] text-slate-400">
          Please contact your accountant or bookkeeper to obtain a new secure link.
        </p>
      </div>
    );
  }

  const items: ClientPortalItem[] = portalData.items || [];
  const approvedCount = items.filter((i) => i.status === 'approved').length;
  const requiredItems = items.filter((i) => i.required);
  const approvedRequiredCount = requiredItems.filter((i) => i.status === 'approved').length;
  const isComplete = requiredItems.length > 0 && approvedRequiredCount === requiredItems.length;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center py-6 sm:py-10 px-4 sm:px-6">
      <div className="w-full max-w-xl flex flex-col gap-5">
        {/* Top Firm Branding Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-primary-container" />
                <span className="text-[11px] font-bold text-primary-container uppercase tracking-wider">
                  {portalData.workspace?.name || 'DocChase Accounting'}
                </span>
              </div>
              <h1 className="font-bold text-lg sm:text-xl text-slate-900">{portalData.request.title}</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Client: <strong className="text-slate-700">{portalData.client.name}</strong> • Period: {portalData.request.period}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-[11px] font-medium text-slate-400 block">Due Date</span>
              <span className="text-xs sm:text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                {portalData.request.due_date}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="pt-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">Verification Readiness</span>
              <span className="font-bold text-slate-900 tabular-nums">
                {approvedCount} of {items.length} Approved ({Math.round((approvedCount / (items.length || 1)) * 100)}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${(approvedCount / (items.length || 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {uploadError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 animate-fade-in">
            <span className="material-symbols-outlined text-[18px] text-rose-600 flex-shrink-0">error</span>
            <span>{uploadError}</span>
          </div>
        )}

        {/* Completion State Banner (Stitch Approved Screen) */}
        {isComplete && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center shadow-sm animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
              <span className="material-symbols-outlined text-[28px]">verified</span>
            </div>
            <h2 className="font-bold text-base text-emerald-950">All Required Documents Approved!</h2>
            <p className="text-xs text-emerald-800 mt-1 max-w-sm mx-auto">
              Your accounting firm has reviewed and approved every required document for this cycle. No further action is required.
            </p>
          </div>
        )}

        {/* Document Checklist Items */}
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            Requested Documents ({items.length})
          </h2>

          {items.map((item: any) => {
            const isUploadingThis = uploadingItemId === item.id;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border p-4 sm:p-5 shadow-sm transition-all flex flex-col gap-3 ${
                  item.status === 'rejected'
                    ? 'border-rose-300 ring-2 ring-rose-100'
                    : item.status === 'approved'
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-900">{item.name}</span>
                      {item.required ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                          Required
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Optional</span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                    )}
                  </div>

                  <Badge variant={item.status}>{item.status?.toUpperCase()}</Badge>
                </div>

                {/* Rejection Alert Banner */}
                {item.status === 'rejected' && item.rejection_reason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-rose-600 flex-shrink-0 mt-0.5">
                      error
                    </span>
                    <div>
                      <span className="font-bold block">Please replace this file:</span>
                      <span>{item.rejection_reason}</span>
                    </div>
                  </div>
                )}

                {/* Upload or Re-upload Dropzone */}
                {item.status !== 'approved' && (
                  <div>
                    <input
                      type="file"
                      ref={(el) => {
                        fileInputRefs.current[item.id] = el;
                      }}
                      onChange={(e) => handleFileChange(item.id, e)}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    />

                    {isUploadingThis ? (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col gap-2 text-center">
                        <div className="flex items-center justify-between text-xs text-blue-900 font-medium">
                          <span>Uploading & encrypting file...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-container transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleTriggerUpload(item.id)}
                        className="border-2 border-dashed border-slate-200 hover:border-primary-container rounded-lg p-3 text-center transition-colors bg-slate-50/60 hover:bg-blue-50/30 cursor-pointer flex items-center justify-center gap-2 select-none"
                      >
                        <span className="material-symbols-outlined text-[18px] text-primary-container">
                          cloud_upload
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          {item.status === 'rejected'
                            ? 'Upload Replacement Document'
                            : item.status === 'uploaded'
                            ? 'Upload New Version'
                            : 'Tap to upload or browse files'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {(item.current_document?.original_filename || (item as any).file_name) && (
                  <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="material-symbols-outlined text-[15px] text-slate-400">attachment</span>
                      <strong className="truncate font-medium">
                        {item.current_document?.original_filename || (item as any).file_name}
                      </strong>
                    </span>
                    <span className="text-emerald-700 font-medium text-[11px]">
                      {item.status === 'approved' ? '✓ Verified' : 'Awaiting Review'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bank-Grade Security Footer */}
        <div className="text-center py-6 text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <span className="material-symbols-outlined text-[14px]">lock</span>
          <span>Secured with 256-bit TLS bank-level document encryption.</span>
        </div>
      </div>
    </div>
  );
};
