'use client';

import Link from 'next/link';

export interface ConversationThreadErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function ConversationThreadError({
  message = 'Could not load messages.',
  onRetry,
}: ConversationThreadErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
        <svg
          className="w-7 h-7 text-amber-600 dark:text-amber-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <p className="text-sm text-[#6A6A6A] dark:text-[#A1A8B3]">{message}</p>
      <div className="mt-4 flex gap-3">
        <Link
          href="/customer/messages"
          className="text-sm font-medium text-[#058954] hover:text-[#047a48] dark:hover:text-[#2dd68a]"
        >
          Back to messages
        </Link>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-sm font-medium text-[#058954] hover:text-[#047a48] dark:hover:text-[#2dd68a]"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
