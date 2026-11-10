"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Compass,
  LayoutDashboard,
  UserRound,
  Sparkles,
  ChartNoAxesCombined,
  GitBranch,
  BookOpen,
  Settings,
  ArrowUpRight,
  Menu,
  X,
  Coins,
  Images,
  ShoppingBag,
  Regex,
  Sprout,
  Search,
  ShieldCheck,
  Hammer,
  GitCompare,
} from "lucide-react";
import { useStatus } from "@/lib/client";
const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/characters", label: "Characters", icon: UserRound },
  { href: "/filters", label: "Loot filters", icon: Sparkles },
  { href: "/leagues", label: "Leagues & ladders", icon: ChartNoAxesCombined },
  { href: "/currency", label: "Currency exchange", icon: Coins },
  { href: "/trade", label: "Item trade", icon: ShoppingBag },
  { href: "/regex", label: "Search Toolkit", icon: Regex },
  { href: "/inspect", label: "Item inspector", icon: Search },
  { href: "/safety", label: "Map safety", icon: ShieldCheck },
  { href: "/crafting", label: "Crafting workbench", icon: Hammer },
  { href: "/genesis", label: "Genesis Tree", icon: Sprout },
  { href: "/planner", label: "Passive planner", icon: GitBranch },
  { href: "/atlas", label: "Atlas planner", icon: Compass },
  { href: "/builds", label: "Build library", icon: BookOpen },
  { href: "/compare", label: "Build comparison", icon: GitCompare },
  { href: "/items", label: "Item gallery", icon: Images },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(),
    [open, setOpen] = useState(false),
    { data: status } = useStatus();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <button
          className="sidebar-close icon-button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </button>
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Compass size={25} />
          </span>
          <span>
            EXILE<span className="brand-sub">ATLAS</span>
          </span>
          <span className="brand-version">II</span>
        </Link>
        <nav aria-label="Main navigation">
          {[
            { label: "Workspace", paths: ["/", "/characters"] },
            {
              label: "Planning",
              paths: [
                "/planner",
                "/atlas",
                "/genesis",
                "/builds",
                "/compare",
                "/crafting",
                "/safety",
              ],
            },
            {
              label: "Trading & loot",
              paths: ["/trade", "/currency", "/regex", "/filters", "/inspect"],
            },
            { label: "Reference", paths: ["/items", "/leagues"] },
          ].map((group) => (
            <div key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.paths.map((path) => {
                const { href, label, icon: Icon } = nav.find((item) => item.href === path)!;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`nav-item ${pathname === href ? "active" : ""}`}
                    aria-current={pathname === href ? "page" : undefined}
                  >
                    <Icon size={18} />
                    {label}
                    {pathname === href && <span className="nav-active-dot" />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className={`nav-item ${pathname === "/settings" ? "active" : ""}`}
          >
            <Settings size={18} />
            Settings
          </Link>
        </div>
      </aside>
      {open && (
        <button
          className="nav-overlay"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-toggle icon-button"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{nav.find((n) => n.href === pathname)?.label ?? "Settings"}</strong>
          </div>
          <div className="topbar-actions">
            <a
              className="docs-link"
              href="https://www.pathofexile.com/developer/docs"
              target="_blank"
              rel="noreferrer"
            >
              API docs <ArrowUpRight size={13} />
            </a>
            <span className="top-divider" />
            <Link href="/settings" className="account-button">
              <span className={`account-dot ${status?.connected ? "connected" : ""}`} />
              {status?.profile?.name ?? "Connect account"}
              <UserRound size={15} />
            </Link>
          </div>
        </header>
        <main id="main" className="main-content">
          {children}
        </main>
        <footer className="main-footer">
          <span>
            This product isn’t affiliated with or endorsed by Grinding Gear Games in any way.
          </span>
          <span>
            Made for the journey <Compass size={13} />
          </span>
        </footer>
      </div>
    </div>
  );
}

