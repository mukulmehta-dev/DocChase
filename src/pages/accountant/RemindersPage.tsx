import React from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export const RemindersPage: React.FC = () => {
  const reminderRules = [
    { label: 'Initial Request Dispatch', offset: 'Immediate upon creation', channel: 'Email' },
    { label: 'Upcoming Cycle Warning', offset: '7 days before due date', channel: 'Email' },
    { label: 'Urgent Action Reminder', offset: '3 days before due date', channel: 'Email' },
    { label: 'Final Call Before Deadline', offset: '1 day before due date', channel: 'Email' },
    { label: 'Statutory Overdue Alert', offset: 'Day of & post-deadline escalation', channel: 'Email' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Reminder Management</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Automated reminder schedule and item-level stop rules.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card elevation="low" className="p-5 flex flex-col gap-4">
            <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Automated Reminder Cadence</h2>
            <div className="flex flex-col gap-2.5">
              {reminderRules.map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center font-bold text-[11px] text-neutral-700 dark:text-neutral-200">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">{rule.label}</span>
                      <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">{rule.offset}</span>
                    </div>
                  </div>
                  <Badge variant="neutral">{rule.channel}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card elevation="low" className="p-5 flex flex-col gap-3 bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[20px]">verified_user</span>
              <h3 className="font-semibold text-sm text-emerald-950 dark:text-emerald-300">Active Stop Rules</h3>
            </div>
            <p className="text-xs text-emerald-800 dark:text-emerald-400/90 leading-relaxed">
              • If an item is uploaded, it is automatically removed from future reminders.
              <br />
              • If all required documents are approved, the cycle turns <strong>Ready</strong> and all future reminders cease immediately.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
