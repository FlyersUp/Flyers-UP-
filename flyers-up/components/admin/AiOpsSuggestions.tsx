/**
 * AI Ops Suggestions section for admin dashboard.
 * Non-destructive insight cards for future automation.
 * TODO: Wire to real AI suggestions when backend supports it.
 * Do NOT implement real automation yet.
 */

export interface AiOpsSuggestion {
  id: string;
  title: string;
  description: string;
  severity?: 'info' | 'warning' | 'suggestion';
}

interface AiOpsSuggestionsProps {
  /** Suggestions to display. If empty, shows scaffolded placeholders. */
  suggestions: AiOpsSuggestion[];
}

export function AiOpsSuggestions({ suggestions }: AiOpsSuggestionsProps) {
  const items = suggestions.length > 0 ? suggestions : [
    {
      id: '1',
      title: 'Cleaning supply low in Brooklyn',
      description: 'Suggest notifying nearby pros',
      severity: 'warning' as const,
    },
    {
      id: '2',
      title: '3 jobs waiting > 20 min',
      description: 'Recommend surge +10% in Queens',
      severity: 'suggestion' as const,
    },
  ];

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted">AI Ops Suggestions</h3>
      <p className="mt-1 text-xs text-muted">
        {/* TODO: Implement real AI rules engine when data available */}
        Future automation insights. Placeholder scaffolding.
      </p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-black/5 bg-surface2/30 px-3 py-2 text-sm"
          >
            <p className="font-medium text-text">{item.title}</p>
            <p className="text-xs text-muted">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
