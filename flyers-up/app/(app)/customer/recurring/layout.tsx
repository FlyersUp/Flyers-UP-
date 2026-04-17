import { launchModeBlockToHome } from '@/lib/launchModeServer';

export default async function CustomerRecurringLayout({ children }: { children: React.ReactNode }) {
  await launchModeBlockToHome('customer');
  return children;
}
