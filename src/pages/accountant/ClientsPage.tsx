import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { clientService } from '../../services/clients';
import type { ClientWithRequests } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { EditClientModal } from '../../components/clients/EditClientModal';
import { AddClientModal } from '../../components/clients/AddClientModal';

export const ClientsPage: React.FC = () => {
  const { currentWorkspace, user } = useAuth();
  const navigate = useNavigate();

  const [clients, setClients] = useState<ClientWithRequests[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('all');

  // Edit and Status Modals
  const [clientToEdit, setClientToEdit] = useState<ClientWithRequests | null>(null);
  const [clientToToggleStatus, setClientToToggleStatus] = useState<ClientWithRequests | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchClients = async () => {
    if (!currentWorkspace?.id) return;
    setLoading(true);
    try {
      const data = await clientService.getClients(currentWorkspace.id);
      setClients(data);
    } catch (err) {
      console.error('Failed to load clients', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmStatusToggle = async () => {
    if (!currentWorkspace?.id || !clientToToggleStatus) return;
    setIsUpdatingStatus(true);
    try {
      const newStatus = clientToToggleStatus.status === 'active' ? 'archived' : 'active';
      await clientService.updateClient(
        currentWorkspace.id,
        clientToToggleStatus.id,
        { status: newStatus },
        user?.id,
        currentWorkspace.plan
      );
      setClientToToggleStatus(null);
      await fetchClients();
    } catch (err: any) {
      console.error('Failed to update client status', err);
      alert(err.message || 'Failed to update client status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [currentWorkspace?.id]);

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.company_name && c.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Clients</h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Manage your firm's client accounts and active document collection cycles.
          </p>
        </div>
        <Button variant="primary" size="sm" icon="person_add" onClick={() => setIsAddModalOpen(true)}>
          Add Client
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by company, contact, or email..."
            leftIcon="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filterStatus === 'all' ? 'bg-white dark:bg-[#1f1f23] text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            All ({clients.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filterStatus === 'active' ? 'bg-white dark:bg-[#1f1f23] text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Active ({clients.filter((c) => c.status === 'active').length})
          </button>
          <button
            onClick={() => setFilterStatus('archived')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filterStatus === 'archived' ? 'bg-white dark:bg-[#1f1f23] text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Archived ({clients.filter((c) => c.status === 'archived').length})
          </button>
        </div>
      </div>

      {/* Client List / Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <span className="material-symbols-outlined text-[32px] text-neutral-900 dark:text-white animate-spin mb-2">
            progress_activity
          </span>
          <p className="text-xs text-neutral-500">Loading client directory...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <EmptyState
          icon="group"
          title={searchQuery ? 'No matching clients found' : filterStatus === 'archived' ? 'No archived clients' : 'No clients in your firm yet'}
          description={
            searchQuery
              ? 'Try modifying your search criteria.'
              : filterStatus === 'archived'
              ? 'Clients you archive will appear here safely preserved.'
              : 'Add your first accounting client to begin collecting documents automatically.'
          }
          actionLabel={filterStatus === 'archived' ? undefined : 'Add Client'}
          actionIcon={filterStatus === 'archived' ? undefined : 'person_add'}
          onAction={filterStatus === 'archived' ? undefined : () => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              elevation="hover"
              className="p-5 flex flex-col justify-between cursor-pointer group"
              onClick={() => navigate(`/clients/${client.id}`)}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base text-neutral-900 dark:text-neutral-100 truncate">
                      {client.company_name || client.name}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                      Contact: {client.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant={client.status === 'active' ? 'ready' : 'neutral'}>
                      {client.status.toUpperCase()}
                    </Badge>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClientToEdit(client);
                      }}
                      className="p-1 rounded text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      title="Edit Client Details"
                    >
                      <span className="material-symbols-outlined text-[17px]">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClientToToggleStatus(client);
                      }}
                      className={`p-1 rounded transition-colors ${
                        client.status === 'active'
                          ? 'text-neutral-400 dark:text-neutral-500 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                          : 'text-neutral-400 dark:text-neutral-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      }`}
                      title={client.status === 'active' ? 'Archive Client' : 'Reactivate Client'}
                    >
                      <span className="material-symbols-outlined text-[17px]">
                        {client.status === 'active' ? 'archive' : 'unarchive'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                  <div className="flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-[15px] text-neutral-400 dark:text-neutral-500">mail</span>
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[15px] text-neutral-400 dark:text-neutral-500">call</span>
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                <span>Active Cycles: <strong className="text-neutral-800 dark:text-neutral-200">{client.total_requests_count || 0}</strong></span>
                <span className="font-semibold text-neutral-900 dark:text-white hover:underline flex items-center gap-0.5">
                  View Detail <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          fetchClients();
        }}
      />

      {/* Edit Client Modal */}
      <EditClientModal
        isOpen={!!clientToEdit}
        onClose={() => setClientToEdit(null)}
        client={clientToEdit}
        onSuccess={() => {
          fetchClients();
        }}
      />

      {/* Archive / Reactivate Confirmation Modal */}
      <Modal
        isOpen={!!clientToToggleStatus}
        onClose={() => setClientToToggleStatus(null)}
        title={clientToToggleStatus?.status === 'active' ? 'Archive Client' : 'Reactivate Client'}
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
            {clientToToggleStatus?.status === 'active' ? (
              <>
                Are you sure you want to archive <strong>{clientToToggleStatus?.company_name || clientToToggleStatus?.name}</strong>?
                <br /><br />
                Archiving hides this client from the active directory and prevents dispatching new document requests.
                <strong> All historical requests, uploaded documents, and audit logs are safely preserved.</strong>
              </>
            ) : (
              <>
                Reactivate <strong>{clientToToggleStatus?.company_name || clientToToggleStatus?.name}</strong>?
                <br /><br />
                This client will be restored to your active directory and can receive new document requests.
              </>
            )}
          </p>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() => setClientToToggleStatus(null)}
              disabled={isUpdatingStatus}
            >
              Cancel
            </Button>
            <Button
              variant={clientToToggleStatus?.status === 'active' ? 'secondary' : 'primary'}
              size="md"
              type="button"
              isLoading={isUpdatingStatus}
              icon={clientToToggleStatus?.status === 'active' ? 'archive' : 'unarchive'}
              onClick={handleConfirmStatusToggle}
            >
              {clientToToggleStatus?.status === 'active' ? 'Archive Client' : 'Reactivate Client'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
