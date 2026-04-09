'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SUPPORT_TICKET_CATEGORIES } from '@/lib/support/ticket-categories';
import { OFFICIAL_SUPPORT_EMAIL_DISPLAY } from '@/lib/support/official-contact';
import { supabase } from '@/lib/supabaseClient';
import {
  SUPPORT_ATTACHMENT_MAX_FILES,
  supportAttachmentExtension,
  validateSupportAttachmentFiles,
} from '@/lib/support/support-attachment-rules';

interface SupportMessageFormProps {
  role?: 'customer' | 'pro';
  /** `public` matches legal/support pages (CSS variables). */
  variant?: 'settings' | 'public';
  enableAttachments?: boolean;
}

export function SupportMessageForm({
  role = 'customer',
  variant = 'settings',
  enableAttachments = true,
}: SupportMessageFormProps) {
  const [category, setCategory] = useState<string>('other');
  const [subjectLine, setSubjectLine] = useState('');
  const [message, setMessage] = useState('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [fileHint, setFileHint] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successDetail, setSuccessDetail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectClass =
    variant === 'public'
      ? 'w-full px-3 py-2 rounded-xl border border-border bg-surface text-text text-sm focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none'
      : 'w-full px-3 py-2 rounded-xl border border-black/10 bg-white text-text text-sm focus:ring-2 focus:ring-accent/40 focus:border-accent outline-none';

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []).slice(0, SUPPORT_ATTACHMENT_MAX_FILES);
    const err = validateSupportAttachmentFiles(picked);
    setFileHint(err);
    setFiles(err ? [] : picked);
    e.target.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Please enter your message.');
      return;
    }

    const attErr = files.length ? validateSupportAttachmentFiles(files) : null;
    if (attErr) {
      setError(attErr);
      return;
    }

    setError(null);
    setSending(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          subject: subjectLine.trim() || undefined,
          message: trimmed,
          includeDiagnostics,
          role,
          clientPath: typeof window !== 'undefined' ? window.location.pathname : null,
          expects_attachments: enableAttachments && files.length > 0,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
        ticketId?: string;
      };
      if (!res.ok || !data.success || !data.ticketId) {
        setError(data.error ?? 'Failed to send.');
        return;
      }

      const ticketId = data.ticketId;
      let attachNote = '';

      if (enableAttachments && files.length > 0) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setSuccess(true);
          setSuccessDetail(
            `${data.message ?? ''} Attachments were not uploaded (session missing). You can email files to ${OFFICIAL_SUPPORT_EMAIL_DISPLAY} and reference your ticket.`.trim()
          );
          setMessage('');
          setSubjectLine('');
          setFiles([]);
          return;
        }

        const uploadedPaths: string[] = [];
        for (const file of files) {
          const ext = supportAttachmentExtension(file) || '.bin';
          const objectPath = `${user.id}/${ticketId}/${crypto.randomUUID()}${ext}`;
          const { error: upErr } = await supabase.storage.from('support_attachments').upload(objectPath, file, {
            contentType: file.type || undefined,
            upsert: false,
          });
          if (upErr) {
            attachNote = ' Ticket was saved but one or more attachments failed to upload.';
            break;
          }
          uploadedPaths.push(objectPath);
        }

        if (uploadedPaths.length > 0) {
          const patchRes = await fetch(`/api/support/tickets/${ticketId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attachment_storage_paths: uploadedPaths }),
          });
          if (!patchRes.ok) {
            attachNote = ' Ticket was saved but we could not link attachments to the ticket.';
          }
        }
      }

      setSuccess(true);
      setSuccessDetail(`${data.message ?? 'Ticket saved.'}${attachNote}`.trim());
      setMessage('');
      setSubjectLine('');
      setFiles([]);
    } catch {
      setError('Failed to send.');
    } finally {
      setSending(false);
    }
  }

  if (success) {
    return (
      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm space-y-2 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-100">
        <p className="font-medium">Ticket received</p>
        <p>{successDetail ?? 'We saved your request.'}</p>
        <p className="text-xs opacity-90">
          Official contact:{' '}
          <a href={`mailto:${OFFICIAL_SUPPORT_EMAIL_DISPLAY}`} className="underline font-medium">
            {OFFICIAL_SUPPORT_EMAIL_DISPLAY}
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="support-category" className="block text-sm font-medium text-text mb-1">
          Category
        </label>
        <select
          id="support-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={selectClass}
        >
          {SUPPORT_TICKET_CATEGORIES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="support-subject-line" className="block text-sm font-medium text-text mb-1">
          Subject <span className="text-muted font-normal">(optional)</span>
        </label>
        <Input
          id="support-subject-line"
          value={subjectLine}
          onChange={(e) => setSubjectLine(e.target.value)}
          maxLength={200}
          placeholder="Short summary"
          className="w-full"
        />
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
          {includeDiagnostics
            ? 'We may include basic request metadata (path, user agent) to help debug.'
            : 'Diagnostics are off for this message.'}
        </p>
      </div>

      {enableAttachments ? (
        <div>
          <label htmlFor="support-files" className="block text-sm font-medium text-text mb-1">
            Attachments <span className="text-muted font-normal">(optional)</span>
          </label>
          <input
            id="support-files"
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,application/pdf"
            onChange={onPickFiles}
            className="block w-full text-sm text-muted file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-surface2 file:text-text"
          />
          <p className="mt-1 text-xs text-muted">
            Up to {SUPPORT_ATTACHMENT_MAX_FILES} files (PNG, JPEG, WebP, or PDF), 4 MB each. Stored privately for support
            staff.
          </p>
          {fileHint ? <p className="mt-1 text-xs text-red-600">{fileHint}</p> : null}
          {files.length > 0 ? (
            <ul className="mt-2 text-xs text-muted list-disc pl-5">
              {files.map((f) => (
                <li key={f.name + f.size}>{f.name}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={includeDiagnostics}
          onChange={(e) => setIncludeDiagnostics(e.target.checked)}
          className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
        />
        <span className="text-sm text-muted">Include diagnostic info (path, user agent, API route)</span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={sending || !message.trim()} showArrow={false}>
        {sending ? 'Sending…' : 'Submit ticket'}
      </Button>
    </form>
  );
}
