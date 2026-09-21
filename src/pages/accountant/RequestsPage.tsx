import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { requestService } from '../../services/requests';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';

export const RequestsPage: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'ready' | 'overdue'>('all');

  const loadRequests = async () => {
    if (!currentWorkspace?.id) return;
    setLoading(true);
    try {
      const data = await requestService.getRequests(currentWorkspace.id);
      setRequests(data);
    } catch (err) {
      console.error('Failed to load requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [currentWorkspace?.id]);

  const filteredRequests = requests.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Document Requests</h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Active and completed collection cycles across all your accounting clients.
          </p>
        </div>
        <Button variant="primary" size="sm" icon="add" onClick={() => navigate('/requests/new')}>
          Create Request
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 self-start bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
            filter === 'all' ? 'bg-white dark:bg-[#1f1f23] text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
          }`}
        >
          All ({requests.length})
        </button>
        <button
          onClick={() => setFilter('in_progress')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
            filter === 'in_progress' ? 'bg-white dark:bg-[#1f1f23] text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
          }`}
        >
          Waiting / In Progress ({requests.filter((r) => r.status !== 'ready' && r.status !== 'overdue').length})
        </button>
        <button
          onClick={() => setFilter('ready')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
            filter === 'ready' ? 'bg-white dark:bg-[#1f1f23] text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
          }`}
        >
          Ready ({requests.filter((r) => r.status === 'ready').length})
        </button>
        <button
          onClick={() => setFilter('overdue')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
            filter === 'overdue' ? 'bg-white dark:bg-[#1f1f23] text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
          }`}
        >
          Overdue ({requests.filter((r) => r.status === 'overdue').length})
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <span className="material-symbols-outlined text-[32px] text-neutral-900 dark:text-white animate-spin mb-2">
            progress_activity
          </span>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          icon="autorenew"
          title="No document requests in this view"
          description="Create your first client document collection cycle to begin automated tracking."
          actionLabel="Create Request"
          onAction={() => navigate('/requests/new')}
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          {filteredRequests.map((req) => (
            <Card
              key={req.id}
              elevation="hover"
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
              onClick={() => navigate(`/requests/${req.id}`)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base text-neutral-900 dark:text-neutral-100 truncate">
                    {req.client_name || 'Client'}
                  </span>
                  <Badge variant={req.status}>{req.status?.toUpperCase()}</Badge>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {req.title} • Period: <strong className="text-neutral-700 dark:text-neutral-300 font-medium">{req.period}</strong> • Due: {req.due_date}
                </p>

                {/* Progress bar */}
                <div className="mt-3 flex items-center gap-3 max-w-sm">
                  <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        req.status === 'ready' ? 'bg-emerald-500' : 'bg-neutral-900 dark:bg-white'
                      }`}
                      style={{
                        width: `${req.total_count ? Math.round((req.approved_count / req.total_count) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 tabular-nums">
                    {req.approved_count || 0} / {req.total_count || 0} approved
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button variant="secondary" size="sm" icon="visibility">
                  View Details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
