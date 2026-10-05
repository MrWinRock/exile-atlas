"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock3, Coins, RefreshCw } from "lucide-react";
import { api } from "@/lib/client";
import { completedHour, type Market } from "@/lib/currency";
import { downloadFile } from "@/lib/build";
import { Badge, Button, Empty, Field, Loading, Notice, PageTitle } from "./ui";
import { CurrencyComparison } from "./currency-comparison";
import { CurrencyMarkets } from "./currency-markets";

type Digest = {
  hour: number;
  nextChangeId: number;
  markets: Market[];
  source: string;
  fetchedAt: string;
};

export function Currency() {
  const [hour, setHour] = useState(() => completedHour());
  const [input, setInput] = useState(() =>
    new Date(completedHour() * 1000).toISOString().slice(0, 16),
  );
  const [inputError, setInputError] = useState("");
  const query = useQuery({
    queryKey: ["currency", hour],
    queryFn: () => api<Digest>("currency?hour=" + hour),
    staleTime: 3600000,
  });
  const history = useQuery({
    queryKey: ["history"],
    queryFn: () => api<{ snapshots: Digest[]; configured: boolean }>("history"),
    staleTime: 300000,
  });
  return (
    <>
      <PageTitle
        eyebrow="ECONOMY / CURRENCY EXCHANGE"
        title="Read the currents."
        description="Historical exchange activity, straight from GGG’s public hourly digests."
        action={
          <Button
            variant="secondary"
            onClick={() => {
              void query.refetch();
              void history.refetch();
            }}
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
            <CurrencyComparison markets={query.data.markets} hour={hour} />
            <CurrencyMarkets
              markets={query.data.markets}
              snapshots={history.data?.snapshots ?? []}
              hour={hour}
              onExport={() =>
                downloadFile(
                  "poe2-currency-" + hour + ".json",
                  JSON.stringify(query.data, null, 2),
                  "application/json",
                )
              }
            />
          </>
        )
      )}
    </>
  );
}
