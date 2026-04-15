import { Outlet } from "react-router-dom";
import { Header } from "./header";
import { Toaster } from "sonner";

export function AppShell() {
  return (
    <div className="min-h-screen bg-surface">
      <Header />
      <main className="mx-auto max-w-[1600px] px-6 pt-24 pb-12">
        <Outlet />
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}
