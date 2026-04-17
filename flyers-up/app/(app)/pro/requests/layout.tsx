import { launchModeBlockToHome } from '@/lib/launchModeServer';

export default async function ProRequestsLayout({ children }: { children: React.ReactNode }) {
  await launchModeBlockToHome('pro');
  return children;
}
