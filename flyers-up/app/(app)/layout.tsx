import { GuidanceProvider } from '@/components/guidance/GuidanceProvider';

/**
 * Authenticated app shell layout.
 * GuidanceProvider shows one-time onboarding when appropriate.
 */
export default function AppLayoutShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <GuidanceProvider>{children}</GuidanceProvider>;
}
