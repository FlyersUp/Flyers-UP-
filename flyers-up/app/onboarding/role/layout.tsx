export default function OnboardingRoleLayout({ children }: { children: React.ReactNode }) {
  // AccentDensity: focus (decision screen)
  // Role is not yet known here, so we intentionally omit data-role.
  return <div data-accent="focus">{children}</div>;
}

