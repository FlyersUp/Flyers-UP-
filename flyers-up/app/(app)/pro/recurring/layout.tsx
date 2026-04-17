import { launchModeBlockToHome } from '@/lib/launchModeServer';

export default async function ProRecurringLayout({ children }: { children: React.ReactNode }) {
  await launchModeBlockToHome('pro');
  return children;
}
