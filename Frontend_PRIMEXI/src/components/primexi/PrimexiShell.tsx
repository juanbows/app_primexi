import { BottomNavigation } from "@/components/primexi/BottomNavigation";
import { Header } from "@/components/primexi/Header";

export function PrimexiShell({
  children,
  showNavigation = true,
}: Readonly<{
  children: React.ReactNode;
  showNavigation?: boolean;
}>) {
  return (
    <div className="app-shell text-white">
      <div className="app-noise" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col">
        <Header />
        <main
          className={`flex flex-1 flex-col px-4 ${
            showNavigation
              ? "pb-[calc(8.75rem+env(safe-area-inset-bottom))]"
              : "pb-[calc(2rem+env(safe-area-inset-bottom))]"
          }`}
        >
          {children}
        </main>
        {showNavigation ? <BottomNavigation /> : null}
      </div>
    </div>
  );
}
