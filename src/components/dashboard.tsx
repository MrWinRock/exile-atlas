"use client";
import Link from "next/link";
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
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace-store";
import { useStatus } from "@/lib/client";
import { Badge, SectionHeader } from "./ui";
import { OrbitArt } from "./orbit-art";
const tools = [
  {
    href: "/characters",
    title: "Your characters",
    description: "Your gear, gems, and passive choices. All in one place.",
    icon: UserRound,
    tag: "ACCOUNT",
  },
  {
    href: "/currency",
    title: "Follow the economy",
    description: "Explore exchange ratios and volumes from hourly digests.",
    icon: Coins,
    tag: "PUBLIC DATA",
  },
  {
    href: "/planner",
    title: "Find your path",
    description: "Explore the passive tree and sketch your next build.",
    icon: GitBranch,
    tag: "PUBLIC DATA",
  },
  {
    href: "/filters",
    title: "Make drops matter",
    description: "Craft a loot filter that highlights exactly what you need.",
    icon: Sparkles,
    tag: "LOCAL EDITOR",
  },
  {
    href: "/builds",
    title: "Keep your best ideas",
    description: "Create, save, and export guides for the in-game planner.",
    icon: BookOpen,
    tag: "LOCAL EDITOR",
  },
  {
    href: "/leagues",
    title: "Watch the climb",
    description: "Browse leagues and follow the top 1,000 exiles.",
    icon: ChartNoAxesCombined,
    tag: "GGG ACCESS",
  },
];
export function Dashboard() {
  const { builds, filters } = useWorkspace(),
    { data: status } = useStatus();
  return (
    <div className="dashboard">
      <div className="dashboard-intro">
        <div>
          <div className="eyebrow">YOUR JOURNEY THROUGH WRAECLAST</div>
          <h1>Welcome to your Atlas.</h1>
          <p>A clearer view of your next adventure.</p>
        </div>
        <Badge tone="amber">PATH OF EXILE 2</Badge>
      </div>
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="hero-overline">
            <span />
            PLAN. REFINE. EXPLORE.
          </div>
          <h2>
            Every exile needs
            <br />a little <em>direction.</em>
          </h2>
          <p>
            Bring your builds, loot filters, and the economy
            <br className="desktop-break" /> together. Your next great idea starts here.
          </p>
          <div className="hero-actions">
            <Link href="/planner" className="button primary">
              Plan a build <ArrowUpRight size={17} />
            </Link>
            <Link href="/characters" className="button hero-secondary">
              Explore characters <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <div className="hero-art">
          <OrbitArt />
          <span className="art-caption">THE PATH IS YOURS TO CHOOSE</span>
        </div>
        <div className="hero-corner top-left" />
        <div className="hero-corner bottom-right" />
      </section>
      <div className="workspace-metrics">
        <Link href="/builds">
          <BookOpen size={18} />
          <div>
            <span>Saved builds</span>
            <strong>{String(builds.length).padStart(2, "0")}</strong>
          </div>
          <ArrowUpRight size={15} />
        </Link>
        <Link href="/filters">
          <Sparkles size={18} />
          <div>
            <span>Filter drafts</span>
            <strong>{String(filters.length).padStart(2, "0")}</strong>
          </div>
          <ArrowUpRight size={15} />
        </Link>
        <Link href="/settings">
          <ShieldCheck size={18} />
          <div>
            <span>GGG account</span>
            <strong className="metric-text">
              {status?.connected ? "Connected" : "Not connected"}
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
          <Badge tone="green">PUBLIC</Badge>
        </Link>
      </div>
      <SectionHeader
        title="A toolkit for your next chapter"
        aside={
          <span className="muted text-small">
            BUILT FOR POE2 <span className="tiny-star">✧</span>
          </span>
        }
      />
      <div className="tool-grid">
        {tools.map(({ href, title, description, icon: Icon, tag }, index) => (
          <Link className="tool-card" href={href} key={href}>
            <div className="tool-card-top">
              <div className="tool-icon">
                <Icon size={22} />
              </div>
              <span className="tool-number">0{index + 1}</span>
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
            <div className="tool-card-bottom">
              <span>{tag}</span>
              <ArrowUpRight size={17} />
            </div>
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
              {status?.connected ? "Your account is connected." : "Your exile. Your permission."}
            </h3>
            <p>
              {status?.connected
                ? "Characters and online filters are ready to explore."
                : "Connect securely through GGG to bring your characters and online filters into your workspace."}
            </p>
            <Link href="/settings" className="text-link">
              {status?.connected ? "Connection settings" : "Set up your connection"}
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
