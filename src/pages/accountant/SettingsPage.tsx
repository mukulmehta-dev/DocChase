import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { workspaceService } from '../../services/workspaces';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';

export const SettingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const currentTab = rawTab === 'workspace' ? 'workspace' : rawTab === 'appearance' ? 'appearance' : 'firm';

  const { theme, resolvedTheme, setTheme } = useTheme();

  const {
    user,
    profile,
    currentWorkspace,
    workspaces,
    workspaceRole,
    switchWorkspace,
    createWorkspace,
    updateCurrentWorkspace,
    updateProfile,
  } = useAuth();

  // Firm & Practice State
  const [firmName, setFirmName] = useState(currentWorkspace?.name || '');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [isSavingPractice, setIsSavingPractice] = useState(false);
  const [practiceSuccess, setPracticeSuccess] = useState<string | null>(null);
  const [practiceError, setPracticeError] = useState<string | null>(null);

  // New Workspace State
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Sync inputs when currentWorkspace or profile updates
  useEffect(() => {
    if (currentWorkspace?.name) {
      setFirmName(currentWorkspace.name);
    }
  }, [currentWorkspace?.name]);

  useEffect(() => {
    if (profile?.full_name !== undefined) {
      setFullName(profile.full_name || '');
    }
  }, [profile?.full_name]);

  const isOwnerOrAdmin = workspaceRole === 'owner' || workspaceRole === 'admin' || !isSupabaseConfigured();

  const handleSavePractice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id || !user?.id) return;

    const trimmedFirmName = firmName.trim();
    const trimmedFullName = fullName.trim();

    if (isOwnerOrAdmin && !trimmedFirmName) {
      setPracticeError('Firm name cannot be empty.');
      return;
    }

    setPracticeError(null);
    setPracticeSuccess(null);
    setIsSavingPractice(true);

    try {
      // 1. Update workspace firm name if user is owner/admin and name changed
      if (isOwnerOrAdmin && trimmedFirmName && trimmedFirmName !== currentWorkspace.name) {
        const updatedWs = await workspaceService.updateWorkspace(currentWorkspace.id, {
          name: trimmedFirmName,
        });
        updateCurrentWorkspace({ name: updatedWs.name });
      }

      // 2. Update user's profile full_name if changed
      if (trimmedFullName !== (profile?.full_name || '')) {
        if (isSupabaseConfigured()) {
          const { error: profError } = await supabase
            .from('profiles')
            .update({ full_name: trimmedFullName })
            .eq('id', user.id);

          if (profError) throw profError;
        }
        updateProfile({ full_name: trimmedFullName });
      }

      setPracticeSuccess('Settings saved successfully.');
      setTimeout(() => setPracticeSuccess(null), 4000);
    } catch (err: any) {
      console.error('Failed to save settings', err);
      setPracticeError(err.message || 'Failed to update settings. Please try again.');
    } finally {
      setIsSavingPractice(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newWorkspaceName.trim();
    if (!trimmed) {
      setCreateError('Workspace name is required.');
      return;
    }

    setCreateError(null);
    setCreateSuccess(null);
    setIsCreatingWorkspace(true);

    try {
      const created = await createWorkspace(trimmed);
      setNewWorkspaceName('');
      setCreateSuccess(`Workspace "${created.name}" created and set as active firm.`);
      setTimeout(() => setCreateSuccess(null), 5000);
    } catch (err: any) {
      console.error('Failed to create workspace', err);
      setCreateError(err.message || 'Failed to create workspace.');
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Firm & Workspace Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Configure practice branding, account preferences, and firm workspaces.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'firm' })}
          className={`pb-3 px-1 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            currentTab === 'firm'
              ? 'border-primary-container text-primary-container dark:text-sky-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">store</span>
          Firm & Practice Details
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'workspace' })}
          className={`pb-3 px-1 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            currentTab === 'workspace'
              ? 'border-primary-container text-primary-container dark:text-sky-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">domain</span>
          Workspaces ({workspaces.length})
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'appearance' })}
          className={`pb-3 px-1 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            currentTab === 'appearance'
              ? 'border-primary-container text-primary-container dark:text-sky-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">palette</span>
          Appearance
        </button>
      </div>

      {/* Tab Content: Firm & Practice Details */}
      {currentTab === 'firm' && (
        <Card padding="lg" elevation="low">
          <form onSubmit={handleSavePractice} className="flex flex-col gap-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                Practice Information
              </h2>
              {workspaceRole && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 font-normal">Role in Firm:</span>
                  <Badge variant={isOwnerOrAdmin ? 'ready' : 'neutral'}>
                    {workspaceRole.toUpperCase()}
                  </Badge>
                </div>
              )}
            </div>

            {!isOwnerOrAdmin && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  lock
                </span>
                <div>
                  <strong className="font-medium">Member Access:</strong> You can update your personal lead accountant name. Firm-level settings require Owner or Administrator permissions.
                </div>
              </div>
            )}

            {practiceError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-rose-600 dark:text-rose-400">error</span>
                <span>{practiceError}</span>
              </div>
            )}

            {practiceSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-emerald-600 dark:text-emerald-400">check_circle</span>
                <span>{practiceSuccess}</span>
              </div>
            )}

            <Input
              label="Accounting Firm Name"
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              disabled={!isOwnerOrAdmin || isSavingPractice}
              helperText={
                isOwnerOrAdmin
                  ? "Appears on client document request portals and notification emails."
                  : "Only workspace owners and administrators can change firm details."
              }
            />

            <Input
              label="Lead Accountant Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isSavingPractice}
              placeholder="e.g. Sarah Jenkins, CPA"
              helperText="Your personal name displayed on notifications and audit logs."
            />

            <Input
              label="Account Email"
              disabled
              value={user?.email || profile?.email || ''}
              helperText="Contact support to update your primary login credentials."
            />

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={isSavingPractice}
                icon="save"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tab Content: Workspaces */}
      {currentTab === 'workspace' && (
        <div className="flex flex-col gap-6">
          {/* Workspaces List */}
          <Card padding="lg" elevation="low" className="flex flex-col gap-4">
            <div>
              <h2 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                Your Accounting Workspaces
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Switch between different accounting firms or legal entities you manage.
              </p>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {workspaces.map((ws) => {
                const isActive = ws.id === currentWorkspace?.id;
                return (
                  <div
                    key={ws.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{ws.name}</span>
                        <Badge variant={ws.plan === 'pro' ? 'ready' : ws.plan === 'starter' ? 'in_progress' : 'neutral'}>
                          {ws.plan.toUpperCase()}
                        </Badge>
                        {isActive && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        ID: <code className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{ws.id}</code>
                      </p>
                    </div>

                    {!isActive ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon="swap_horiz"
                        onClick={() => switchWorkspace(ws.id)}
                      >
                        Switch Workspace
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500 italic">Current Active Workspace</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Create New Workspace */}
          <Card padding="lg" elevation="low">
            <form onSubmit={handleCreateWorkspace} className="flex flex-col gap-4">
              <div>
                <h2 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                  Create New Workspace
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Set up a separate accounting firm workspace with its own client directory, document requests, and audit trails.
                </p>
              </div>

              {createError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-rose-600 dark:text-rose-400">error</span>
                  <span>{createError}</span>
                </div>
              )}

              {createSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600 dark:text-emerald-400">check_circle</span>
                  <span>{createSuccess}</span>
                </div>
              )}

              <Input
                label="New Firm Name"
                placeholder="e.g. Highland Advisory Group"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                disabled={isCreatingWorkspace}
                helperText="You will automatically become the Owner of this new workspace."
              />

              <div className="pt-2 flex justify-end">
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  isLoading={isCreatingWorkspace}
                  icon="add"
                >
                  Create Workspace
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Tab Content: Appearance */}
      {currentTab === 'appearance' && (
        <Card padding="lg" elevation="low" className="flex flex-col gap-6">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              Application Theme
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customize how DocChase looks on your device. Choose Light, Dark, or automatically match your system settings.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Light Option */}
            <button
              type="button"
              id="theme-option-light"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border text-left flex flex-col gap-3 transition-all relative ${
                theme === 'light'
                  ? 'border-sky-500 bg-sky-50/40 dark:bg-sky-950/20 ring-2 ring-sky-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1526] hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  theme === 'light' ? 'bg-sky-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">light_mode</span>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  theme === 'light' ? 'border-sky-500 bg-sky-500' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {theme === 'light' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Light</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Clean, high-contrast light interface designed for daytime productivity.
                </p>
              </div>
            </button>

            {/* Dark Option */}
            <button
              type="button"
              id="theme-option-dark"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border text-left flex flex-col gap-3 transition-all relative ${
                theme === 'dark'
                  ? 'border-sky-500 bg-sky-50/40 dark:bg-sky-950/20 ring-2 ring-sky-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1526] hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  theme === 'dark' ? 'bg-sky-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">dark_mode</span>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  theme === 'dark' ? 'border-sky-500 bg-sky-500' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {theme === 'dark' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Dark</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Deep slate palette aligned with DocChase's signature visual aesthetic.
                </p>
              </div>
            </button>

            {/* System Option */}
            <button
              type="button"
              id="theme-option-system"
              onClick={() => setTheme('system')}
              className={`p-4 rounded-xl border text-left flex flex-col gap-3 transition-all relative ${
                theme === 'system'
                  ? 'border-sky-500 bg-sky-50/40 dark:bg-sky-950/20 ring-2 ring-sky-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1526] hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  theme === 'system' ? 'bg-sky-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">desktop_windows</span>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  theme === 'system' ? 'border-sky-500 bg-sky-500' : 'border-slate-300 dark:border-slate-600'
                }`}>
                  {theme === 'system' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">System</h3>
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                    ({resolvedTheme})
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Syncs automatically with your operating system or browser light/dark mode.
                </p>
              </div>
            </button>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-[#0E1526] border border-slate-200 dark:border-slate-800 rounded-lg flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
            <span className="material-symbols-outlined text-[18px] text-sky-500 shrink-0">info</span>
            <span>
              Theme changes apply instantly across your accountant portal and persist across sessions.
            </span>
          </div>
        </Card>
      )}
    </div>
  );
};
