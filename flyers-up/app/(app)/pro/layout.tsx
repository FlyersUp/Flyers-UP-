export default async function ProLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#111111] dark:bg-[#131313] dark:text-white">
      {children}
    </div>
  );
}

