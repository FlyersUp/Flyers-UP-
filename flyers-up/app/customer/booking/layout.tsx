export default function CustomerBookingLayout({ children }: { children: React.ReactNode }) {
  // AccentDensity: focus (commit/confirmation flow)
  return (
    <div data-role="customer" data-accent="focus">
      {children}
    </div>
  );
}

