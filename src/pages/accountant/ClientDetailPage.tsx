import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { clientService } from '../../services/clients';
import { requestService } from '../../services/requests';
import type { Client } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';

export const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentWorkspace } = useAuth();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    load();
  }, [currentWorkspace?.id, id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="material-symbols-outlined text-[32px] text-primary-container animate-spin mb-2">
          progress_activity
        </span>
        <p className="text-xs text-slate-500">Loading client profile...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-bold text-slate-900">Client not found</h2>
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {client.company_name || client.name}
              </h1>
              <Badge variant="ready">Active Client</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Primary Contact: {client.name} • Email: {client.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon="add"
            onClick={() => navigate(`/requests/new?client_id=${client.id}`)}
          >
            Create Request
          </Button>
        </div>
      </div>

      {/* Client Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card elevation="low" className="p-4">
          <span className="text-xs text-slate-500 font-medium">Contact Details</span>
          <div className="mt-2 text-xs flex flex-col gap-1.5 text-slate-700">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[15px] text-slate-400">mail</span>
              <span>{client.email}</span>
            </div>
            {client.phone && (
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[15px] text-slate-400">call</span>
                <span>{client.phone}</span>
              </div>
            )}
          </div>
        </Card>

        <Card elevation="low" className="p-4">
          <span className="text-xs text-slate-500 font-medium">Active Document Cycles</span>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {requests.length} <span className="text-xs font-normal text-slate-500">cycles</span>
          </div>
        </Card>

        <Card elevation="low" className="p-4">
          <span className="text-xs text-slate-500 font-medium">Audit Trail Status</span>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
            <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
            <span>All document uploads logged & verified</span>
          </div>
        </Card>
      </div>

      {/* Requests Section */}
      <div className="flex flex-col gap-4">
        <h2 className="font-bold text-base text-slate-900">Document Requests for this Client</h2>

        {requests.length === 0 ? (
          <Card elevation="low" className="p-8 text-center flex flex-col items-center">
            <span className="material-symbols-outlined text-[32px] text-slate-400 mb-2">autorenew</span>
            <h3 className="font-semibold text-sm text-slate-900">No requests dispatched yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
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
                      <span className="font-semibold text-sm text-slate-900">{r.title}</span>
                      <Badge variant={r.status}>{r.status?.toUpperCase()}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
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
    </div>
  );
};
