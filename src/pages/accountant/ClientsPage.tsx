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
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

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
        user?.id
      );
      setClientToToggleStatus(null);
      await fetchClients();
    } catch (err) {
      console.error('Failed to update client status', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [currentWorkspace?.id]);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id) return;
    setModalError(null);
    setIsSubmitting(true);
    try {
      await clientService.createClient(
        currentWorkspace.id,
        currentWorkspace.plan,
        {
          name,
          company_name: companyName || undefined,
          email,
          phone: phone || undefined,
          notes: notes || undefined,
        }
      );
      setIsAddModalOpen(false);
      setName('');
      setCompanyName('');
      setEmail('');
      setPhone('');
      setNotes('');
      await fetchClients();
    } catch (err: any) {
      setModalError(err.message || 'Failed to add client');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Clients</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
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

        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filterStatus === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({clients.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filterStatus === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active ({clients.filter((c) => c.status === 'active').length})
          </button>
          <button
            onClick={() => setFilterStatus('archived')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              filterStatus === 'archived' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Archived ({clients.filter((c) => c.status === 'archived').length})
          </button>
        </div>
      </div>

      {/* Client List / Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <span className="material-symbols-outlined text-[32px] text-primary-container animate-spin mb-2">
            progress_activity
          </span>
          <p className="text-xs text-slate-500">Loading client directory...</p>
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
                    <h3 className="font-semibold text-base text-slate-900 truncate">
                      {client.company_name || client.name}
                    </h3>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
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
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
                          ? 'text-slate-400 hover:text-amber-700 hover:bg-amber-50'
                          : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'
                      }`}
                      title={client.status === 'active' ? 'Archive Client' : 'Reactivate Client'}
                    >
                      <span className="material-symbols-outlined text-[17px]">
                        {client.status === 'active' ? 'archive' : 'unarchive'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2 truncate">
                    <span className="material-symbols-outlined text-[15px] text-slate-400">mail</span>
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[15px] text-slate-400">call</span>
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Active Cycles: <strong>{client.total_requests_count || 0}</strong></span>
                <span className="font-semibold text-primary-container hover:underline flex items-center gap-0.5">
                  View Detail <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Client"
        description="Onboard an accounting or bookkeeping client to DocChase."
      >
        <form onSubmit={handleAddClient} className="flex flex-col gap-4">
          {modalError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-rose-600">error</span>
              <span>{modalError}</span>
            </div>
          )}

          <Input
            label="Company / Legal Entity Name"
            placeholder="e.g. Acme Retail Ltd"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            helperText="The client's business or organization name."
          />

          <Input
            label="Primary Contact Person"
            required
            placeholder="e.g. John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Client Notification Email"
            type="email"
            required
            placeholder="john@acme.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            helperText="Secure links and smart reminders will be sent to this email."
          />

          <Input
            label="Phone Number (Optional)"
            placeholder="+1 (555) 019-2834"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-2">
            <Button variant="secondary" size="md" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={isSubmitting} icon="check">
              Create Client
            </Button>
          </div>
        </form>
      </Modal>

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
          <p className="text-xs text-slate-600 leading-relaxed">
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

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
