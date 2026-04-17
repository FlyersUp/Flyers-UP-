import { launchModeBlockToHome } from '@/lib/launchModeServer';

export default async function ProGrowthLayout({ children }: { children: React.ReactNode }) {
  await launchModeBlockToHome('pro');
  return children;
}
