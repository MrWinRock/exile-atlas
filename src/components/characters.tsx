"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, RefreshCw, Swords, UserRound } from "lucide-react";
import { api, useStatus } from "@/lib/client";
import type { Character, Item } from "@/lib/poe";
import type { Tree } from "@/lib/tree";
import type { Build } from "@/lib/build";
import { useWorkspace } from "@/lib/workspace-store";
import { ItemImage, useItemImages } from "./artwork";
import {
  Badge,
  Button,
  ConnectState,
  Empty,
  Loading,
  Notice,
  PageTitle,
  SectionHeader,
} from "./ui";
function SocketedItem({
  item,
  find,
}: {
  item: Item;
  find: ReturnType<typeof useItemImages>["find"];
}) {
  const name = item.name || item.typeLine || "Socketed item";
  return (
    <div>
      <div className="socketed-artwork">
        <ItemImage src={item.icon ?? find(undefined, name)?.icon} name={name} size={28} />
        <span>{name}</span>
      </div>
      {item.socketedItems?.map((s, i) => (
        <SocketedItem key={s.id ?? i} item={s} find={find} />
      ))}
    </div>
  );
}
function ItemCard({ item, find }: { item: Item; find: ReturnType<typeof useItemImages>["find"] }) {
  return (
    <article className="item-card">
      <ItemImage
        src={item.icon ?? find(undefined, item.name || item.typeLine)?.icon}
        name={item.name || item.typeLine || "Item"}
        size={64}
      />
      <div>
        <small>{item.inventoryId ?? "SKILL"}</small>
        <h3>{item.name || item.typeLine || "Unnamed item"}</h3>
        {item.name && <p>{item.typeLine}</p>}
        {item.properties?.map((p, i) => (
          <p className="item-property" key={i}>
            {p.name} {p.values.map((v) => v[0]).join(", ")}
          </p>
        ))}
        {[...(item.implicitMods ?? []), ...(item.explicitMods ?? [])].map((mod, i) => (
          <p className="item-mod" key={i}>
            {typeof mod === "string" ? mod : mod.description}
          </p>
        ))}
        {item.socketedItems?.map((s, i) => (
          <SocketedItem key={s.id ?? i} item={s} find={find} />
        ))}
      </div>
    </article>
  );
}
export function Characters() {
  const { find } = useItemImages();
  const { data: status, isLoading: statusLoading } = useStatus(),
    [selected, setSelected] = useState(""),
    [message, setMessage] = useState(""),
    [importing, setImporting] = useState(false);
  const saveBuild = useWorkspace((s) => s.saveBuild);
  const list = useQuery({
    queryKey: ["characters"],
    queryFn: () => api<{ characters: Character[] }>("characters"),
    enabled: !!status?.connected,
  });
  const detail = useQuery({
    queryKey: ["character", selected],
    queryFn: () => api<{ character: Character }>("characters/" + encodeURIComponent(selected)),
    enabled: !!selected && !!status?.connected,
  });
  async function importBuild() {
    const character = detail.data?.character;
    if (!character) return;
    setImporting(true);
    setMessage("");
    try {
      const tree = await api<Tree>("tree");
      const nodes = new Map(tree.nodes.map((n) => [Number(n.hash), n]));
      const passives: NonNullable<Build["passives"]> = [];
      for (const hash of character.passives?.hashes ?? []) {
        const node = nodes.get(hash);
        if (node && node.kind !== "start") passives.push(node.id);
      }
      for (const [key, hashes] of Object.entries(character.passives?.specialisations ?? {})) {
        const weaponSet = { set1: 0, set2: 1, set3: 2 }[key] ?? 0;
        for (const hash of hashes) {
          const node = nodes.get(hash);
          if (node && node.kind !== "start") passives.push({ id: node.id, weapon_set: weaponSet });
        }
      }
      saveBuild({
        name: character.name + " — imported",
        author: status?.profile?.name,
        description: `Imported from ${character.name}, level ${character.level} ${character.class}. Equipment is available in the character viewer. Add skill metadata IDs and guide notes in the build editor.`,
        passives,
        skills: [],
      });
      setMessage(
        "Character passives saved to your build library. Add skills and guide notes in the editor.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="ACCOUNT / CHARACTERS"
        title="Meet your exiles."
        description="A closer look at the equipment, skills, and choices that make your character."
        action={
          <Button
            variant="secondary"
            disabled={!status?.connected || list.isFetching}
            onClick={() => {
              void list.refetch();
              if (selected) void detail.refetch();
            }}
          >
            <RefreshCw size={15} />
            Refresh
          </Button>
        }
      />
      {statusLoading ? (
        <Loading />
      ) : !status?.connected ? (
        <ConnectState feature="explore your characters, equipment, gems, and passives" />
      ) : (
        <div className="character-layout">
          <section className="panel">
            <SectionHeader title="Your characters" />
            {list.isLoading && <Loading />}
            {list.error && <Notice error>{list.error.message}</Notice>}
            {list.data?.characters.length === 0 && (
              <Empty
                icon={UserRound}
                title="No PoE2 characters yet"
                description="Create a character in PoE2, then refresh this list."
              />
            )}
            {list.data?.characters.map((c) => (
              <button
                key={c.id}
                className={`character-row ${selected === c.name ? "selected" : ""}`}
                onClick={() => setSelected(c.name)}
              >
                <span className="character-avatar">
                  <UserRound size={22} />
                </span>
                <div>
                  <strong>{c.name}</strong>
                  <small>
                    {c.class} · {c.league}
                  </small>
                </div>
                <span className="level">
                  {c.level}
                  <small>LEVEL</small>
                </span>
              </button>
            ))}
          </section>
          <section className="panel character-detail">
            {!selected ? (
              <Empty
                icon={Swords}
                title="Choose your character"
                description="Select an exile to inspect equipped items, skills, and passive allocations."
              />
            ) : detail.isLoading ? (
              <Loading label="Loading character" />
            ) : detail.error ? (
              <Notice error>{detail.error.message}</Notice>
            ) : (
              detail.data?.character && (
                <>
                  <SectionHeader
                    title={detail.data.character.name}
                    aside={<Badge tone="amber">LEVEL {detail.data.character.level}</Badge>}
                  />
                  <div className="toolbar">
                    <Badge>{detail.data.character.class}</Badge>
                    <Button disabled={importing} onClick={importBuild}>
                      <ArrowUpRight size={15} />
                      {importing ? "Importing…" : "Save passives as build"}
                    </Button>
                  </div>
                  {message && (
                    <Notice>
                      {message}{" "}
                      <Link href="/builds" className="text-link">
                        Open library
                      </Link>
                    </Notice>
                  )}
                  <SectionHeader title="Equipped items" />
                  <div className="items-grid">
                    {detail.data.character.equipment?.map((item, i) => (
                      <ItemCard key={item.id ?? i} item={item} find={find} />
                    ))}
                  </div>
                  <SectionHeader title="Skills & supports" />
                  <div className="items-grid">
                    {detail.data.character.skills?.map((item, i) => (
                      <ItemCard key={item.id ?? i} item={item} find={find} />
                    ))}
                  </div>
                  <p className="fine-print">
                    GGG does not expose unequipped inventory items for PoE2.
                  </p>
                </>
              )
            )}
          </section>
        </div>
      )}
    </>
  );
}
