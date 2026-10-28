'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface InviteCodePanelProps {
  /** Returns true when the code matched, which closes the panel. */
  onVerify: (code: string) => boolean;
  onClose: () => void;
}

export function InviteCodePanel({ onVerify, onClose }: InviteCodePanelProps) {
  const [code, setCode] = useState('');

  const submit = () => {
    if (onVerify(code)) onClose();
  };

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col gap-4">
      <h3 className="font-semibold text-text">Have an invite code?</h3>
      <div className="flex gap-3">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="Enter code"
          className="flex-1 px-4 py-2.5 rounded-xl bg-surface-alt border border-border text-text focus:outline-none focus:border-brand"
        />
        <Button onClick={submit}>Unlock</Button>
      </div>
    </div>
  );
}
