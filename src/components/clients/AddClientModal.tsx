import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { clientService } from '../../services/clients';
import type { Client } from '../../types';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newClient?: Client) => void;
}

export const AddClientModal: React.FC<AddClientModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentWorkspace, user } = useAuth();

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setCompanyName('');
    setEmail('');
    setPhone('');
    setNotes('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedCompanyName = companyName.trim();
    const trimmedPhone = phone.trim();
    const trimmedNotes = notes.trim();

    if (!trimmedName) {
      setError('Primary contact person is required.');
      return;
    }

    if (!trimmedEmail) {
      setError('Client notification email is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please provide a valid email address.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const created = await clientService.createClient(
        currentWorkspace.id,
        currentWorkspace.plan,
        {
          name: trimmedName,
          company_name: trimmedCompanyName || undefined,
          email: trimmedEmail,
          phone: trimmedPhone || undefined,
          notes: trimmedNotes || undefined,
        },
        user?.id
      );

      resetForm();
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add client.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Client"
      description="Onboard an accounting or bookkeeping client to DocChase."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-rose-600 dark:text-rose-400">error</span>
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Company / Legal Entity Name"
          placeholder="e.g. Acme Retail Ltd"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          helperText="The client's business or organization name."
          disabled={isSubmitting}
        />

        <Input
          label="Primary Contact Person"
          required
          placeholder="e.g. John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
        />

        <Input
          label="Client Notification Email"
          type="email"
          required
          placeholder="john@acme.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          helperText="Secure links and smart reminders will be sent to this email."
          disabled={isSubmitting}
        />

        <Input
          label="Phone Number (Optional)"
          placeholder="+1 (555) 019-2834"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isSubmitting}
        />

        <div>
          <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
            Internal Notes (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Key client details, engagement scope, or notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 focus:border-neutral-900 dark:focus:border-white focus:ring-1 focus:ring-neutral-900/15 dark:focus:ring-white/20 outline-none text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800 mt-2">
          <Button variant="secondary" size="md" type="button" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="md" type="submit" isLoading={isSubmitting} icon="check">
            Create Client
          </Button>
        </div>
      </form>
    </Modal>
  );
};
