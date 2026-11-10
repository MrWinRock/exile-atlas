"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  GitBranch,
  Sparkles,
  Coins,
  UserRound,
  BookOpen,
  ChartNoAxesCombined,
  ShieldCheck,
  Compass,
  Plus,
  Regex,
  Sprout,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace-store";
import { useRegexWorkspace } from "@/lib/regex-store";
import { useGenesisWorkspace } from "@/lib/genesis-store";
import { useStatus } from "@/lib/client";
import { SectionHeader } from "./ui";
const tools = [
  {
    href: "/atlas",
    title: "Atlas planner",
    description: "Plan connected Atlas branches and keep your mapping routes.",
    icon: Compass,
  },
  {
    href: "/inspect",
    title: "Item inspector",
    description: "Inspect copied item facts and prepare complete searches.",
    icon: Compass,
  },
  {
    href: "/safety",
    title: "Map safety",
    description: "Apply saved build-risk rules with actual-roll explanations.",
    icon: ShieldCheck,
  },
  {
    href: "/crafting",
    title: "Crafting workbench",
    description: "Browse sourced modifiers and save recipes with actual spend.",
    icon: Coins,
  },
  {
    href: "/compare",
    title: "Build comparison",
    description: "Inspect differences while preserving weapon-set membership.",
    icon: GitBranch,
  },
  {
    href: "/regex",
    title: "Search Toolkit",
    description: "Create in-game searches and keep your favorite presets.",
    icon: Regex,
  },
  {
    href: "/genesis",
    title: "Genesis Tree",
    description: "Explore the Genesis crafting tree and save a plan.",
    icon: Sprout,
  },
  {
    href: "/characters",
    title: "Characters",
    description: "Your gear, gems, and passive choices. All in one place.",
    icon: UserRound,
  },
  {
    href: "/currency",
    title: "Currency exchange",
    description: "Explore exchange ratios and volumes from hourly digests.",
    icon: Coins,
  },
  {
    href: "/planner",
    title: "Passive planner",
    description: "Explore the passive tree and sketch your next build.",
    icon: GitBranch,
  },
  {
    href: "/filters",
    title: "Loot filters",
    description: "Craft a loot filter that highlights exactly what you need.",
    icon: Sparkles,
  },
  {
    href: "/builds",
    title: "Build library",
    description: "Create, save, and export guides for the in-game planner.",
    icon: BookOpen,
  },
  {
    href: "/leagues",
    title: "Leagues & ladders",
    description: "Browse leagues and follow the top 1,000 exiles.",
    icon: ChartNoAxesCombined,
  },
];
const shortcutsKey = "exile-atlas:shortcuts";
const shortcutsEvent = "exile-atlas:shortcuts-changed";
const defaultShortcuts = JSON.stringify(["/planner", "/regex", "/currency"]);
function subscribeShortcuts(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(shortcutsEvent, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(shortcutsEvent, listener);
  };
}
function shortcutSnapshot() {
  try {
    return localStorage.getItem(shortcutsKey) ?? defaultShortcuts;
  } catch {
    return defaultShortcuts;
  }
}
function serverShortcuts() {
  return defaultShortcuts;
}
export function Dashboard() {
  const presets = useRegexWorkspace((s) => s.presets);
  const presetCount = presets.length;
  const rawShortcuts = useSyncExternalStore(subscribeShortcuts, shortcutSnapshot, serverShortcuts);
  let shortcuts: string[] = [];
  try {
    const parsed: unknown = JSON.parse(rawShortcuts);
    if (Array.isArray(parsed))
      shortcuts = parsed.filter((value): value is string => typeof value === "string");
  } catch {
    shortcuts = [];
  }
  function toggleShortcut(href: string) {
    const next = shortcuts.includes(href)
      ? shortcuts.filter((value) => value !== href)
      : [...shortcuts, href];
    try {
      localStorage.setItem(shortcutsKey, JSON.stringify(next));
      window.dispatchEvent(new Event(shortcutsEvent));
    } catch {
      /* Browser storage can be unavailable. */
    }
  }
  const genesisPlans = useGenesisWorkspace((s) => s.plans);
  const genesisPlanCount = genesisPlans.length;
  const { builds, filters } = useWorkspace(),
    { data: status, isLoading: statusLoading, isError: statusError } = useStatus();
  const recent = [
    ...builds.map((b) => ({
      id: `build-${b.id}`,
      name: b.build.name,
      updatedAt: b.updatedAt,
      href: "/builds",
      type: "Build",
    })),
    ...filters.map((f) => ({
      id: `filter-${f.id}`,
      name: f.name,
      updatedAt: f.updatedAt,
      href: "/filters",
      type: "Loot filter",
    })),
    ...genesisPlans.map((p) => ({
      id: `genesis-${p.id}`,
      name: p.name,
      updatedAt: p.updatedAt,
      href: "/genesis",
      type: "Genesis plan",
    })),
    ...presets.map((p) => ({
      id: `regex-${p.id}`,
      name: p.name,
      updatedAt: p.updatedAt,
      href: "/regex",
      type: "Search preset",
    })),
  ]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);
  return (
    <div className="dashboard">
      <div className="dashboard-intro">
        <div>
          <h1>Your Path of Exile 2 workspace</h1>
          <p>Plan builds, manage loot filters, and explore the economy.</p>
        </div>
        <Link href="/planner" className="button primary">
          Open passive planner <ArrowUpRight size={17} />
        </Link>
      </div>
      <div className="workspace-metrics">
        <Link href="/builds">
          <BookOpen size={18} />
          <div>
            <span>Saved builds</span>
            <strong>{builds.length}</strong>
          </div>
          <ArrowUpRight size={15} />
        </Link>
        <Link href="/filters">
          <Sparkles size={18} />
          <div>
            <span>Filter drafts</span>
            <strong>{filters.length}</strong>
          </div>
          <ArrowUpRight size={15} />
        </Link>
        <Link href="/settings">
          <ShieldCheck size={18} />
          <div>
            <span>GGG account</span>
            <strong className="metric-text">
              {statusLoading ? "Checking…" : statusError ? "Unavailable" : status?.connected ? "Connected" : "Not connected"}
            </strong>
          </div>
          <span className={`account-dot ${status?.connected ? "connected" : ""}`} />
        </Link>
        <Link href="/currency">
          <Coins size={18} />
          <div>
            <span>Exchange data</span>
            <strong className="metric-text">Hourly history</strong>
          </div>
          <ArrowUpRight size={15} />
        </Link>
      </div>
      <section className="panel" style={{ padding: "20px", marginBottom: "24px" }}>
        <SectionHeader title="Your shortcuts" />
        <div className="button-group">
          {tools
            .filter((tool) => shortcuts.includes(tool.href))
            .map((tool) => (
              <Link key={tool.href} href={tool.href} className="button secondary">
                {tool.title} <ArrowUpRight size={14} />
              </Link>
            ))}
        </div>
        <details>
          <summary>Choose shortcuts</summary>
          <div className="button-group">
            {tools.map((tool) => (
              <label key={tool.href}>
                <input
                  type="checkbox"
                  checked={shortcuts.includes(tool.href)}
                  onChange={() => toggleShortcut(tool.href)}
                />{" "}
                {tool.title}
              </label>
            ))}
          </div>
        </details>
      </section>
      {recent.length > 0 && (
        <section className="panel" style={{ padding: "20px", marginBottom: "24px" }}>
          <SectionHeader title="Recently updated" />
          <div className="button-group">
            {recent.map((item) => (
              <Link className="button secondary" key={item.id} href={item.href}>
                {item.type}: {item.name} <ArrowUpRight size={14} />
              </Link>
            ))}
          </div>
        </section>
      )}
      <SectionHeader title="Tools" />
      <div className="tool-grid">
        {tools.map(({ href, title, description, icon: Icon }) => (
          <Link className="tool-card" href={href} key={href}>
            <div className="tool-card-top">
              <div className="tool-icon">
                <Icon size={22} />
              </div>
              <ArrowUpRight size={17} />
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
            {href === "/regex" && <p className="fine-print">{presetCount} saved search presets</p>}
            {href === "/genesis" && (
              <p className="fine-print">{genesisPlanCount} saved Genesis plans</p>
            )}
          </Link>
        ))}
      </div>
      <div className="dashboard-bottom">
        <section className="panel recent-builds">
          <SectionHeader
            title="Your build library"
            aside={
              <Link className="text-link" href="/builds">
                View all <ArrowRight size={14} />
              </Link>
            }
          />
          {builds.length ? (
            builds.slice(0, 3).map(({ id, build }) => (
              <Link href="/builds" className="recent-row" key={id}>
                <div className="small-icon">
                  <GitBranch size={18} />
                </div>
                <div>
                  <strong>{build.name}</strong>
                  <small>
                    {build.passives?.length ?? 0} passives · {build.skills?.length ?? 0} skills
                  </small>
                </div>
                <ArrowUpRight size={16} />
              </Link>
            ))
          ) : (
            <div className="library-empty">
              <div className="small-orbit">
                <Compass size={28} />
              </div>
              <div>
                <h3>Your next build belongs here.</h3>
                <p>Save an idea today. Pick up where you left off tomorrow.</p>
              </div>
              <Link href="/builds" className="button secondary">
                <Plus size={15} />
                Create build
              </Link>
            </div>
          )}
        </section>
        <section className="connection-panel">
          <ShieldCheck size={23} />
          <div>
            <h3>
              {statusLoading ? "Checking account connection…" : statusError ? "Account status unavailable" : status?.connected ? "Account connected" : "Connect your account"}
            </h3>
            <p>
              {statusLoading
                ? "Checking connection status."
                : statusError
                  ? "Account status could not be loaded. Check your connection settings."
                  : status?.connected
                  ? "Characters and online filters are ready to explore."
                  : "Connect through GGG to access your characters and online filters."}
            </p>
            <Link href="/settings" className="text-link">
              {statusError || status?.connected ? "Connection settings" : "Set up your connection"}
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

