import { launchModeBlockToHome } from '@/lib/launchModeServer';

export default async function CustomerRequestsLayout({ children }: { children: React.ReactNode }) {
  await launchModeBlockToHome('customer');
  return children;
}
