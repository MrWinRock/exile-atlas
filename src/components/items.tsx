"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTradeWorkspace } from "@/lib/trade-store";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { ItemImage, useItemImages } from "./artwork";
import { Badge, Button, Field, Loading, Notice, PageTitle } from "./ui";
export function Items() {
  const catalogue = useItemImages();
  const router = useRouter();
  const trade = useTradeWorkspace();
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("all"),
    [kind, setKind] = useState("all"),
    [artworkOnly, setArtworkOnly] = useState(false),
    [size, setSize] = useState(""),
    [page, setPage] = useState(0);
  const categories = useMemo(
    () => [...new Set(catalogue.data?.items.map((i) => i.itemClass) ?? [])].sort(),
    [catalogue.data],
  );
  const results = useMemo(
    () =>
      (catalogue.data?.items ?? []).filter(
        (i) =>
          (category === "all" || i.itemClass === category) &&
          (kind === "all" || i.kind === kind) &&
          (!artworkOnly || !!i.icon) &&
          (!size || `${i.width}x${i.height}` === size) &&
          `${i.name} ${i.id}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [catalogue.data, category, kind, search, artworkOnly, size],
  );
  const pages = Math.max(1, Math.ceil(results.length / 60)),
    current = Math.min(page, pages - 1);
  return (
    <>
      <PageTitle
        eyebrow="REFERENCE / ITEM GALLERY"
        title="Know it when you see it."
        description="Browse PoE2 base items and uniques with community artwork, matched against the PoE2 trade reference lists."
      />
      {catalogue.isLoading && <Loading label="Loading item artwork" />}
      {catalogue.error && (
        <Notice error>
          {catalogue.error.message}{" "}
          <Button variant="ghost" onClick={() => void catalogue.refetch()}>
            Try again
          </Button>
        </Notice>
      )}
      {catalogue.data && (
        <>
          <div className="panel artwork-toolbar">
            <label className="search-field">
              <Search size={16} />
              <input
                aria-label="Search items"
                placeholder="Item name or metadata ID…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </label>
            <Field label="Item class">
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">All classes</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Item type">
              <select
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">Bases & uniques</option>
                <option value="base">Base items</option>
                <option value="unique">Unique items</option>
              </select>
            </Field>
            <Field label="Inventory size">
              <select
                aria-label="Inventory size"
                value={size}
                onChange={(e) => {
                  setSize(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">All sizes</option>
                {[
                  ...new Set(
                    (catalogue.data.items ?? []).map((item) => `${item.width}x${item.height}`),
                  ),
                ]
                  .sort()
                  .map((value) => (
                    <option key={value} value={value}>
                      {value.replace("x", " x ")}
                    </option>
                  ))}
              </select>
            </Field>
            <label>
              <input
                type="checkbox"
                checked={artworkOnly}
                onChange={(e) => {
                  setArtworkOnly(e.target.checked);
                  setPage(0);
                }}
              />{" "}
              With artwork only
            </label>
          </div>
          <div className="artwork-summary">
            <span>
              {results.length.toLocaleString()} items · {catalogue.data.withImages.toLocaleString()}{" "}
              verified image mappings in the full catalogue
            </span>
            <Badge>COMMUNITY DATA</Badge>
          </div>
          <div className="item-gallery">
            {results.slice(current * 60, (current + 1) * 60).map((i) => (
              <article key={i.id} className={`panel gallery-card ${i.kind}`}>
                <ItemImage src={i.icon} name={i.name} size={100} />
                <small>{i.itemClass}</small>
                <h2>{i.name}</h2>
                <details>
                  <summary>Item details</summary>
                  <p>
                    {i.kind === "unique" ? "Unique item" : "Base item"} x {i.width} x {i.height}{" "}
                    inventory spaces
                  </p>
                  <code>{i.id}</code>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      trade.setDraft({
                        ...trade.draft,
                        name: i.kind === "unique" ? i.name : "",
                        type: i.kind === "base" ? i.name : "",
                      });
                      router.push("/trade");
                    }}
                  >
                    Search in trade
                  </Button>
                </details>
              </article>
            ))}
          </div>
          {!results.length && <Notice>No items match these filters.</Notice>}
          <div className="gallery-pagination">
            <Button
              variant="secondary"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft size={16} />
              Previous
            </Button>
            <span>
              Page {current + 1} of {pages}
            </span>
            <Button
              variant="secondary"
              disabled={current === pages - 1}
              onClick={() => setPage(current + 1)}
            >
              Next
              <ChevronRight size={16} />
            </Button>
          </div>
          <p className="fine-print">
            Source:{" "}
            <a href="https://github.com/repoe-fork/poe2" target="_blank" rel="noreferrer">
              RePoE PoE2
            </a>{" "}
            · revision {catalogue.data.revision.slice(0, 8)}. Includes released bases and PoE2
            trade-listed uniques; unavailable artwork is labelled. Community data may lag the game.
          </p>
        </>
      )}
    </>
  );
}
