import { launchModeBlockToHome } from '@/lib/launchModeServer';

export default async function ProSmartDashboardLayout({ children }: { children: React.ReactNode }) {
  await launchModeBlockToHome('pro');
  return children;
}
