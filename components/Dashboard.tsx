"use client";

import { useEffect, useState, useCallback } from "react";

interface TokenPair {
  pairAddress: string;
  baseToken: { name: string; symbol: string; address: string };
  quoteToken: { symbol: string };
  priceUsd?: string;
  priceChange: { m5: number; h1: number; h6: number; h24: number };
  volume: { m5: number; h1: number; h24: number };
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
  };
  liquidity?: { usd?: number };
  marketCap?: number;
  fdv?: number;
  bullishScore: number;
  url: string;
  info?: { imageUrl?: string };
  pairCreatedAt?: number;
}

function fmt(n?: number) {
  if (!n) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtPrice(p?: string) {
  if (!p) return "$—";
  const n = parseFloat(p);
  if (n < 0.00001) return `$${n.toExponential(3)}`;
  if (n < 1) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(4)}`;
}

function BuyRatio({ buys, sells }: { buys: number; sells: number }) {
  const total = buys + sells || 1;
  const pct = Math.round((buys / total) * 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-green-400">B {pct}%</span>
        <span className="text-red-400">S {100 - pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-red-500/40 overflow-hidden">
        <div
          className="h-full rounded-full bg-green-400 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75
      ? "bg-green-500 text-black"
      : score >= 55
      ? "bg-yellow-400 text-black"
      : "bg-zinc-600 text-zinc-300";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
      {score}
    </span>
  );
}

function PriceChange({ val }: { val?: number }) {
  if (val == null) return <span className="text-zinc-400">—</span>;
  const color = val > 0 ? "text-green-400" : val < 0 ? "text-red-400" : "text-zinc-400";
  const sign = val > 0 ? "+" : "";
  return <span className={color}>{sign}{val.toFixed(2)}%</span>;
}

function formatAge(pairCreatedAt?: number): string | null {
  if (!pairCreatedAt) return null;
  const ageMs = Date.now() - pairCreatedAt;
  if (ageMs < 3_600_000) return `${Math.round(ageMs / 60000)}m`;
  if (ageMs < 86_400_000) return `${Math.round(ageMs / 3_600_000)}h`;
  return `${Math.round(ageMs / 86_400_000)}d`;
}

function TokenCard({ pair, rank }: { pair: TokenPair; rank: number }) {
  const ageStr = formatAge(pair.pairCreatedAt);

  return (
    <a
      href={pair.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-zinc-900 border border-zinc-800 hover:border-green-500/50 rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-green-900/20"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-zinc-500 text-sm font-mono w-6 shrink-0">#{rank}</span>
          {pair.info?.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pair.info.imageUrl}
              alt={pair.baseToken.symbol}
              className="w-8 h-8 rounded-full object-cover shrink-0 bg-zinc-800"
            />
          )}
          <div className="min-w-0">
            <div className="font-bold text-white truncate">{pair.baseToken.symbol}</div>
            <div className="text-zinc-500 text-xs truncate">{pair.baseToken.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {ageStr && (
            <span className="text-zinc-500 text-xs">🕐 {ageStr}</span>
          )}
          <ScoreBadge score={pair.bullishScore} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
        <div>
          <div className="text-zinc-500 text-xs">Price</div>
          <div className="text-white font-mono">{fmtPrice(pair.priceUsd)}</div>
        </div>
        <div>
          <div className="text-zinc-500 text-xs">MCap</div>
          <div className="text-white font-mono">{fmt(pair.marketCap || pair.fdv)}</div>
        </div>
        <div>
          <div className="text-zinc-500 text-xs">Vol 5m</div>
          <div className="text-white font-mono">{fmt(pair.volume.m5)}</div>
        </div>
        <div>
          <div className="text-zinc-500 text-xs">Vol 1h</div>
          <div className="text-white font-mono">{fmt(pair.volume.h1)}</div>
        </div>
      </div>

      <div className="flex gap-3 text-xs mb-3">
        <span className="text-zinc-500">5m <PriceChange val={pair.priceChange.m5} /></span>
        <span className="text-zinc-500">1h <PriceChange val={pair.priceChange.h1} /></span>
        <span className="text-zinc-500">24h <PriceChange val={pair.priceChange.h24} /></span>
      </div>

      <div className="text-xs text-zinc-500 mb-1.5">
        5m txns: {pair.txns.m5.buys + pair.txns.m5.sells} &nbsp;|&nbsp;
        1h txns: {pair.txns.h1.buys + pair.txns.h1.sells}
      </div>
      <BuyRatio buys={pair.txns.h1.buys} sells={pair.txns.h1.sells} />
    </a>
  );
}

type SortKey = "bullish" | "volume" | "change5m" | "change1h";

export default function Dashboard() {
  const [pairs, setPairs] = useState<TokenPair[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [refreshTick, setRefreshTick] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("bullish");
  const [bullishOnly, setBullishOnly] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/trending");
      if (!res.ok) throw new Error("API error");
      const data = await res.json() as { pairs?: TokenPair[]; updatedAt?: string; error?: string };
      if (data.error) throw new Error(data.error);
      setPairs(data.pairs || []);
      setUpdatedAt(data.updatedAt || new Date().toISOString());
      setError(null);
    } catch {
      setError("Failed to load data. Retrying...");
    } finally {
      setLoading(false);
      setCountdown(30);
      setRefreshTick((t) => t + 1);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    setCountdown(30);
    const t = setInterval(() => setCountdown((c) => Math.max(c - 1, 0)), 1000);
    return () => clearInterval(t);
  }, [refreshTick]);

  const sorted = [...pairs]
    .filter((p) => !bullishOnly || p.bullishScore >= 60)
    .sort((a, b) => {
      if (sortKey === "bullish") return b.bullishScore - a.bullishScore;
      if (sortKey === "volume") return b.volume.h1 - a.volume.h1;
      if (sortKey === "change5m") return b.priceChange.m5 - a.priceChange.m5;
      if (sortKey === "change1h") return b.priceChange.h1 - a.priceChange.h1;
      return 0;
    });

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black tracking-tight">
              🚀 <span className="text-green-400">Vol</span> Memes
            </h1>
            <p className="text-zinc-500 text-xs">Solana meme coins — bulls only, no FUD</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-zinc-600 text-xs">
              Refreshes in{" "}
              <span className="text-zinc-400 font-mono">{countdown}s</span>
            </span>
            <button
              onClick={fetchData}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
        {/* Filters */}
        <div className="max-w-7xl mx-auto px-4 pb-3 flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-zinc-900 rounded-lg p-0.5">
            {(["bullish", "volume", "change5m", "change1h"] as SortKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setSortKey(k)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  sortKey === k
                    ? "bg-green-500 text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {k === "bullish" ? "🔥 Bullish" : k === "volume" ? "📊 Volume" : k === "change5m" ? "⚡ 5m" : "📈 1h"}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={bullishOnly}
              onChange={(e) => setBullishOnly(e.target.checked)}
              className="accent-green-500 w-3.5 h-3.5"
            />
            Bullish only (score ≥ 60)
          </label>
          <span className="text-zinc-600 text-xs ml-auto">
            {sorted.length} tokens
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading && (
          <div className="flex items-center justify-center py-24 gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
            <span className="text-zinc-400">Loading meme coins...</span>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-16">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-green-500 text-black font-bold rounded-lg hover:bg-green-400"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && sorted.length === 0 && (
          <div className="text-center py-16 text-zinc-500">
            No tokens found. Try disabling the filter.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sorted.map((pair, i) => (
            <TokenCard key={pair.pairAddress} pair={pair} rank={i + 1} />
          ))}
        </div>

        {updatedAt && (
          <p className="text-center text-zinc-700 text-xs mt-8">
            Last updated: {new Date(updatedAt).toLocaleTimeString()} · Data via DexScreener
          </p>
        )}
      </div>
    </main>
  );
}
