/**
 * Settings segment layout
 *
 * Keep this layout minimal to satisfy Next.js route type validation.
 * Auth gating is handled within pages/components, not by fabricating users/tokens here.
 */

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}





