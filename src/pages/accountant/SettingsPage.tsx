import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const SettingsPage: React.FC = () => {
  const { profile, currentWorkspace } = useAuth();
  const [firmName, setFirmName] = useState(currentWorkspace?.name || 'Acorn Bookkeeping');
  const [fullName, setFullName] = useState(profile?.full_name || 'Sarah Jenkins');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Firm & Workspace Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">Configure your practice details, branding, and team preferences.</p>
      </div>

      <Card padding="lg" elevation="low">
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <h2 className="font-semibold text-sm text-slate-900 pb-2 border-b border-slate-100">
            Practice Details
          </h2>

          <Input
            label="Accounting Firm Name"
            value={firmName}
            onChange={(e) => setFirmName(e.target.value)}
            helperText="Appears on client document request portals and notification emails."
          />

          <Input
            label="Lead Accountant Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <Input
            label="Account Email"
            disabled
            value={profile?.email || 'sarah@acornbookkeeping.com'}
            helperText="Contact support to update your primary login email."
          />

          {saved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
              <span>Settings updated successfully.</span>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <Button variant="primary" size="md" type="submit" icon="save">
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
