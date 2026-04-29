import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./header";
import { Toaster } from "sonner";

export function AppShell() {
  const location = useLocation();
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-[1600px] px-6 pt-24 pb-12">
        <div
          key={location.pathname}
          className="animate-in fade-in slide-in-from-bottom-1 duration-300"
        >
          <Outlet />
        </div>
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}
