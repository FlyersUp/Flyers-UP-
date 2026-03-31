/**
 * Public layout — minimal, no server auth, no DB.
 * Cold starts don't affect first impression (landing, signin, signup, auth).
 *
 * Uses .public-light to force light branded design regardless of app dark mode.
 * Landing, signin, signup, auth, privacy, etc. stay fixed in light theme.
 */
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="public-light min-h-dvh min-h-[100svh] w-full max-w-full overflow-x-clip">
      {children}
    </div>
  );
}
