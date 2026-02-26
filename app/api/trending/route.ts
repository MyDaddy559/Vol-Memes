import { NextResponse } from "next/server";

export interface TokenPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    symbol: string;
  };
  priceNative: string;
  priceUsd?: string;
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity?: {
    usd?: number;
    base?: number;
    quote?: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: {
    imageUrl?: string;
    socials?: { type: string; url: string }[];
  };
}

interface DexScreenerResponse {
  schemaVersion: string;
  pairs: TokenPair[] | null;
}

// Bullish momentum score: rewards high buy/sell ratio, recent volume, positive price action
function getBullishScore(pair: TokenPair): number {
  const m5Buys = pair.txns.m5.buys;
  const m5Sells = pair.txns.m5.sells;
  const h1Buys = pair.txns.h1.buys;
  const h1Sells = pair.txns.h1.sells;

  const m5Total = m5Buys + m5Sells || 1;
  const h1Total = h1Buys + h1Sells || 1;

  const m5BuyRatio = m5Buys / m5Total;
  const h1BuyRatio = h1Buys / h1Total;

  // Price change score (capped)
  const priceScore =
    Math.min(Math.max(pair.priceChange.m5 * 2 + pair.priceChange.h1, -50), 50) / 50;

  // Volume score (log scale)
  const volScore = Math.min(Math.log10(pair.volume.m5 + 1) / 4, 1);

  // Weighted bullish score 0-100
  const score =
    (m5BuyRatio * 35 + h1BuyRatio * 25 + ((priceScore + 1) / 2) * 25 + volScore * 15) * 100;

  return Math.round(score);
}

export async function GET() {
  try {
    // Fetch top boosted/trending tokens on Solana from DexScreener
    const [boostRes, searchRes] = await Promise.all([
      fetch(
        "https://api.dexscreener.com/token-boosts/top/v1",
        { next: { revalidate: 30 } }
      ),
      fetch(
        "https://api.dexscreener.com/latest/dex/search?q=pump.fun",
        { next: { revalidate: 30 } }
      ),
    ]);

    let pairAddresses: string[] = [];

    if (boostRes.ok) {
      const boostData = await boostRes.json() as { tokenAddress: string; chainId: string }[];
      pairAddresses = boostData
        .filter((t) => t.chainId === "solana")
        .slice(0, 30)
        .map((t) => t.tokenAddress);
    }

    let pairs: TokenPair[] = [];

    // Fetch pairs for boosted tokens
    if (pairAddresses.length > 0) {
      const tokenRes = await fetch(
        `https://api.dexscreener.com/tokens/v1/solana/${pairAddresses.join(",")}`,
        { next: { revalidate: 30 } }
      );
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json() as TokenPair[] | { pairs: TokenPair[] | null };
        if (Array.isArray(tokenData)) {
          pairs = tokenData;
        } else if (tokenData.pairs) {
          pairs = tokenData.pairs;
        }
      }
    }

    // Also include search results
    if (searchRes.ok) {
      const searchData = await searchRes.json() as DexScreenerResponse;
      if (searchData.pairs) {
        pairs = [...pairs, ...searchData.pairs];
      }
    }

    // Filter to Solana only, positive volume, deduplicate by pairAddress
    const seen = new Set<string>();
    pairs = pairs.filter((p) => {
      if (p.chainId !== "solana") return false;
      if (!p.volume?.h24 || p.volume.h24 < 1000) return false;
      if (seen.has(p.pairAddress)) return false;
      seen.add(p.pairAddress);
      return true;
    });

    // Score and sort by bullish momentum
    const scored = pairs
      .map((p) => ({ ...p, bullishScore: getBullishScore(p) }))
      .sort((a, b) => b.bullishScore - a.bullishScore)
      .slice(0, 50);

    return NextResponse.json({ pairs: scored, updatedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
