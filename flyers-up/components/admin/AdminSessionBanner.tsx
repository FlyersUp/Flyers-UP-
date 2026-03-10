'use client';

import { useState } from 'react';

interface AdminSessionBannerProps {
  email: string | null;
  environment?: string;
}

export function AdminSessionBanner({ email, environment }: AdminSessionBannerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-medium text-text">
          Admin session active
          {email ? ` · ${email}` : ''}
        </span>
        <span className="text-xs text-muted">{expanded ? 'Hide' : 'Show'} debug</span>
      </button>
      {expanded && (
        <div className="mt-3 rounded-lg bg-surface2/50 p-3 text-xs text-muted">
          <p>Environment: {environment ?? '—'}</p>
          <p>Signed in as: {email ?? '(no user)'}</p>
        </div>
      )}
    </div>
  );
}
