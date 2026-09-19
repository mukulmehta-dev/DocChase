import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';

export const AccountantLayout: React.FC = () => {
  const { profile, currentWorkspace, workspaces, switchWorkspace, signOut } = useAuth();
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: 'grid_view' },
    { to: '/requests', label: 'Requests', icon: 'autorenew' },
    { to: '/clients', label: 'Clients', icon: 'group' },
    { to: '/documents', label: 'Documents', icon: 'folder_open' },
    { to: '/templates', label: 'Templates', icon: 'receipt_long' },
    { to: '/reminders', label: 'Reminders', icon: 'alarm' },
    { to: '/billing', label: 'Billing', icon: 'credit_card' },
    { to: '/settings', label: 'Settings', icon: 'tune' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/sign-in');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col text-slate-900">
      {/* Top Fixed Header */}
      <header className="fixed top-0 inset-x-0 z-40 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        {/* Left: Brand & Firm Switcher */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            onClick={() => navigate('/dashboard')}
            className="cursor-pointer flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <span className="material-symbols-outlined text-[19px]">fact_check</span>
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900 hidden sm:inline">
              DocChase
            </span>
          </div>

          <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

          {/* Firm / Workspace Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left"
            >
              <span className="font-medium text-xs sm:text-sm text-slate-700 truncate max-w-[140px] sm:max-w-[180px]">
                {currentWorkspace?.name || 'My Firm'}
              </span>
              <span className="material-symbols-outlined text-[16px] text-slate-400">
                unfold_more
              </span>
            </button>

            {workspaceDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setWorkspaceDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-20 animate-fade-in">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Workspaces
                  </div>
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        switchWorkspace(ws.id);
                        setWorkspaceDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs sm:text-sm flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        ws.id === currentWorkspace?.id
                          ? 'font-semibold text-primary-container bg-blue-50/50'
                          : 'text-slate-700'
                      }`}
                    >
                      <span className="truncate">{ws.name}</span>
                      {ws.id === currentWorkspace?.id && (
                        <span className="material-symbols-outlined text-[16px] text-primary-container">
                          check
                        </span>
                      )}
                    </button>
                  ))}
                  <div className="h-[1px] bg-slate-100 my-1" />
                  <button
                    onClick={() => {
                      setWorkspaceDropdownOpen(false);
                      navigate('/settings?tab=workspace');
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-primary-container font-medium hover:bg-slate-50 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Create Workspace
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Quick Action & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="primary"
            size="sm"
            icon="add"
            onClick={() => navigate('/requests/new')}
            className="hidden xs:inline-flex shadow-sm"
          >
            <span>Request</span>
          </Button>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white font-medium text-xs shadow-sm hover:opacity-95 transition-opacity"
              aria-label="User profile"
            >
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-20 animate-fade-in">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="font-semibold text-xs text-slate-900 truncate">
                      {profile?.full_name || 'Accountant'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{profile?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-400">
                      settings
                    </span>
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/billing');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-400">
                      credit_card
                    </span>
                    Plan & Billing
                  </button>
                  <div className="h-[1px] bg-slate-100 my-1" />
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleSignOut();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-error hover:bg-rose-50 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main App Container */}
      <div className="flex-1 flex pt-16">
        {/* Desktop Sidebar (Persistent 240px) */}
        <aside className="hidden lg:flex w-60 flex-col bg-white border-r border-slate-200 fixed top-16 bottom-0 z-30 p-3 overflow-y-auto">
          <nav className="flex flex-col gap-1 flex-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-primary-container font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Sidebar Footer Plan Indicator */}
          <div className="mt-auto p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Active Plan
              </span>
              <span className="text-[11px] font-bold text-primary-container uppercase px-1.5 py-0.5 rounded bg-blue-100/60">
                {currentWorkspace?.plan || 'Free'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Stop chasing. Automated document tracking.</p>
          </div>
        </aside>

        {/* Dynamic Page Content */}
        <main className="flex-1 lg:pl-60 min-h-[calc(100vh-64px)] pb-20 lg:pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Stitch Compliant) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe shadow-[0_-1px_8px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-around h-14">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 gap-0.5 transition-colors ${
                isActive ? 'text-primary-container font-medium' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">grid_view</span>
            <span className="text-[10px]">Dashboard</span>
          </NavLink>

          <NavLink
            to="/requests"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 gap-0.5 transition-colors ${
                isActive ? 'text-primary-container font-medium' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">autorenew</span>
            <span className="text-[10px]">Requests</span>
          </NavLink>

          <NavLink
            to="/clients"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 gap-0.5 transition-colors ${
                isActive ? 'text-primary-container font-medium' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">group</span>
            <span className="text-[10px]">Clients</span>
          </NavLink>

          <NavLink
            to="/documents"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 gap-0.5 transition-colors ${
                isActive ? 'text-primary-container font-medium' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">folder_open</span>
            <span className="text-[10px]">Vault</span>
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 gap-0.5 transition-colors ${
                isActive ? 'text-primary-container font-medium' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <span className="material-symbols-outlined text-[20px]">tune</span>
            <span className="text-[10px]">More</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
};
