export default async function ProLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#111111] dark:bg-[#2d2d2d] dark:text-white">
      {children}
    </div>
  );
}

