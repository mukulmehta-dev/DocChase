import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { AddClientModal } from '../../components/clients/AddClientModal';
import { clientService } from '../../services/clients';
import { requestService } from '../../services/requests';
import { auditService } from '../../services/audit';
import { reminderService } from '../../services/reminders';

interface DashboardStats {
  totalClients: number;
  totalCycles: number;
  readyCycles: number;
  waitingCycles: number;
  overdueCycles: number;
}

export const DashboardPage: React.FC = () => {
  const { profile, currentWorkspace } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalCycles: 0,
    readyCycles: 0,
    waitingCycles: 0,
    overdueCycles: 0,
  });

  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [reminderMessage, setReminderMessage] = useState<{ id: string; text: string; success: boolean } | null>(null);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    setLoading(true);
    try {
      // Fetch real data from Supabase via service layer
      const [clients, requests, activityLogs] = await Promise.all([
        clientService.getClients(currentWorkspace.id),
        requestService.getRequests(currentWorkspace.id),
        auditService.getLogs(currentWorkspace.id),
      ]);

      let readyCount = 0;
      let waitingCount = 0;
      let overdueCount = 0;

      requests.forEach((r: any) => {
        if (r.status === 'ready') readyCount++;
        else if (r.status === 'overdue') overdueCount++;
        else waitingCount++;
      });

      setStats({
        totalClients: clients.length,
        totalCycles: requests.length,
        readyCycles: readyCount,
        waitingCycles: waitingCount,
        overdueCycles: overdueCount,
      });

      setRecentRequests(requests);

      // Map audit logs to activity feed format
      const activity = activityLogs.slice(0, 30).map((log: any) => ({
        title: log.metadata
          ? formatActionTitle(log.action, log.metadata)
          : log.action,
        action: log.action,
        time: formatRelativeTime(log.created_at),
        timestamp: log.created_at,
        icon: getActionIcon(log.action),
      }));
      setRecentActivity(activity);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleSendReminder = async (req: any) => {
    setSendingReminderId(req.id);
    setReminderMessage(null);
    try {
      // Gather outstanding (non-approved) items from the request
      const items = (req.items || []) as any[];
      const outstandingItems: string[] = items
        .filter((i: any) => i.status !== 'approved')
        .map((i: any) => i.name);

      const clientEmail = req.client?.email || req.client_email || '';
      const clientName = req.client_name || req.client?.company_name || req.client?.name || 'Client';
      const clientPortalUrl = req.access_token
        ? `${window.location.origin}/request/${req.access_token}`
        : undefined;

      const result = await reminderService.sendSmartReminder({
        workspaceId: currentWorkspace!.id,
        requestId: req.id,
        clientName,
        clientEmail,
        requestTitle: req.title,
        dueDate: req.due_date,
        outstandingItems,
        clientPortalUrl,
      });

      setReminderMessage({ id: req.id, text: result.message, success: result.success || result.stopped });

      if (result.success) {
        // Refresh activity log to show the sent reminder
        loadDashboard();
      }
    } catch (err: any) {
      setReminderMessage({ id: req.id, text: err.message || 'Failed to send reminder.', success: false });
    } finally {
      setSendingReminderId(null);
    }
  };

  const firstName = profile?.full_name
    ? profile.full_name.split(' ')[0]
    : (profile?.email ? profile.email.split('@')[0] : 'there');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="material-symbols-outlined text-[32px] text-neutral-900 dark:text-white animate-spin mb-2">
          progress_activity
        </span>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Loading firm operational overview...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Greeting & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-flex w-2 h-2 rounded-full bg-neutral-900 dark:bg-white animate-pulse" />
            <span className="text-[11px] font-semibold text-neutral-900 dark:text-white uppercase tracking-wider">
              Operational Overview
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Good day, {firstName}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {stats.totalCycles > 0
              ? `Here's what needs your attention today across ${stats.totalCycles} active client cycles.`
              : `Welcome to ${currentWorkspace?.name || 'DocChase'}. Add your first client to begin collecting documents.`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon="person_add"
            onClick={() => setIsAddClientModalOpen(true)}
          >
            Add Client
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon="add"
            onClick={() => navigate('/requests/new')}
          >
            New Request
          </Button>
        </div>
      </div>

      {/* 4 Metric Cards (Stitch Key Performance Strip) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Clients */}
        <Card padding="md" elevation="low" className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Clients</span>
            <span className="material-symbols-outlined text-[20px] text-neutral-400 dark:text-neutral-500">group</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
              {stats.totalClients}
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">Active client accounts</p>
          </div>
        </Card>

        {/* Total Cycles */}
        <Card padding="md" elevation="low" className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Total Cycles</span>
            <span className="material-symbols-outlined text-[20px] text-neutral-400 dark:text-neutral-500">domain</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
              {stats.totalCycles}
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">Active monthly accounts</p>
          </div>
        </Card>

        {/* Ready */}
        <Card padding="md" elevation="low" className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Ready</span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800/60">
              <span className="material-symbols-outlined text-[13px] text-emerald-600 dark:text-emerald-400">
                check_circle
              </span>
              {stats.totalCycles > 0
                ? `${Math.round((stats.readyCycles / stats.totalCycles) * 100)}%`
                : '100%'}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums flex items-baseline gap-1.5">
              {stats.readyCycles}
              <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">cycles</span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">All documents approved</p>
          </div>
        </Card>

        {/* Overdue */}
        <Card padding="md" elevation="low" className="flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Overdue</span>
            <span className="w-5 h-5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 flex items-center justify-center border border-rose-200 dark:border-rose-800/60">
              <span className="material-symbols-outlined text-[13px]">priority_high</span>
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-rose-700 dark:text-rose-400 tabular-nums flex items-baseline gap-1.5">
              {stats.overdueCycles}
              <span className="text-xs font-normal text-rose-600/80 dark:text-rose-400/80">clients</span>
            </div>
            <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5 truncate">Past statutory deadline</p>
          </div>
        </Card>
      </div>

      {/* Main Content Areas: Attention Required & Client Cycles */}
      {recentRequests.length === 0 ? (
        <EmptyState
          icon="fact_check"
          title="No document requests yet"
          description="Create your first client document request or template to start automated tracking."
          actionLabel="Create Document Request"
          actionIcon="add"
          onAction={() => navigate('/requests/new')}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Requests List */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base text-neutral-900 dark:text-neutral-100">Active Document Requests</h2>
              <button
                onClick={() => navigate('/requests')}
                className="text-xs font-medium text-neutral-900 dark:text-white hover:underline"
              >
                View all requests
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {recentRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white dark:bg-[#121215] rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">{req.client_name || 'Client'}</span>
                        <Badge variant={req.status as any}>{req.status?.toUpperCase()}</Badge>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {req.title} • Period: {req.period}
                      </p>
                    </div>

                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                      Due: {req.due_date}
                    </span>
                  </div>

                  {/* Reminder feedback message */}
                  {reminderMessage?.id === req.id && reminderMessage && (
                    <div className={`text-[11px] px-2 py-1.5 rounded ${
                      reminderMessage.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                    }`}>
                      {reminderMessage.text}
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Progress: <strong className="text-neutral-800 dark:text-neutral-200 font-medium">{req.approved_count || 0} / {req.total_count || 5} approved</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon="visibility"
                        onClick={() => navigate(`/requests/${req.id}`)}
                      >
                        Details
                      </Button>
                      {req.status !== 'ready' && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon="alarm"
                          isLoading={sendingReminderId === req.id}
                          onClick={() => handleSendReminder(req)}
                        >
                          Remind
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="flex flex-col gap-4">
            <h2 className="font-semibold text-base text-neutral-900 dark:text-neutral-100">Recent Firm Activity</h2>
            <Card padding="md" elevation="low" className="flex flex-col gap-3.5">
              {recentActivity.length === 0 ? (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 py-6 text-center">
                  Document uploads and review actions will appear here in real-time.
                </p>
              ) : (
                recentActivity.map((act, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 pb-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0 last:pb-0 text-xs">
                    <span className="material-symbols-outlined text-[16px] text-neutral-900 dark:text-white mt-0.5">
                      {act.icon || 'history'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-neutral-800 dark:text-neutral-200 font-medium truncate">{act.title}</p>
                      <p className="text-neutral-400 dark:text-neutral-500 text-[11px]">{act.time}</p>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        onSuccess={() => {
          loadDashboard();
        }}
      />
    </div>
  );
};

// --- Helpers ---

const formatActionTitle = (action: string, metadata: Record<string, any>): string => {
  switch (action) {
    case 'client.created':
      return `Client "${metadata.client_name}" onboarded`;
    case 'request.created':
      return `Request "${metadata.title}" created for ${metadata.client_name}`;
    case 'request.sent':
      return `Secure request dispatched to ${metadata.client_name}`;
    case 'document.uploaded':
      return `${metadata.client_name || 'Client'} uploaded ${metadata.filename}`;
    case 'document.approved':
      return `Approved "${metadata.item_name}" for ${metadata.client_name}`;
    case 'document.rejected':
      return `Flagged "${metadata.item_name}" as rejected (${metadata.reason})`;
    case 'document.replaced':
      return `Replacement uploaded for "${metadata.item_name}"`;
    case 'request.completed':
      return `Request "${metadata.title}" 100% verified — cycle READY`;
    case 'reminder.sent':
      return `Smart reminder dispatched to ${metadata.client_name} for ${metadata.count || 1} missing item(s)`;
    default:
      return action;
  }
};

const getActionIcon = (action: string): string => {
  if (action.includes('approved') || action.includes('completed')) return 'task_alt';
  if (action.includes('rejected')) return 'scan_delete';
  if (action.includes('reminder')) return 'send_time_extension';
  if (action.includes('uploaded')) return 'upload_file';
  return 'history';
};

const formatRelativeTime = (timestamp: string): string => {
  try {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
};
