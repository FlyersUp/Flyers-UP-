'use client';

export interface MessageBubbleProps {
  id: string;
  message: string;
  createdAt: string;
  isMine: boolean;
  /** System messages (e.g. "Pro accepted") — centered, muted */
  isSystem?: boolean;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function MessageBubble({ id, message, createdAt, isMine, isSystem }: MessageBubbleProps) {
  if (isSystem) {
    return (
      <div className="flex justify-center py-2" role="status">
        <span className="rounded-full bg-surface2 px-3 py-1.5 text-xs text-text3">
          {message}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
      data-sender={isMine ? 'customer' : 'pro'}
    >
      <div
        className={`max-w-[75%] min-w-[60px] px-4 py-2.5 rounded-2xl ${
          isMine
            ? 'rounded-br-md border border-[hsl(var(--accent-customer)/0.7)] bg-[hsl(var(--accent-customer)/0.9)] text-[hsl(var(--accent-contrast))]'
            : 'rounded-bl-md border border-border bg-surface text-text shadow-[var(--shadow-1)]'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message}</p>
        <div
          className={`mt-1 text-[10px] text-right ${isMine ? 'text-[hsl(var(--accent-contrast)/0.78)]' : 'text-text3'}`}
        >
          {formatTime(createdAt)}
        </div>
      </div>
    </div>
  );
}
