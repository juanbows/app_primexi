import { BottomNavigation } from "@/components/primexi/BottomNavigation";
import { Header } from "@/components/primexi/Header";

export function PrimexiShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#38003c] via-[#2a0029] to-[#38003c] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col">
        <Header />
        <main className="flex flex-1 flex-col px-4 pb-28">{children}</main>
        <BottomNavigation />
      </div>
    </div>
  );
}
