export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse at center, #0d1640 0%, #070c1f 50%, #040810 100%)",
      }}
    >
      {children}
    </div>
  );
}
