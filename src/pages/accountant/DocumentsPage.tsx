import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { documentService, type VaultItem } from '../../services/documents';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

export const DocumentsPage: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'uploaded' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');

  const loadVault = async () => {
    if (!currentWorkspace?.id) return;
    setLoading(true);
    try {
      const allItems = await documentService.getVaultItems(currentWorkspace.id);
      setItems(allItems);
    } catch (err) {
      console.error('Failed to load document vault', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Documents Vault</h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Encrypted client document repository, verification tracking, and review status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon="autorenew"
            isLoading={loading}
            onClick={loadVault}
          >
            Refresh Vault
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card elevation="low" padding="md" className="flex flex-col">
          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Total Tracked Items</span>
          <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1 tabular-nums">{totalCount}</span>
        </Card>
        <Card elevation="low" padding="md" className="flex flex-col border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-800/40">
          <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">Needs Review</span>
          <span className="text-2xl font-bold text-neutral-900 dark:text-white mt-1 tabular-nums">{pendingReviewCount}</span>
        </Card>
        <Card elevation="low" padding="md" className="flex flex-col border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/20">
          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Approved Documents</span>
          <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">{approvedCount}</span>
        </Card>
        <Card elevation="low" padding="md" className="flex flex-col border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/20">
          <span className="text-xs text-rose-700 dark:text-rose-400 font-medium">Rejected / Replaced</span>
          <span className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1 tabular-nums">{rejectedCount}</span>
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
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold shadow-sm'
                  : 'bg-white dark:bg-[#121215] text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-neutral-400 dark:text-neutral-500 pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="Search documents or clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-neutral-300 dark:border-neutral-800 text-xs bg-white dark:bg-[#121215] text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:border-neutral-900 dark:focus:border-white focus:ring-1 focus:ring-neutral-900/15 dark:focus:ring-white/20 outline-none"
          />
        </div>
      </div>

      {/* Document Items Table or Empty State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <span className="material-symbols-outlined text-[32px] text-neutral-900 dark:text-white animate-spin mb-2">
            progress_activity
          </span>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Scanning document vault...</p>
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
              <thead className="bg-neutral-50 dark:bg-[#151518] text-neutral-500 dark:text-neutral-400 uppercase font-semibold border-b border-neutral-200 dark:border-neutral-800 text-[11px]">
                <tr>
                  <th className="px-4 py-3">Document Requirement</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Uploaded File</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-700 dark:text-neutral-300">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-neutral-400">
                          description
                        </span>
                        <div>
                          <strong className="text-neutral-900 dark:text-neutral-100 block">{item.itemName}</strong>
                          <span className="text-[10px] text-neutral-400">
                            {item.required ? 'Required' : 'Optional'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-800 dark:text-neutral-200">{item.clientName}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-neutral-500 dark:text-neutral-400">{item.period}</td>
                    <td className="px-4 py-3">
                      <Badge variant={item.status}>{item.status.toUpperCase()}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {item.fileName ? (
                        <div className="flex flex-col text-[11px]">
                          <span className="font-mono text-neutral-800 dark:text-neutral-200 truncate max-w-xs">{item.fileName}</span>
                          {item.fileSize && (
                            <span className="text-neutral-400 text-[10px]">
                              {(item.fileSize / 1024).toFixed(0)} KB
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic text-[11px]">Awaiting upload</span>
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
