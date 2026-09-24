import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { clientService } from '../../services/clients';
import { requestService } from '../../services/requests';
import type { Client } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { EditClientModal } from '../../components/clients/EditClientModal';

export const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentWorkspace, user } = useAuth();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const load = async () => {
    if (!currentWorkspace?.id || !id) return;
    setLoading(true);
    try {
      const c = await clientService.getClient(currentWorkspace.id, id);
      setClient(c);

      const allReqs = await requestService.getRequests(currentWorkspace.id);
      const clientReqs = allReqs.filter((r) => r.client_id === id);
      setRequests(clientReqs);
    } catch (err) {
      console.error('Failed to load client detail', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmStatusToggle = async () => {
    if (!currentWorkspace?.id || !client) return;
    setIsUpdatingStatus(true);
    try {
      const newStatus = client.status === 'active' ? 'archived' : 'active';
      const updated = await clientService.updateClient(
        currentWorkspace.id,
        client.id,
        { status: newStatus },
        user?.id,
        currentWorkspace.plan
      );
      setClient(updated);
      setIsStatusModalOpen(false);
    } catch (err: any) {
      console.error('Failed to update client status', err);
      alert(err.message || 'Failed to update client status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  useEffect(() => {
    load();
  }, [currentWorkspace?.id, id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="material-symbols-outlined text-[32px] text-neutral-900 dark:text-white animate-spin mb-2">
          progress_activity
        </span>
        <p className="text-xs text-neutral-500">Loading client profile...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Client not found</h2>
        <Button variant="secondary" size="sm" onClick={() => navigate('/clients')} className="mt-4">
          Return to Clients Directory
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/clients')}
            className="p-1.5 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                {client.company_name || client.name}
              </h1>
              <Badge variant={client.status === 'active' ? 'ready' : 'neutral'}>
                {client.status === 'active' ? 'Active Client' : 'Archived Client'}
              </Badge>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Primary Contact: {client.name} • Email: {client.email}
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon="edit"
            onClick={() => setIsEditModalOpen(true)}
          >
            Edit Client
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={client.status === 'active' ? 'archive' : 'unarchive'}
            onClick={() => setIsStatusModalOpen(true)}
          >
            {client.status === 'active' ? 'Archive' : 'Reactivate'}
          </Button>

          {client.status === 'active' ? (
            <Button
              variant="primary"
              size="sm"
              icon="add"
              onClick={() => navigate(`/requests/new?client_id=${client.id}`)}
            >
              Create Request
            </Button>
          ) : (
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-lg flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">info</span>
              <span>Reactivate client to create new requests</span>
            </div>
          )}
        </div>
      </div>

      {/* Client Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card elevation="low" className="p-4">
          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Contact Details</span>
          <div className="mt-2 text-xs flex flex-col gap-1.5 text-neutral-700 dark:text-neutral-300">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[15px] text-neutral-400 dark:text-neutral-500">mail</span>
              <span>{client.email}</span>
            </div>
            {client.phone && (
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[15px] text-neutral-400 dark:text-neutral-500">call</span>
                <span>{client.phone}</span>
              </div>
            )}
            {client.notes && (
              <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                <span className="text-[11px] text-neutral-400 dark:text-neutral-500 block font-medium">Notes:</span>
                <p className="text-xs mt-0.5 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </div>
        </Card>

        <Card elevation="low" className="p-4">
          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Active Document Cycles</span>
          <div className="mt-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
            {requests.length} <span className="text-xs font-normal text-neutral-500 dark:text-neutral-400">cycles</span>
          </div>
        </Card>

        <Card elevation="low" className="p-4">
          <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Audit Trail Status</span>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            <span className="material-symbols-outlined text-[16px] text-emerald-600 dark:text-emerald-400">verified</span>
            <span>All document uploads logged & verified</span>
          </div>
        </Card>
      </div>

      {/* Requests Section */}
      <div className="flex flex-col gap-4">
        <h2 className="font-bold text-base text-neutral-900 dark:text-neutral-100">Document Requests for this Client</h2>

        {requests.length === 0 ? (
          <Card elevation="low" className="p-8 text-center flex flex-col items-center">
            <span className="material-symbols-outlined text-[32px] text-neutral-400 dark:text-neutral-500 mb-2">autorenew</span>
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">No requests dispatched yet</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mt-1 mb-4">
              Send your first recurring or one-time document request to {client.company_name || client.name}.
            </p>
            <Button
              variant="primary"
              size="sm"
              icon="add"
              onClick={() => navigate(`/requests/new?client_id=${client.id}`)}
            >
              Create Request
            </Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((r) => (
              <Card
                key={r.id}
                elevation="hover"
                className="p-4 flex flex-col gap-3 cursor-pointer"
                onClick={() => navigate(`/requests/${r.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">{r.title}</span>
                      <Badge variant={r.status}>{r.status?.toUpperCase()}</Badge>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Period: {r.period} • Due Date: {r.due_date}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" icon="arrow_forward" iconPosition="right">
                    View
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Client Modal */}
      <EditClientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        client={client}
        onSuccess={(updated) => {
          setClient(updated);
        }}
      />

      {/* Archive / Reactivate Confirmation Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={client.status === 'active' ? 'Archive Client' : 'Reactivate Client'}
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
            {client.status === 'active' ? (
              <>
                Are you sure you want to archive <strong>{client.company_name || client.name}</strong>?
                <br /><br />
                Archiving hides this client from the active directory and prevents dispatching new document requests.
                <strong> All historical requests, uploaded documents, and audit logs are safely preserved.</strong>
              </>
            ) : (
              <>
                Reactivate <strong>{client.company_name || client.name}</strong>?
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
              onClick={() => setIsStatusModalOpen(false)}
              disabled={isUpdatingStatus}
            >
              Cancel
            </Button>
            <Button
              variant={client.status === 'active' ? 'secondary' : 'primary'}
              size="md"
              type="button"
              isLoading={isUpdatingStatus}
              icon={client.status === 'active' ? 'archive' : 'unarchive'}
              onClick={handleConfirmStatusToggle}
            >
              {client.status === 'active' ? 'Archive Client' : 'Reactivate Client'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
