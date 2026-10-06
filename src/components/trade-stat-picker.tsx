"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, Plus, Search, X } from "lucide-react";
import styles from "./trade-stat-picker.module.css";

export type TradeStatOption = {
  id: string;
  text: string;
  type: string;
  groupLabel: string;
};
type TradeStatCatalog = {
  revision: string;
  source: string;
  groups: {
    id: string;
    label: string;
    entries: { id: string; text: string; type: string }[];
  }[];
};

export function TradeStatPicker({
  onSelect,
  disabled = false,
}: {
  onSelect: (stat: TradeStatOption) => void;
  disabled?: boolean;
}) {
  const titleId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const catalog = useQuery({
    queryKey: ["poe2-trade-stat-catalog"],
    queryFn: async ({ signal }) => {
      const response = await fetch("/data/poe2-trade-stats.json", { signal });
      if (!response.ok) throw new Error("The stat catalogue could not be loaded.");
      return (await response.json()) as TradeStatCatalog;
    },
    enabled: open,
    staleTime: Infinity,
    retry: false,
  });
  const matches = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return (catalog.data?.groups ?? [])
      .filter((group) => category === "all" || group.id === category)
      .flatMap((group) =>
        group.entries
          .filter((stat) => `${stat.text} ${stat.id}`.toLocaleLowerCase().includes(term))
          .map((stat) => ({ ...stat, groupId: group.id, groupLabel: group.label })),
      );
  }, [catalog.data, category, search]);
  const visible = matches.slice(0, 100);

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    element?.showModal();
    searchInput.current?.focus();
    return () => element?.close();
  }, [open]);

  function close() {
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => {
          setCategory("all");
          setSearch("");
          setOpen(true);
        }}
      >
        <Plus size={15} aria-hidden="true" />
        Add stat filter
      </button>
      {open && (
        <dialog
          ref={dialog}
          className={styles.dialog}
          aria-labelledby={titleId}
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div className={styles.content}>
            <header className={styles.header}>
              <div>
                <span className={styles.eyebrow}>Item modifiers</span>
                <h2 id={titleId}>Choose a stat filter</h2>
              </div>
              <button
                type="button"
                className={styles.close}
                aria-label="Close stat selector"
                onClick={close}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </header>
            <div className={styles.filters}>
              <label className={`search-field ${styles.search}`}>
                <Search size={16} aria-hidden="true" />
                <input
                  ref={searchInput}
                  aria-label="Search stat filters"
                  placeholder="Search modifier text or stat ID…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label className={styles.category}>
                <span id={`${titleId}-category`}>Stat category</span>
                <select
                  aria-labelledby={`${titleId}-category`}
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="all">All</option>
                  {(catalog.data?.groups ?? []).map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.results}>
              {catalog.isPending ? (
                <p className={styles.message} role="status">
                  <LoaderCircle size={17} className={styles.spinner} aria-hidden="true" />
                  Loading stat filters…
                </p>
              ) : catalog.error ? (
                <div className={styles.error}>
                  <p role="alert">The stat catalogue could not be loaded.</p>
                  <button
                    type="button"
                    className={styles.retry}
                    disabled={catalog.isFetching}
                    onClick={() => void catalog.refetch()}
                  >
                    {catalog.isFetching ? "Retrying…" : "Retry stat catalogue"}
                  </button>
                </div>
              ) : (
                <>
                  {visible.map((stat) => (
                    <button
                      key={JSON.stringify([stat.groupId, stat.id, stat.text])}
                      type="button"
                      className={styles.option}
                      aria-label={`Select stat: ${stat.text} (${stat.type})`}
                      onClick={() => {
                        onSelect({
                          id: stat.id,
                          text: stat.text,
                          type: stat.type,
                          groupLabel: stat.groupLabel,
                        });
                        close();
                      }}
                    >
                      <span className={styles.optionText}>
                        <strong>{stat.text}</strong>
                        <small>{stat.id}</small>
                      </span>
                      <span className={styles.type}>{stat.type}</span>
                    </button>
                  ))}
                  {!matches.length && <p className={styles.message}>No stats match your search.</p>}
                </>
              )}
            </div>
            {catalog.data && !catalog.error && (
              <footer className={styles.footer}>
                <p data-testid="trade-stat-results" role="status">
                  Showing {visible.length} of {matches.length} matching stats.
                </p>
                {matches.length > 100 && <span>Narrow your search to see more matches.</span>}
              </footer>
            )}
          </div>
        </dialog>
      )}
    </>
  );
}
