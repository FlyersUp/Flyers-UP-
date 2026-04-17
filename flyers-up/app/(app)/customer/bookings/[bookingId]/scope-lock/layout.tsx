import { launchModeBlockToHome } from '@/lib/launchModeServer';

export default async function CustomerScopeLockLayout({ children }: { children: React.ReactNode }) {
  await launchModeBlockToHome('customer');
  return children;
}
