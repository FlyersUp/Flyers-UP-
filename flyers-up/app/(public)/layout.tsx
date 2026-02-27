/**
 * Public layout — minimal, no server auth, no DB.
 * Cold starts don't affect first impression (landing, signin, signup, auth).
 */
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
