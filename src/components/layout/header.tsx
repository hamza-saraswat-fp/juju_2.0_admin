import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Question Log", to: "/questions" },
  { label: "Knowledge Health", to: "/knowledge" },
  { label: "Bot Config", to: "/config" },
];

export function Header() {
  return (
    <header className="fixed top-0 z-50 flex h-16 w-full items-center bg-primary-navy px-6">
      <div className="flex items-center gap-8">
        <span className="text-xl font-bold tracking-tight text-white">
          Juju 2.0
        </span>
        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "pb-1 text-[0.6875rem] font-bold uppercase tracking-widest transition-colors duration-200",
                  isActive
                    ? "border-b-2 border-primary-blue text-white"
                    : "text-slate-400 hover:text-white",
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
