import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { requestService } from '../../services/requests';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

interface VaultItem {
  id: string;
  requestId: string;
  requestTitle: string;
  clientName: string;
  period: string;
  itemName: string;
  required: boolean;
  status: 'missing' | 'uploaded' | 'approved' | 'rejected';
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
  rejectionReason?: string;
}

export const DocumentsPage: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'uploaded' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadVault = async () => {
      if (!currentWorkspace?.id) return;
      setLoading(true);
      try {
        const requests = await requestService.getRequests(currentWorkspace.id);
        const allItems: VaultItem[] = [];

        for (const req of requests) {
          const details = await requestService.getRequestDetails(currentWorkspace.id, req.id);
          if (details?.items) {
            for (const it of details.items) {
              allItems.push({
                id: it.id,
                requestId: req.id,
                requestTitle: req.title,
                clientName: (req as any).client_name || req.client?.name || 'Client',
                period: req.period,
                itemName: it.name,
                required: it.required,
                status: it.status,
                fileName: (it as any).file_name,
                fileSize: (it as any).file_size,
                uploadedAt: (it as any).uploaded_at,
                rejectionReason: it.rejection_reason ?? undefined,
              });
            }
          }
        }
        setItems(allItems);
      } catch (err) {
        console.error('Failed to load document vault', err);
      } finally {
        setLoading(false);
      }
    };
    loadVault();
  }, [currentWorkspace?.id]);

  const filteredItems = items.filter((item) => {
    if (filter !== 'all' && item.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.itemName.toLowerCase().includes(q) ||
        item.clientName.toLowerCase().includes(q) ||
        item.requestTitle.toLowerCase().includes(q) ||
        item.period.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalCount = items.length;
  const pendingReviewCount = items.filter((i) => i.status === 'uploaded').length;
  const approvedCount = items.filter((i) => i.status === 'approved').length;
  const rejectedCount = items.filter((i) => i.status === 'rejected').length;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Documents Vault</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Encrypted client document repository, verification tracking, and review status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon="autorenew"
            onClick={() => window.location.reload()}
          >
            Refresh Vault
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card elevation="low" padding="md" className="flex flex-col">
          <span className="text-xs text-slate-500 font-medium">Total Tracked Items</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{totalCount}</span>
        </Card>
        <Card elevation="low" padding="md" className="flex flex-col border-blue-200 bg-blue-50/20">
          <span className="text-xs text-blue-700 font-medium">Needs Review</span>
          <span className="text-2xl font-bold text-primary-container mt-1 tabular-nums">{pendingReviewCount}</span>
        </Card>
        <Card elevation="low" padding="md" className="flex flex-col border-emerald-200 bg-emerald-50/20">
          <span className="text-xs text-emerald-700 font-medium">Approved Documents</span>
          <span className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">{approvedCount}</span>
        </Card>
        <Card elevation="low" padding="md" className="flex flex-col border-rose-200 bg-rose-50/20">
          <span className="text-xs text-rose-700 font-medium">Rejected / Replaced</span>
          <span className="text-2xl font-bold text-rose-700 mt-1 tabular-nums">{rejectedCount}</span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'all', label: 'All Items' },
              { id: 'uploaded', label: 'Needs Review' },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filter === t.id
                  ? 'bg-primary-container text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="Search documents or clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 text-xs bg-white text-slate-800 focus:border-primary-container outline-none"
          />
        </div>
      </div>

      {/* Document Items Table or Empty State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <span className="material-symbols-outlined text-[32px] text-primary-container animate-spin mb-2">
            progress_activity
          </span>
          <p className="text-xs text-slate-500">Scanning document vault...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon="folder_open"
          title="No documents matching filter"
          description="Documents uploaded by your clients through secure links will appear here for review."
        />
      ) : (
        <Card elevation="low" className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="px-4 py-3">Document Requirement</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Uploaded File</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-slate-400">
                          description
                        </span>
                        <div>
                          <strong className="text-slate-900 block">{item.itemName}</strong>
                          <span className="text-[10px] text-slate-400">
                            {item.required ? 'Required' : 'Optional'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{item.clientName}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{item.period}</td>
                    <td className="px-4 py-3">
                      <Badge variant={item.status}>{item.status.toUpperCase()}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {item.fileName ? (
                        <div className="flex flex-col text-[11px]">
                          <span className="font-mono text-slate-800 truncate max-w-xs">{item.fileName}</span>
                          {item.fileSize && (
                            <span className="text-slate-400 text-[10px]">
                              {(item.fileSize / 1024).toFixed(0)} KB
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Awaiting upload</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon="visibility"
                        onClick={() => navigate(`/documents/${item.requestId}`)}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
