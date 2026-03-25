import { GuidanceProvider } from '@/components/guidance/GuidanceProvider';
import { AppSessionProvider } from '@/contexts/AppSessionContext';

/**
 * Authenticated app shell layout.
 * Single session bootstrap + guidance (allowlisted onboarding modal).
 */
export default function AppLayoutShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppSessionProvider>
      <GuidanceProvider>{children}</GuidanceProvider>
    </AppSessionProvider>
  );
}
