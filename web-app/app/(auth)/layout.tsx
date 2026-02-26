export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-6 md:p-8 md:py-12">
      <div className="w-full max-w-md md:shadow-xl md:rounded-2xl md:border md:border-[#e2e8f0]">
        {children}
      </div>
    </div>
  );
}
