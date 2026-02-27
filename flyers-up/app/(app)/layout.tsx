/**
 * Authenticated app shell layout.
 * Can add server auth, NavAlertsProvider, etc. here if desired.
 * Cold starts only affect these routes, not public pages.
 */
export default function AppLayoutShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
