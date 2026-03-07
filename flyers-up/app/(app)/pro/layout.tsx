export default async function ProLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#18181B] text-[#111111] dark:text-[#F3F4F6]">
      {children}
    </div>
  );
}

