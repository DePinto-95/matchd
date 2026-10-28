'use client';

import { useState } from 'react';
import { ReportReason } from '@matchd/shared/enums';
import { Button } from '@/components/ui/Button';

/** Labels for the reasons offered when reporting a player. */
const REPORT_REASONS: Record<ReportReason, string> = {
  [ReportReason.SpamScam]: 'Spam / Scam',
  [ReportReason.InappropriateBehavior]: 'Inappropriate Behavior',
  [ReportReason.FakeProfile]: 'Fake Profile',
  [ReportReason.Other]: 'Other',
};

interface ReportPlayerModalProps {
  submitting: boolean;
  onSubmit: (reason: ReportReason, details?: string) => Promise<void>;
  onClose: () => void;
}

export function ReportPlayerModal({ submitting, onSubmit, onClose }: ReportPlayerModalProps) {
  const [reason, setReason] = useState<ReportReason>(ReportReason.SpamScam);
  const [details, setDetails] = useState('');

  const submit = async () => {
    await onSubmit(reason, details.trim() || undefined);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-sm">
        <h2 className="font-heading font-bold text-lg text-text mb-4">Report User</h2>

        <div className="flex flex-col gap-3 mb-4">
          {(Object.entries(REPORT_REASONS) as [ReportReason, string][]).map(([value, label]) => (
            <label key={value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="reportReason"
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
                className="accent-brand"
              />
              <span className="text-sm text-text">{label}</span>
            </label>
          ))}
        </div>

        <textarea
          placeholder="Additional details (optional)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-xl bg-background border border-border text-text text-sm placeholder:text-text-muted focus:outline-none focus:border-brand resize-none mb-4"
        />

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" loading={submitting} onClick={submit}>Submit</Button>
        </div>
      </div>
    </div>
  );
}
