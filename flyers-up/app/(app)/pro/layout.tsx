export default async function ProLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-text">
      {children}
    </div>
  );
}

