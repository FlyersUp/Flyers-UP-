'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';

const SUBJECT_OPTIONS = [
  { value: 'bug', label: 'Bug' },
  { value: 'billing', label: 'Billing' },
  { value: 'safety', label: 'Safety' },
  { value: 'account', label: 'Account' },
  { value: 'other', label: 'Other' },
];

interface SupportMessageFormProps {
  /** Role for context (Pro vs Customer) */
  role?: 'customer' | 'pro';
}

export function SupportMessageForm({ role = 'customer' }: SupportMessageFormProps) {
  const [subject, setSubject] = useState('other');
  const [message, setMessage] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Please enter your message.');
      return;
    }

    setError(null);
    setSending(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          message: trimmed,
          includeDiagnostics: includeDiagnostics,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (res.ok && data.success) {
        setSuccess(true);
        setMessage('');
      } else {
        setError(data.error ?? 'Failed to send.');
      }
    } catch {
      setError('Failed to send.');
    } finally {
      setSending(false);
    }
  }

  if (success) {
    return (
      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
        Sent. We&apos;ll reply by email.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="support-subject" className="block text-sm font-medium text-text mb-1">
          Subject
        </label>
        <select
          id="support-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-black/10 bg-white text-text text-sm focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none"
        >
          {SUBJECT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="support-message" className="block text-sm font-medium text-text mb-1">
          Message
        </label>
        <Textarea
          id="support-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Tell us what you're trying to do and what's going wrong..."
          className="w-full"
        />
        <p className="mt-1 text-xs text-muted">
          Your message is sent to support@flyersup.app
        </p>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={includeDiagnostics}
          onChange={(e) => setIncludeDiagnostics(e.target.checked)}
          className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
        />
        <span className="text-sm text-muted">Include diagnostic info (app version, device, path)</span>
      </label>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <Button
        type="submit"
        disabled={sending || !message.trim()}
        showArrow={false}
      >
        {sending ? 'Sending…' : 'Send message'}
      </Button>
    </form>
  );
}
