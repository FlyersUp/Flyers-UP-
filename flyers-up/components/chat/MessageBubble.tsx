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
        <span className="text-xs text-[#8A8A8A] dark:text-[#7A8490] bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-full">
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
            ? 'rounded-br-md bg-[#058954] text-white'
            : 'rounded-bl-md bg-white dark:bg-[#1D2128] text-[#111111] dark:text-[#F5F7FA] border border-black/5 dark:border-white/10 shadow-sm'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message}</p>
        <div
          className={`text-[10px] mt-1 ${isMine ? 'text-white/80 text-right' : 'text-[#8A8A8A] dark:text-[#7A8490] text-right'}`}
        >
          {formatTime(createdAt)}
        </div>
      </div>
    </div>
  );
}
