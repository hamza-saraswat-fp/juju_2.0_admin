import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Question Log", to: "/questions" },
  { label: "Knowledge Health", to: "/knowledge" },
  { label: "Bot Config", to: "/config" },
];

export function Header() {
  return (
    <header className="fixed top-0 z-50 flex h-16 w-full items-center border-b border-white/[0.06] bg-primary-navy/80 px-6 shadow-[0_8px_32px_-16px_rgba(0,3,77,0.45)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
            <span className="text-sm font-bold text-white">J</span>
          </div>
          <span className="text-[1.0625rem] font-semibold tracking-tight text-white">
            Juju 2.0
          </span>
        </div>
        <nav className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "relative pb-1.5 text-sm font-medium tracking-tight transition-colors duration-200",
                  isActive
                    ? "text-white after:absolute after:inset-x-0 after:-bottom-2 after:h-0.5 after:rounded-full after:bg-page-accent after:shadow-[0_0_12px_var(--color-page-accent)]"
                    : "text-white/60 hover:text-white",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
