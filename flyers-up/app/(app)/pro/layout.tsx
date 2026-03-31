export default async function ProLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh min-h-[100svh] w-full max-w-full overflow-x-clip bg-bg text-text">
      {children}
    </div>
  );
}

