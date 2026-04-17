import { launchModeBlockToHome } from '@/lib/launchModeServer';

export default async function CustomerRequestStartLayout({ children }: { children: React.ReactNode }) {
  await launchModeBlockToHome('customer');
  return children;
}
