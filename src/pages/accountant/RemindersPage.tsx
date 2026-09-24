import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { auditService } from '../../services/audit';
import type { AuditLogRecord } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export const RemindersPage: React.FC = () => {
  const { currentWorkspace } = useAuth();
  const [reminderLogs, setReminderLogs] = useState<AuditLogRecord[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadLogs = async () => {
      if (!currentWorkspace?.id) return;
      setIsLoadingLogs(true);
      try {
        const allLogs = await auditService.getLogs(currentWorkspace.id);
        const reminders = allLogs.filter((log) => log.action === 'reminder.sent');
        if (isMounted) {
          setReminderLogs(reminders);
        }
      } catch (err) {
        console.error('Failed to load reminder audit logs:', err);
      } finally {
        if (isMounted) {
          setIsLoadingLogs(false);
        }
      }
    };
    loadLogs();
    return () => {
      isMounted = false;
    };
  }, [currentWorkspace?.id]);

  const reminderCadence = [
    {
      step: 1,
      label: 'Immediate Request Notification',
      offset: 'Immediate upon request dispatch',
      description: 'Delivered directly to the client with a secure single-use portal link upon dispatch.',
      channel: 'Email',
    },
    {
      step: 2,
      label: '7-Day Check-in Warning',
      offset: '7 days before due date',
      description: 'First proactive check-in summarizing any pending items remaining on the checklist.',
      channel: 'Email',
    },
    {
      step: 3,
      label: '3-Day Urgent Action Notice',
      offset: '3 days before due date',
      description: 'Targeted alert emphasizing impending deadline for un-uploaded documents.',
      channel: 'Email',
    },
    {
      step: 4,
      label: '1-Day Final Call',
      offset: '24 hours before due date',
      description: 'High-priority notification reminding the client that the deadline is tomorrow.',
      channel: 'Email',
    },
    {
      step: 5,
      label: 'Due-Date & Post-Deadline Escalation',
      offset: 'Due date & recurring overdue alerts',
      description: 'Statutory overdue escalation delivered daily until required files are provided.',
      channel: 'Email',
    },
  ];

  const formatLogDate = (isoString?: string) => {
    if (!isoString) return 'Recently';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Automated Reminder Engine
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Transparent schedule of automated follow-ups, item-level stop rules, and dispatch activity.
          </p>
        </div>

        <Link
          to="/requests"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors border border-neutral-200 dark:border-neutral-700 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          View Active Requests
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Cadence Timeline */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card elevation="low" padding="lg" className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                  Standard Reminder Cadence
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Executed automatically by the background reminder worker for all outstanding requests.
                </p>
              </div>
              <Badge variant="ready">ACTIVE WORKER</Badge>
            </div>

            <div className="flex flex-col gap-3">
              {reminderCadence.map((rule) => (
                <div
                  key={rule.step}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 gap-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center font-bold text-xs text-neutral-800 dark:text-neutral-200 shrink-0 mt-0.5 sm:mt-0">
                      {rule.step}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">
                          {rule.label}
                        </span>
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                          ({rule.offset})
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                        {rule.description}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 self-end sm:self-center">
                    <Badge variant="neutral">{rule.channel}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Reminder Activity */}
          <Card elevation="low" padding="lg" className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                  Recent Reminder Activity
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Real audit events recorded when automated or manual smart reminders are dispatched.
                </p>
              </div>
              <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                {reminderLogs.length} logged
              </span>
            </div>

            {isLoadingLogs ? (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="w-5 h-5 border-2 border-neutral-300 dark:border-neutral-700 border-t-neutral-900 dark:border-t-white rounded-full animate-spin mb-2" />
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Loading reminder logs...</span>
              </div>
            ) : reminderLogs.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[32px] text-neutral-400 dark:text-neutral-600">
                  schedule_send
                </span>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                  No reminder dispatches recorded yet in this workspace.
                </p>
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 max-w-sm">
                  Dispatched reminder emails will be automatically logged here as the background worker runs or when you click "Send Smart Reminder" on a request.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {reminderLogs.slice(0, 10).map((log) => {
                  const meta = (typeof log.metadata === 'object' && log.metadata !== null && !Array.isArray(log.metadata) ? log.metadata : {}) as Record<string, any>;
                  return (
                    <div
                      key={log.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-300 shrink-0">
                          <span className="material-symbols-outlined text-[18px]">send_time_extension</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                            {meta.client_name ? `Reminder to ${meta.client_name}` : 'Smart Reminder Dispatched'}
                          </p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                            {meta.count
                              ? `Targeting ${meta.count} missing document${meta.count > 1 ? 's' : ''}`
                              : 'Outstanding item follow-up'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500">
                          {formatLogDate(log.created_at)}
                        </span>
                        <Badge variant="ready">Delivered</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Stop Rules & Guidance */}
        <div className="flex flex-col gap-6">
          {/* Active Stop Rules Card */}
          <Card elevation="low" padding="lg" className="flex flex-col gap-3 bg-neutral-50/80 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-neutral-800 dark:text-neutral-200 text-[20px]">
                verified_user
              </span>
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                Item-Level Stop Rules
              </h3>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              DocChase enforces strict suppression guarantees so your clients are never spammed for documents they already submitted:
            </p>
            <ul className="text-xs text-neutral-600 dark:text-neutral-400 space-y-2 mt-1 list-disc list-inside">
              <li>
                <strong className="text-neutral-900 dark:text-neutral-200">Per-Item Exclusion:</strong> When a client uploads a file for an item, that item is instantly pruned from future reminder emails.
              </li>
              <li>
                <strong className="text-neutral-900 dark:text-neutral-200">READY Status Lock:</strong> Once all required items are verified and approved, the request transitions to <em>Ready</em> and all automated follow-ups cease permanently.
              </li>
              <li>
                <strong className="text-neutral-900 dark:text-neutral-200">Canceled / Closed:</strong> Requests marked complete or archived do not receive further reminders.
              </li>
            </ul>
          </Card>

          {/* Manual Smart Reminder Card */}
          <Card elevation="low" padding="lg" className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-neutral-800 dark:text-neutral-200 text-[20px]">
                bolt
              </span>
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                On-Demand Reminders
              </h3>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Need to follow up right now instead of waiting for the automated cadence? Open any active request in your workspace and click <strong className="text-neutral-800 dark:text-neutral-200">Send Smart Reminder</strong>.
            </p>
            <div className="pt-2">
              <Link
                to="/requests"
                className="w-full text-center inline-block py-2 px-3 rounded-lg text-xs font-semibold border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#121215] text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Go to Requests
              </Link>
            </div>
          </Card>

          {/* System Guarantees */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/30 text-xs text-neutral-500 dark:text-neutral-400 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-semibold text-neutral-800 dark:text-neutral-200">
              <span className="material-symbols-outlined text-[16px]">lock</span>
              Resend Delivery & Rate Limits
            </div>
            <p className="text-[11px] leading-relaxed">
              All reminder emails are dispatched through authenticated firm domain settings. Duplicate dispatches within 12 hours are blocked by server idempotency guards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
