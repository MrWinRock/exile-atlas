"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock3, Coins, Download, RefreshCw, Search } from "lucide-react";
import { api } from "@/lib/client";
import { completedHour, type Market } from "@/lib/currency";
import { downloadFile } from "@/lib/build";
import { Badge, Button, Empty, Field, Loading, Notice, PageTitle, SectionHeader } from "./ui";
import { Chart } from "./chart";
import { ItemImage, useItemImages } from "./artwork";
type Digest = {
  hour: number;
  nextChangeId: number;
  markets: Market[];
  source: string;
  fetchedAt: string;
};
export function Currency() {
  const { find } = useItemImages();
  const [hour, setHour] = useState(() => completedHour()),
    [input, setInput] = useState(() => new Date(completedHour() * 1000).toISOString().slice(0, 16)),
    [league, setLeague] = useState("all"),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState<"volume" | "pair">("volume"),
    [selected, setSelected] = useState<{ id: string; league: string }>(),
    [inputError, setInputError] = useState("");
  const query = useQuery({
    queryKey: ["currency", hour],
    queryFn: () => api<Digest>("currency?hour=" + hour),
    staleTime: 3600000,
  });
  const history = useQuery({
    queryKey: ["history"],
    queryFn: () => api<{ snapshots: Digest[]; configured: boolean }>("history"),
  });
  const markets = useMemo(() => {
    const rows = (query.data?.markets ?? [])
      .map((m) => ({
        ...m,
        base: find(m.baseId)?.name ?? m.base,
        quote: find(m.quoteId)?.name ?? m.quote,
      }))
      .filter(
        (m) =>
          (league === "all" || m.league === league) &&
          `${m.base} ${m.quote} ${m.baseId} ${m.quoteId}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      );
    return rows.sort((a, b) =>
      sort === "volume" ? b.baseVolume - a.baseVolume : a.base.localeCompare(b.base),
    );
  }, [query.data, league, search, sort, find]);
  const options = useMemo(
    () => ({
      backgroundColor: "transparent",
      color: ["#7c6b50", "#ddb473"],
      tooltip: { trigger: "axis" as const },
      legend: { textStyle: { color: "#969f9f" } },
      grid: { left: 58, right: 20, top: 38, bottom: 65 },
      xAxis: {
        type: "category" as const,
        data: markets.slice(0, 8).map((m) => m.base.slice(0, 13) + " / " + m.quote.slice(0, 10)),
        axisLabel: { color: "#969f9f", rotate: 15, fontSize: 10 },
        axisLine: { lineStyle: { color: "#303638" } },
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { color: "#969f9f" },
        splitLine: { lineStyle: { color: "#252b2d" } },
      },
      series: [
        {
          name: "Lowest ratio",
          type: "bar" as const,
          data: markets.slice(0, 8).map((m) => m.low),
          barMaxWidth: 20,
        },
        {
          name: "Highest ratio",
          type: "bar" as const,
          data: markets.slice(0, 8).map((m) => m.high),
          barMaxWidth: 20,
        },
      ],
    }),
    [markets],
  );
  const picked = markets.find((m) => m.id === selected?.id && m.league === selected?.league),
    points = (history.data?.snapshots ?? [])
      .map((d) => ({
        hour: d.hour,
        market: d.markets.find((m) => m.id === selected?.id && m.league === selected?.league),
      }))
      .filter((p) => p.market);
  const historyOptions = useMemo(
    () => ({
      tooltip: { trigger: "axis" as const },
      color: ["#ddb473", "#788b8a"],
      grid: { left: 50, right: 20, top: 20, bottom: 35 },
      xAxis: {
        type: "category" as const,
        data: points.map((p) => new Date(p.hour * 1000).toISOString().slice(11, 16)),
        axisLabel: { color: "#969f9f" },
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { color: "#969f9f" },
        splitLine: { lineStyle: { color: "#252b2d" } },
      },
      series: [
        { name: "Lowest", type: "line" as const, data: points.map((p) => p.market!.low) },
        { name: "Highest", type: "line" as const, data: points.map((p) => p.market!.high) },
      ],
    }),
    [points],
  );
  return (
    <>
      <PageTitle
        eyebrow="ECONOMY / CURRENCY EXCHANGE"
        title="Read the currents."
        description="Historical exchange activity, straight from GGG’s public hourly digests."
        action={
          <Button
            variant="secondary"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw size={15} />
            Refresh digest
          </Button>
        }
      />
      <div className="data-toolbar">
        <Field label="Completed hour (UTC)">
          <input
            type="datetime-local"
            step={3600}
            value={input}
            max={new Date(completedHour() * 1000).toISOString().slice(0, 16)}
            onChange={(e) => setInput(e.target.value)}
          />
        </Field>
        <Button
          variant="secondary"
          onClick={() => {
            const timestamp = Date.parse(input + ":00Z") / 1000;
            if (
              !Number.isSafeInteger(timestamp) ||
              timestamp % 3600 ||
              timestamp > completedHour()
            ) {
              setInputError("Choose a completed UTC hour.");
              return;
            }
            setInputError("");
            setHour(timestamp);
          }}
        >
          Load digest
        </Button>
        <div className="digest-note">
          <Clock3 size={16} />
          Completed hours only
          <br />
          <small>The current hour is unavailable.</small>
        </div>
      </div>
      {inputError && <Notice error>{inputError}</Notice>}
      {query.isLoading ? (
        <Loading label="Fetching GGG exchange history" />
      ) : query.error ? (
        <>
          <Notice error>{query.error.message}</Notice>
          <Empty
            icon={Coins}
            title="The exchange is out of reach."
            description="The public data service could not return this digest. Try another completed hour or refresh shortly."
          >
            <Button onClick={() => void query.refetch()}>Try again</Button>
          </Empty>
        </>
      ) : (
        query.data && (
          <>
            <div className="stat-strip">
              <div>
                <span>Market pairs</span>
                <strong>{query.data.markets.length.toLocaleString()}</strong>
              </div>
              <div>
                <span>Leagues in digest</span>
                <strong>{new Set(query.data.markets.map((m) => m.league)).size}</strong>
              </div>
              <div>
                <span>Digest time</span>
                <strong className="small-stat">
                  {new Date(hour * 1000).toISOString().slice(0, 16).replace("T", " ")} UTC
                </strong>
              </div>
              <Badge tone="green">GGG PUBLIC DATA</Badge>
            </div>
            <section className="panel">
              <SectionHeader
                title="Ratio ranges in this digest"
                aside={
                  <span className="muted text-small">Top 8 visible markets by selected sort</span>
                }
              />
              {markets.length ? (
                <Chart
                  options={options}
                  label="Lowest and highest reported exchange ratios for the visible market pairs"
                />
              ) : (
                <Empty
                  icon={Coins}
                  title="No markets match"
                  description="Choose another league or search term."
                />
              )}
              <p className="fine-print">
                Ratios are reported for the first currency’s dictionary key. These are historical
                min/max values, not a live offer or an average price.
              </p>
            </section>
            <section className="panel market-panel">
              <SectionHeader
                title="Exchange markets"
                aside={
                  <Button
                    variant="ghost"
                    onClick={() =>
                      downloadFile(
                        "poe2-currency-" + hour + ".json",
                        JSON.stringify(query.data, null, 2),
                        "application/json",
                      )
                    }
                  >
                    <Download size={15} />
                    Export JSON
                  </Button>
                }
              />
              <div className="table-toolbar">
                <label className="search-field">
                  <Search size={16} />
                  <input
                    aria-label="Search currency markets"
                    placeholder="Search currencies or metadata IDs…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <select
                  aria-label="Filter by league"
                  value={league}
                  onChange={(e) => setLeague(e.target.value)}
                >
                  <option value="all">All leagues</option>
                  {[...new Set(query.data.markets.map((m) => m.league))].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
                <select
                  aria-label="Sort markets"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as "volume" | "pair")}
                >
                  <option value="volume">Base volume ↓</option>
                  <option value="pair">Currency A–Z</option>
                </select>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Currency pair</th>
                      <th>League</th>
                      <th>Base volume</th>
                      <th>Quote volume</th>
                      <th>Ratio range</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {markets.slice(0, 200).map((m) => (
                      <tr key={m.league + ":" + m.id}>
                        <td>
                          <strong className="market-artwork">
                            <ItemImage src={find(m.baseId)?.icon} name={m.base} size={28} />
                            {m.base} <span className="muted">/</span>{" "}
                            <ItemImage src={find(m.quoteId)?.icon} name={m.quote} size={28} />
                            {m.quote}
                          </strong>
                          <small title={m.id}>{m.baseId}</small>
                        </td>
                        <td>{m.league}</td>
                        <td className="numeric">{m.baseVolume.toLocaleString()}</td>
                        <td className="numeric">{m.quoteVolume.toLocaleString()}</td>
                        <td className="numeric accent">
                          {m.low ?? "—"} – {m.high ?? "—"}
                        </td>
                        <td>
                          <button
                            className="text-link"
                            onClick={() => setSelected({ id: m.id, league: m.league })}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="fine-print">
                Showing {Math.min(markets.length, 200)} of {markets.length} matches. Search to
                narrow results. Names and artwork use RePoE PoE2; unknown items keep their metadata
                labels.
              </p>
            </section>
            {picked && (
              <section className="panel">
                <SectionHeader
                  title={`${picked.base} / ${picked.quote}`}
                  aside={<Badge>{picked.league}</Badge>}
                />
                <pre className="data-pre">
                  {JSON.stringify(
                    {
                      market_pair: picked.raw.market_pair,
                      volume_traded: picked.raw.volume_traded,
                      lowest_stock: picked.raw.lowest_stock,
                      highest_stock: picked.raw.highest_stock,
                      lowest_ratio: picked.raw.lowest_ratio,
                      highest_ratio: picked.raw.highest_ratio,
                    },
                    null,
                    2,
                  )}
                </pre>
                {points.length > 1 ? (
                  <Chart
                    options={historyOptions}
                    label="Collected hourly lowest and highest ratio history"
                  />
                ) : (
                  <Notice>
                    Start the history worker with PostgreSQL and Redis to collect hourly trends.
                    This digest remains available without those services.
                  </Notice>
                )}
              </section>
            )}
          </>
        )
      )}
    </>
  );
}
