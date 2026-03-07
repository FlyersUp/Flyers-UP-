export default async function ProLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#0F1115] text-[#111111] dark:text-[#F5F7FA]">
      {children}
    </div>
  );
}

