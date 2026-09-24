import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { workspaceService, type WorkspaceMemberDetail } from '../../services/workspaces';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

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

  // Workspace Members State
  const [members, setMembers] = useState<WorkspaceMemberDetail[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberSuccess, setMemberSuccess] = useState<string | null>(null);

  // Add Member Modal State
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [addMemberRole, setAddMemberRole] = useState<'owner' | 'admin' | 'member'>('member');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);

  // Role Change / Remove State
  const [memberToChangeRole, setMemberToChangeRole] = useState<WorkspaceMemberDetail | null>(null);
  const [targetNewRole, setTargetNewRole] = useState<'owner' | 'admin' | 'member'>('member');
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMemberDetail | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const isOwner = workspaceRole === 'owner' || !isSupabaseConfigured();

  const loadMembers = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    setLoadingMembers(true);
    setMemberError(null);
    try {
      const data = await workspaceService.getWorkspaceMembers(currentWorkspace.id);
      setMembers(data);
    } catch (err: any) {
      console.error('Failed to load workspace members:', err);
      setMemberError(err.message || 'Failed to load workspace members');
    } finally {
      setLoadingMembers(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (currentTab === 'workspace') {
      loadMembers();
    }
  }, [currentTab, loadMembers]);

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

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id) return;
    const trimmedEmail = addMemberEmail.trim();
    if (!trimmedEmail) {
      setAddMemberError('Please enter an email address.');
      return;
    }
    setIsAddingMember(true);
    setAddMemberError(null);
    try {
      await workspaceService.addMemberByEmail(currentWorkspace.id, trimmedEmail, addMemberRole);
      setIsAddMemberModalOpen(false);
      setAddMemberEmail('');
      setAddMemberRole('member');
      setMemberSuccess(`Successfully added ${trimmedEmail} as ${addMemberRole}.`);
      setTimeout(() => setMemberSuccess(null), 4000);
      await loadMembers();
    } catch (err: any) {
      setAddMemberError(err.message || 'Failed to add member.');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!currentWorkspace?.id || !memberToChangeRole) return;
    setIsChangingRole(true);
    setMemberError(null);
    try {
      await workspaceService.updateMemberRole(currentWorkspace.id, memberToChangeRole.id, targetNewRole);
      setMemberToChangeRole(null);
      setMemberSuccess(`Updated ${memberToChangeRole.email}'s role to ${targetNewRole}.`);
      setTimeout(() => setMemberSuccess(null), 4000);
      await loadMembers();
    } catch (err: any) {
      setMemberError(err.message || 'Failed to update member role.');
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!currentWorkspace?.id || !memberToRemove) return;
    setIsRemovingMember(true);
    setMemberError(null);
    try {
      await workspaceService.removeMember(currentWorkspace.id, memberToRemove.id);
      setMemberToRemove(null);
      setMemberSuccess(`Removed ${memberToRemove.email} from workspace.`);
      setTimeout(() => setMemberSuccess(null), 4000);
      await loadMembers();
    } catch (err: any) {
      setMemberError(err.message || 'Failed to remove member.');
    } finally {
      setIsRemovingMember(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
          Firm & Workspace Settings
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          Configure practice branding, account preferences, and firm workspaces.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'firm' })}
          className={`pb-3 px-1 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            currentTab === 'firm'
              ? 'border-neutral-900 text-neutral-900 dark:border-white dark:text-white font-semibold'
              : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
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
              ? 'border-neutral-900 text-neutral-900 dark:border-white dark:text-white font-semibold'
              : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
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
              ? 'border-neutral-900 text-neutral-900 dark:border-white dark:text-white font-semibold'
              : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
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
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                Practice Information
              </h2>
              {workspaceRole && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-neutral-400 font-normal">Role in Firm:</span>
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

            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
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
              <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                Your Accounting Workspaces
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Switch between different accounting firms or legal entities you manage.
              </p>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {workspaces.map((ws) => {
                const isActive = ws.id === currentWorkspace?.id;
                return (
                  <div
                    key={ws.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">{ws.name}</span>
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
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                        ID: <code className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400">{ws.id}</code>
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
                      <span className="text-xs text-neutral-400 dark:text-neutral-500 italic">Current Active Workspace</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Workspace Members & Access Control */}
          <Card padding="lg" elevation="low">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                    Workspace Members & Access Control
                  </h2>
                  <span className="text-xs text-neutral-400 font-normal">
                    ({members.length} {members.length === 1 ? 'member' : 'members'})
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Manage team members and role-based permissions for <span className="font-medium text-neutral-700 dark:text-neutral-300">{currentWorkspace?.name}</span>.
                </p>
              </div>

              {isOwner && (
                <Button
                  variant="primary"
                  size="sm"
                  icon="person_add"
                  onClick={() => {
                    setAddMemberError(null);
                    setAddMemberEmail('');
                    setAddMemberRole('member');
                    setIsAddMemberModalOpen(true);
                  }}
                >
                  Add Member
                </Button>
              )}
            </div>

            {memberSuccess && (
              <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-emerald-600 dark:text-emerald-400">check_circle</span>
                <span>{memberSuccess}</span>
              </div>
            )}

            {memberError && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-rose-600 dark:text-rose-400">error</span>
                <span>{memberError}</span>
              </div>
            )}

            {loadingMembers ? (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="w-6 h-6 border-2 border-neutral-300 dark:border-neutral-700 border-t-neutral-900 dark:border-t-white rounded-full animate-spin mb-2" />
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Loading members...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
                No members found in this workspace.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 mt-2">
                {members.map((m) => {
                  const isCurrentAuthUser = m.user_id === user?.id;
                  return (
                    <div
                      key={m.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 font-semibold text-xs shrink-0 border border-neutral-200 dark:border-neutral-700">
                          {m.full_name ? m.full_name.charAt(0).toUpperCase() : (m.email ? m.email.charAt(0).toUpperCase() : 'U')}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 truncate">
                              {m.full_name || m.email || 'Workspace Member'}
                            </span>
                            {isCurrentAuthUser && (
                              <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                                You
                              </span>
                            )}
                            <Badge
                              variant={
                                m.role === 'owner' ? 'ready' : m.role === 'admin' ? 'in_progress' : 'neutral'
                              }
                            >
                              {m.role.toUpperCase()}
                            </Badge>
                          </div>
                          {m.full_name && m.email && (
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                              {m.email}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions according to role permissions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {isOwner ? (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon="edit"
                              onClick={() => {
                                setMemberToChangeRole(m);
                                setTargetNewRole(m.role);
                              }}
                            >
                              Change Role
                            </Button>
                            {!isCurrentAuthUser && (
                              <Button
                                variant="secondary"
                                size="sm"
                                icon="person_remove"
                                className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                onClick={() => setMemberToRemove(m)}
                              >
                                Remove
                              </Button>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] text-neutral-400 dark:text-neutral-500 italic">
                            {m.role === 'owner' ? 'Workspace Owner' : m.role === 'admin' ? 'Administrator' : 'Team Member'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Create New Workspace */}
          <Card padding="lg" elevation="low">
            <form onSubmit={handleCreateWorkspace} className="flex flex-col gap-4">
              <div>
                <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                  Create New Workspace
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
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

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddMemberModalOpen}
        onClose={() => {
          if (!isAddingMember) setIsAddMemberModalOpen(false);
        }}
        title="Add Workspace Member"
        description="Add a registered DocChase user to this workspace by their account email."
        maxWidth="md"
      >
        <form onSubmit={handleAddMember} className="flex flex-col gap-4 py-2">
          {addMemberError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-rose-600 dark:text-rose-400">error</span>
              <span>{addMemberError}</span>
            </div>
          )}

          <Input
            label="User Email"
            type="email"
            required
            placeholder="colleague@yourfirm.com"
            value={addMemberEmail}
            onChange={(e) => setAddMemberEmail(e.target.value)}
            disabled={isAddingMember}
            helperText="The user must already have a registered account in DocChase."
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Workspace Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAddMemberRole('member')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  addMemberRole === 'member'
                    ? 'border-neutral-900 dark:border-white bg-neutral-100/60 dark:bg-neutral-800/60 ring-1 ring-neutral-900 dark:ring-white'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                }`}
              >
                <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">Member</div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-snug">
                  Can create requests, review documents, and manage clients.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAddMemberRole('admin')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  addMemberRole === 'admin'
                    ? 'border-neutral-900 dark:border-white bg-neutral-100/60 dark:bg-neutral-800/60 ring-1 ring-neutral-900 dark:ring-white'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                }`}
              >
                <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100">Admin</div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-snug">
                  Full practice access, firm details, view all members.
                </div>
              </button>
            </div>
          </div>

          <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-lg text-[11px] text-neutral-500 dark:text-neutral-400 flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-neutral-400 shrink-0 mt-0.5">info</span>
            <span>
              External email invitations with signed tokens for unregistered users will be available in an upcoming release.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <Button
              variant="secondary"
              size="md"
              type="button"
              disabled={isAddingMember}
              onClick={() => setIsAddMemberModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={isAddingMember}
              icon="person_add"
            >
              Add to Workspace
            </Button>
          </div>
        </form>
      </Modal>

      {/* Change Role Modal */}
      <Modal
        isOpen={!!memberToChangeRole}
        onClose={() => {
          if (!isChangingRole) setMemberToChangeRole(null);
        }}
        title="Change Member Role"
        description={`Modify permissions for ${memberToChangeRole?.email || memberToChangeRole?.full_name || 'member'}.`}
        maxWidth="md"
      >
        <div className="flex flex-col gap-4 py-2">
          <div className="grid grid-cols-1 gap-2">
            {(['member', 'admin', 'owner'] as const).map((roleOption) => (
              <button
                key={roleOption}
                type="button"
                onClick={() => setTargetNewRole(roleOption)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  targetNewRole === roleOption
                    ? 'border-neutral-900 dark:border-white bg-neutral-100/60 dark:bg-neutral-800/60 ring-1 ring-neutral-900 dark:ring-white'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                    {roleOption}
                  </span>
                  {targetNewRole === roleOption && (
                    <span className="material-symbols-outlined text-[16px] text-neutral-900 dark:text-white">check</span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
                  {roleOption === 'owner'
                    ? 'Full workspace authority including billing, members, and workspace settings.'
                    : roleOption === 'admin'
                    ? 'Practice management, templates, and view-only membership access.'
                    : 'Standard access to create requests, review documents, and manage clients.'}
                </p>
              </button>
            ))}
          </div>

          {memberToChangeRole?.role === 'owner' && targetNewRole !== 'owner' && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-amber-600 dark:text-amber-400 shrink-0">warning</span>
              <span>
                Demoting an owner requires at least one other active owner to remain in the workspace.
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <Button
              variant="secondary"
              size="md"
              type="button"
              disabled={isChangingRole}
              onClick={() => setMemberToChangeRole(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="button"
              isLoading={isChangingRole}
              onClick={handleConfirmRoleChange}
              disabled={targetNewRole === memberToChangeRole?.role}
            >
              Update Role
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remove Member Modal */}
      <Modal
        isOpen={!!memberToRemove}
        onClose={() => {
          if (!isRemovingMember) setMemberToRemove(null);
        }}
        title="Remove Member from Workspace"
        description="Are you sure you want to remove this member? They will immediately lose access to this workspace and its documents."
        maxWidth="md"
      >
        <div className="flex flex-col gap-4 py-2">
          <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 text-xs">
            <div className="font-semibold text-neutral-900 dark:text-neutral-100">
              {memberToRemove?.full_name || memberToRemove?.email}
            </div>
            <div className="text-neutral-500 dark:text-neutral-400 mt-0.5">
              Email: {memberToRemove?.email} &bull; Role: {memberToRemove?.role.toUpperCase()}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <Button
              variant="secondary"
              size="md"
              type="button"
              disabled={isRemovingMember}
              onClick={() => setMemberToRemove(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="button"
              isLoading={isRemovingMember}
              className="bg-rose-600 hover:bg-rose-700 text-white border-transparent"
              onClick={handleConfirmRemove}
            >
              Remove Member
            </Button>
          </div>
        </div>
      </Modal>

      {/* Tab Content: Appearance */}
      {currentTab === 'appearance' && (
        <Card padding="lg" elevation="low" className="flex flex-col gap-6">
          <div className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
              Application Theme
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Customize how DocChase looks on your device. Choose Light, Dark, or automatically match your system settings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Light Option */}
            <button
              type="button"
              id="theme-option-light"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border text-left flex flex-col gap-3 transition-all relative ${
                theme === 'light'
                  ? 'border-neutral-900 dark:border-white bg-neutral-100/70 dark:bg-neutral-800/60 ring-2 ring-neutral-900/10 dark:ring-white/20'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121215] hover:border-neutral-300 dark:hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  theme === 'light' ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">light_mode</span>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  theme === 'light' ? 'border-neutral-900 bg-neutral-900 dark:border-white dark:bg-white' : 'border-neutral-300 dark:border-neutral-600'
                }`}>
                  {theme === 'light' && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-black" />}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Light</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
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
                  ? 'border-neutral-900 dark:border-white bg-neutral-100/70 dark:bg-neutral-800/60 ring-2 ring-neutral-900/10 dark:ring-white/20'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121215] hover:border-neutral-300 dark:hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  theme === 'dark' ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">dark_mode</span>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  theme === 'dark' ? 'border-neutral-900 bg-neutral-900 dark:border-white dark:bg-white' : 'border-neutral-300 dark:border-neutral-600'
                }`}>
                  {theme === 'dark' && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-black" />}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Dark</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                  Deep charcoal palette aligned with DocChase's monochrome aesthetic.
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
                  ? 'border-neutral-900 dark:border-white bg-neutral-100/70 dark:bg-neutral-800/60 ring-2 ring-neutral-900/10 dark:ring-white/20'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121215] hover:border-neutral-300 dark:hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  theme === 'system' ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">desktop_windows</span>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  theme === 'system' ? 'border-neutral-900 bg-neutral-900 dark:border-white dark:bg-white' : 'border-neutral-300 dark:border-neutral-600'
                }`}>
                  {theme === 'system' && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-black" />}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">System</h3>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 dark:text-neutral-500">
                    ({resolvedTheme})
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                  Syncs automatically with your operating system or browser light/dark mode.
                </p>
              </div>
            </button>
          </div>

          <div className="p-3.5 bg-neutral-50 dark:bg-[#121215] border border-neutral-200 dark:border-neutral-800 rounded-lg flex items-center gap-2.5 text-xs text-neutral-600 dark:text-neutral-400">
            <span className="material-symbols-outlined text-[18px] text-neutral-500 shrink-0">info</span>
            <span>
              Theme changes apply instantly across your accountant portal and persist across sessions.
            </span>
          </div>
        </Card>
      )}
    </div>
  );
};
