import { launchModeBlockToHome } from '@/lib/launchModeServer';

export default async function CustomerBookingIssuesLayout({ children }: { children: React.ReactNode }) {
  await launchModeBlockToHome('customer');
  return children;
}
