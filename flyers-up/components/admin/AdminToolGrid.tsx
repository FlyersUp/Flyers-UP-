/**
 * Grid of admin tool cards, grouped by category.
 */

import { AdminToolCard } from './AdminToolCard';

export interface AdminTool {
  href: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  status?: string;
}

export interface AdminToolGroup {
  title: string;
  tools: AdminTool[];
}

interface AdminToolGridProps {
  groups: AdminToolGroup[];
}

export function AdminToolGrid({ groups }: AdminToolGridProps) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.title}>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
            {group.title}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {group.tools.map((tool) => (
              <AdminToolCard
                key={tool.href}
                href={tool.href}
                title={tool.title}
                description={tool.description}
                icon={tool.icon}
                status={tool.status}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
