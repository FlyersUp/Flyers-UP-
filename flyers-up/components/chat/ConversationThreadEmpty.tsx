'use client';

export interface ConversationThreadEmptyProps {
  title?: string;
  subtitle?: string;
}

export function ConversationThreadEmpty({
  title = 'Start the conversation',
  subtitle = 'Send a message to ask questions or coordinate details.',
}: ConversationThreadEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#058954]/10 dark:bg-[#058954]/20 mb-4">
        <svg
          className="w-7 h-7 text-[#058954]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-[#111111] dark:text-[#F5F7FA]">{title}</h3>
      <p className="mt-2 text-sm text-[#6A6A6A] dark:text-[#A1A8B3] max-w-xs">{subtitle}</p>
    </div>
  );
}
