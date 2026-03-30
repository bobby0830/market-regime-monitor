/*
Design reminder for this file:
- Follow the Swiss editorial research-desk philosophy.
- Prioritize asymmetric layout, readable density, and restrained motion.
- Use typography and spacing to guide analysis, not marketing-style decoration.
- Ask: does this strengthen the feeling of a research terminal on a published page?
*/

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  CandlestickChart,
  CircleAlert,
  Database,
  Landmark,
  MessageSquareText,
  ShieldAlert,
  Waves,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import marketData from "../data/marketData.json";

type Snapshot = {
  label: string;
  value: number | null;
  unit: string;
  status: string;
  description: string;
  source: string;
  frequency: string;
  methodology: string;
  as_of?: string | null;
};

type CorrelationRow = {
  window: string;
  spy_vs_bond: number;
  spx_vs_bond: number;
  xmag_vs_bond: number;
  spy_vs_xmag: number;
  interpretation: string;
};

type MatrixRow = {
  window: string;
  asset_x: string;
  asset_y: string;
  corr: number | null;
};

type LiquidityRow = {
  date: string;
  reserves: number;
  tga: number;
  m2: number;
  rrp: number;
  net_liquidity: number;
  net_liquidity_13w_change: number | null;
  m2_yoy: number | null;
};

type AaiiRow = {
  date: string;
  bullish: number;
  neutral: number;
  bearish: number;
};

type SectorRow = {
  ticker: string;
  name: string;
  english_name: string;
  description: string;
  rsi14: number;
  distance_to_52w_high_pct: number;
  volume_zscore_60d: number;
  momentum_3m_pct: number;
  short_interest_pct: number | null;
  crowded_score: number;
  crowded_change_5d: number | null;
  crowded_change_20d: number | null;
  current_rank: number;
};

type SectorHistoryRow = {
  date: string;
  ticker: string;
  name: string;
  crowded_score: number;
  crowded_change_5d: number | null;
  crowded_change_20d: number | null;
};

type UpdatePolicy = {
  last_refresh: string;
  cadence: string;
  delivery_mode: string;
  analysis_flow: string;
  automation_status: string;
  published_site_note: string;
  recommended_next_step: string;
};

type SocialRow = {
  subreddit: string;
  title: string;
  published: string;
  positive_hits: number;
  negative_hits: number;
  score: number;
};

type LowFreqRow = {
  series: string;
  latest_value: number | null;
  unit: string;
  as_of: string;
  update_frequency: string;
  status: string;
  source: string;
  note: string;
};

type MethodologyRow = {
  module: string;
  description: string;
  limitations: string;
};

const data = marketData as {
  hero_summary: { title: string; subtitle: string; selected_philosophy: string };
  generated_at: string;
  snapshots: Snapshot[];
  aaii_history: AaiiRow[];
  liquidity_history: LiquidityRow[];
  liquidity_summary: { series: string; value: number | null; unit: string }[];
  correlation_summary: CorrelationRow[];
  correlation_matrix: MatrixRow[];
  correlation_meta: Record<string, string>;
  sector_scores: SectorRow[];
  sector_history: SectorHistoryRow[];
  update_policy: UpdatePolicy;
  social_posts: SocialRow[];
  low_frequency_indicators: LowFreqRow[];
  us10y_series: { date: string; value: number }[];
  methodology: MethodologyRow[];
};

const windowLabels: Record<string, string> = {
  "20d": "20 日",
  "60d": "60 日",
  "120d": "120 日",
};

const crowdedHistoryViewLabels = {
  score: "擁擠度分數",
  change5d: "5 日變化軌跡",
  change20d: "20 日變化軌跡",
} as const;

const assetOrder = ["spy_etf", "spx_index", "us10y_price_proxy", "xmag"];

const moduleIcons: Record<string, typeof Activity> = {
  "AAII 看跌比例": BrainCircuit,
  "淨流動性脈衝": Waves,
  "社群情緒指標": MessageSquareText,
  "板塊擁擠度領先者": CandlestickChart,
};

function formatNumber(value: number | null, digits = 1) {
  if (value === null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("zh-HK", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

function formatCompact(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function correlationTone(value: number | null) {
  if (value === null) return "neutral";
  if (value >= 0.3) return "positive";
  if (value <= -0.3) return "negative";
  return "neutral";
}

function correlationClass(value: number | null) {
  const tone = correlationTone(value);
  if (tone === "positive") return "bg-emerald-500/18 text-emerald-200 border-emerald-500/35";
  if (tone === "negative") return "bg-red-500/15 text-red-200 border-red-500/35";
  return "bg-white/5 text-stone-200 border-white/10";
}

function formatSigned(value: number | null, digits = 1, suffix = "") {
  if (value === null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatNumber(Math.abs(value), digits)}${suffix}`;
}

function crowdedDeltaClass(value: number | null) {
  if (value === null || Number.isNaN(value)) return "bg-white/5 text-stone-200 border-white/10";
  if (value > 0) return "bg-red-500/15 text-red-200 border-red-500/35";
  if (value < 0) return "bg-emerald-500/18 text-emerald-200 border-emerald-500/35";
  return "bg-white/5 text-stone-200 border-white/10";
}

function SnapshotCard({ snapshot }: { snapshot: Snapshot }) {
  const Icon = moduleIcons[snapshot.label] ?? Activity;
  const isPositive = snapshot.status.includes("improving") || snapshot.status.includes("contrarian") || snapshot.status.includes("balanced");

  return (
    <article className="research-panel group min-h-[220px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Live Module</p>
          <h3 className="mt-3 text-lg font-semibold text-stone-50">{snapshot.label}</h3>
        </div>
        <div className="icon-chip">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-10 flex items-end justify-between gap-4">
        <div>
          <div className="metric-value">
            {snapshot.value === null ? "—" : formatNumber(snapshot.value, snapshot.unit === "%" ? 1 : 1)}
            <span className="metric-unit">{snapshot.unit}</span>
          </div>
          <p className="mt-3 max-w-[26ch] text-sm leading-6 text-stone-300/85">{snapshot.description}</p>
        </div>

        <span className={`status-chip ${isPositive ? "status-chip-positive" : "status-chip-muted"}`}>
          {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {snapshot.status}
        </span>
      </div>

      <div className="mt-8 border-t border-white/10 pt-4 text-xs text-stone-400">
        <div className="flex items-center justify-between gap-4">
          <span>{snapshot.frequency}</span>
          <span>{snapshot.as_of ?? "—"}</span>
        </div>
      </div>
    </article>
  );
}

function InsightStrip({ text }: { text: string }) {
  return (
    <div className="border-y border-white/10 bg-white/[0.03]">
      <div className="container grid gap-4 py-4 lg:grid-cols-[180px_1fr] lg:items-start">
        <div className="eyebrow pt-1">Desk Note</div>
        <p className="text-sm leading-7 text-stone-300">{text}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [selectedWindow, setSelectedWindow] = useState<"20d" | "60d" | "120d">("20d");
  const [selectedSectorTicker, setSelectedSectorTicker] = useState<string>(data.sector_scores[0]?.ticker ?? "XLE");
  const [selectedCrowdedHistoryView, setSelectedCrowdedHistoryView] = useState<keyof typeof crowdedHistoryViewLabels>("score");

  const snapshots = data.snapshots;
  const liquidityChart = data.liquidity_history.slice(-52);
  const aaiiHistory = [...data.aaii_history].reverse();
  const topPosts = data.social_posts.slice(0, 10);
  const sectorRanking = useMemo(
    () => data.sector_scores.map((item) => ({ ...item, display_name: `${item.name} (${item.ticker})` })),
    [],
  );
  const selectedSector = useMemo(
    () => data.sector_scores.find((item) => item.ticker === selectedSectorTicker) ?? data.sector_scores[0],
    [selectedSectorTicker],
  );
  const selectedSectorHistory = useMemo(
    () => data.sector_history.filter((item) => item.ticker === selectedSectorTicker),
    [selectedSectorTicker],
  );
  const selectedSectorHistoryConfig = useMemo(() => {
    if (selectedCrowdedHistoryView === "change5d") {
      return {
        dataKey: "crowded_change_5d" as const,
        title: "近 1 年 · 5 日變化軌跡",
        description: "把每天相對 5 個交易日前的變化量畫出來，適合看短線升溫是否正在加速。",
        stroke: "#d16f5a",
        domain: [-20, 20] as [number, number],
        formatter: (value: number) => `${formatSigned(value, 1)} pt`,
      };
    }

    if (selectedCrowdedHistoryView === "change20d") {
      return {
        dataKey: "crowded_change_20d" as const,
        title: "近 1 年 · 20 日變化軌跡",
        description: "把每天相對 20 個交易日前的變化量畫出來，適合判斷中期擁擠是在延續還是回落。",
        stroke: "#d6b38d",
        domain: [-30, 30] as [number, number],
        formatter: (value: number) => `${formatSigned(value, 1)} pt`,
      };
    }

    return {
      dataKey: "crowded_score" as const,
      title: "近 1 年 · 擁擠度分數",
      description: "直接查看板塊擁擠度本身的歷史分數，適合辨認當前位置是否處於高位區。",
      stroke: "#8fc1b7",
      domain: [0, 100] as [number, number],
      formatter: (value: number) => `${formatNumber(value, 1)} /100`,
    };
  }, [selectedCrowdedHistoryView]);
  const selectedSectorConclusion = useMemo(() => {
    if (!selectedSector) {
      return {
        label: "—",
        toneClass: "bg-white/5 text-stone-200 border-white/10",
        sentence: "目前沒有可用的板塊資料。",
      };
    }

    const score = selectedSector.crowded_score ?? 0;
    const change5d = selectedSector.crowded_change_5d ?? 0;
    const change20d = selectedSector.crowded_change_20d ?? 0;
    const latest = selectedSectorHistory.at(-1)?.crowded_score ?? score;
    const fiveDaysAgo = selectedSectorHistory.at(-6)?.crowded_score ?? latest - change5d;
    const localSlope = latest - fiveDaysAgo;

    if ((change5d >= 3 && change20d >= 0) || (score >= 65 && change5d > 0 && localSlope > 0)) {
      return {
        label: "升溫",
        toneClass: "bg-red-500/15 text-red-200 border-red-500/35",
        sentence: `${selectedSector.name} 的擁擠度正在升溫，5 日與短線斜率同步走高，代表資金與交易共識正重新往這個板塊集中。`,
      };
    }

    if ((change5d > 0 && change20d < 0) || (Math.abs(change5d) < 3 && score >= 45)) {
      return {
        label: "鈍化",
        toneClass: "bg-amber-500/15 text-amber-200 border-amber-500/35",
        sentence: `${selectedSector.name} 的擁擠度仍在中高區間，但短線彈升尚未扭轉中期降溫，表示原本的熱門交易正在鈍化而非重新全面加速。`,
      };
    }

    return {
      label: "退潮",
      toneClass: "bg-emerald-500/18 text-emerald-200 border-emerald-500/35",
      sentence: `${selectedSector.name} 的擁擠度處於退潮階段，5 日與 20 日變化大致偏弱，代表前期集中部位正在鬆動，較適合拿來對照熱門板塊的資金撤出節奏。`,
    };
  }, [selectedSector, selectedSectorHistory]);
  const latestCorrelation = useMemo(
    () => data.correlation_summary.find((item) => item.window === selectedWindow) ?? data.correlation_summary[0],
    [selectedWindow],
  );

  const matrixByWindow = useMemo(() => {
    const filtered = data.correlation_matrix.filter((item) => item.window === selectedWindow);
    return assetOrder.map((assetX) =>
      assetOrder.map((assetY) => filtered.find((item) => item.asset_x === assetX && item.asset_y === assetY) ?? null),
    );
  }, [selectedWindow]);

  const headlineNote = useMemo(() => {
    const aaii = snapshots.find((item) => item.label === "AAII 看跌比例");
    const liquidity = snapshots.find((item) => item.label === "淨流動性脈衝");
    const sentiment = snapshots.find((item) => item.label === "社群情緒指標");
    const crowded = snapshots.find((item) => item.label === "板塊擁擠度領先者");

    return `目前系統顯示，AAII 看跌比例維持在 ${formatNumber(aaii?.value ?? null)}${aaii?.unit ?? ""}，明顯高於長期平均；淨流動性脈衝分數約為 ${formatNumber(liquidity?.value ?? null)}${liquidity?.unit ?? ""}，社群情緒則落在 ${formatNumber(sentiment?.value ?? null)}${sentiment?.unit ?? ""} 的中性附近。板塊擁擠度方面，${crowded?.status ?? "—"} 暫時是最擁擠板塊，代表風格輪動與部位集中仍值得持續監察。`;
  }, [snapshots]);

  return (
    <div className="min-h-screen bg-[#0b1014] text-stone-100">
      <div className="absolute inset-x-0 top-0 -z-0 h-[42rem] bg-[radial-gradient(circle_at_top_left,_rgba(95,143,137,0.28),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(168,92,62,0.16),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.04),_transparent_40%)]" />
      <div className="grain-overlay" />

      <main className="relative z-10">
        <section className="border-b border-white/10">
          <div className="container py-8 lg:py-12">
            <div className="grid gap-5 lg:grid-cols-[118px_minmax(0,1fr)] lg:gap-6">
              <aside className="space-y-8 lg:sticky lg:top-8 lg:h-fit">
                <div>
                  <p className="eyebrow">Research Monitor</p>
                  <h1 className="mt-2.5 max-w-[7.5ch] font-serif-display text-[2.22rem] leading-[0.94] tracking-tight text-stone-50 sm:text-[2.55rem] lg:text-[2.72rem]">
                    {data.hero_summary.title}
                  </h1>
                </div>

                <div className="space-y-3 border-t border-white/10 pt-4 text-[0.84rem] leading-6 text-stone-300">
                  <p>{data.hero_summary.subtitle}</p>
                  <div className="flex items-start gap-2.5 rounded-none border border-white/10 bg-white/[0.025] px-3 py-3">
                    <BookOpen className="mt-1 h-3.5 w-3.5 shrink-0 text-[#8fc1b7]" />
                    <p>瑞士編輯式研究桌面：先找資料，再看變化，最後下結論。</p>
                  </div>
                </div>

                <div className="hidden lg:block">
                  <div className="border-t border-white/10 pt-5">
                    <p className="eyebrow">Last Refresh</p>
                    <p className="mt-3 text-sm text-stone-300">
                      {new Date(data.generated_at).toLocaleString("zh-HK", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </aside>

              <div className="space-y-8">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.42fr)_212px]">
                  <article className="hero-panel overflow-hidden py-4 lg:py-5">
                    <div className="hero-grid items-start gap-4 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
                      <div>
                        <p className="eyebrow">Regime Thesis</p>
                        <h2 className="mt-2.5 max-w-[13ch] font-serif-display text-[1.26rem] leading-[1.06] tracking-[-0.02em] text-stone-50 sm:text-[1.42rem] lg:max-w-[14ch] lg:text-[1.58rem]">
                          <span className="block">把悲觀、流動性與風格分化</span>
                          <span className="block">放進同一張研究桌面</span>
                        </h2>
                      </div>

                      <div className="max-w-[32rem] space-y-3 text-[0.78rem] leading-[1.7] text-stone-300/90">
                        <p>
                          這個版本把 <strong>AAII 看跌比例</strong>、<strong>M2 / RRP / 準備金 / TGA</strong>、<strong>SPY / SPX / 10Y / XMAG 相關性</strong>，以及 <strong>社群情緒 proxy</strong> 放進同一套研究框架。
                        </p>
                        <div className="grid gap-2.5 border border-white/10 bg-white/[0.025] px-3.5 py-3">
                          <div className="grid gap-2 text-[0.68rem] uppercase tracking-[0.14em] text-stone-500 sm:grid-cols-3">
                            <span>01 找資料</span>
                            <span>02 看變化</span>
                            <span>03 下結論</span>
                          </div>
                          <div className="grid gap-3">
                            <p>
                              從板塊擁擠度開始，點進去看單一板塊的 <strong>5 日 / 20 日變化</strong> 與 <strong>近 90 日歷史走勢</strong>，再配合右側解讀做判讀。
                            </p>
                            <div className="inline-flex w-fit items-center gap-2 border border-[#8fc1b7]/22 bg-[#0f171b] px-3 py-2 text-[0.68rem] uppercase tracking-[0.14em] text-stone-300">
                              <span className="text-stone-500">建議起點</span>
                              <span className="text-stone-100">先看板塊排名，再切到右側歷史視角</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <div className="inline-stat">
                        <span className="inline-stat-label">AAII Bearish</span>
                        <span className="inline-stat-value">{formatNumber(data.aaii_history[0]?.bearish ?? null)}%</span>
                      </div>
                      <div className="inline-stat">
                        <span className="inline-stat-label">Net Liquidity Pulse</span>
                        <span className="inline-stat-value">{formatNumber(snapshots.find((item) => item.label === "淨流動性脈衝")?.value ?? null)}</span>
                      </div>
                      <div className="inline-stat">
                        <span className="inline-stat-label">Crowded Sector</span>
                        <span className="inline-stat-value">{snapshots.find((item) => item.label === "板塊擁擠度領先者")?.status ?? "—"}</span>
                      </div>
                    </div>
                  </article>

                  <aside className="research-panel flex flex-col gap-4.5">
                    <div>
                      <p className="eyebrow">Interpretation</p>
                      <h3 className="mt-2 max-w-[9ch] text-[1.08rem] font-semibold leading-snug tracking-tight text-stone-50">目前偏向「悲觀但未全面崩壞」的 regime</h3>
                    </div>

                    <div className="space-y-2.5 text-[0.82rem] leading-6 text-stone-300">
                      <p>
                        高 AAII 看跌與中性社群情緒並存，代表主觀悲觀仍高，但網上討論尚未出現一致性恐慌。
                      </p>
                      <div className="flex items-start gap-3 border-l border-[#8fc1b7]/60 pl-3.5 text-stone-200">
                        <CircleAlert className="mt-1 h-3.5 w-3.5 shrink-0 text-[#8fc1b7]" />
                        <p>{latestCorrelation?.interpretation}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 border-t border-white/10 pt-4 text-[0.68rem] uppercase tracking-[0.14em] text-stone-400">
                      <div className="flex items-center justify-between gap-3">
                        <span>AAII vs avg</span>
                        <strong className="text-stone-100">+{formatNumber((data.aaii_history[0]?.bearish ?? 0) - 30.5, 1)} pt</strong>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>SPY / Bond</span>
                        <strong className="text-stone-100">{formatNumber(latestCorrelation?.spy_vs_bond ?? null, 2)}</strong>
                      </div>
                    </div>
                  </aside>
                </div>

                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                  {snapshots.map((snapshot) => (
                    <SnapshotCard key={snapshot.label} snapshot={snapshot} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <InsightStrip text={headlineNote} />

        <section className="container grid gap-8 py-10 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:py-14">
          <article className="research-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Liquidity Stack</p>
                <h2> M2 / RRP / 準備金 / TGA 變化 </h2>
              </div>
              <div className="legend-note">WRESBAL − WTREGEN − RRPONTSYD</div>
            </div>

            <p className="mt-5 max-w-3xl text-sm leading-7 text-stone-300">
              這個面板把你要求的 <strong>M2</strong>、<strong>逆回購 RRP</strong>、<strong>銀行準備金</strong> 與 <strong>TGA 財政部餘額</strong>
              放進同一視圖，核心目的是判斷流動性是在流入風險資產，還是被財政與貨幣市場工具重新吸走。
            </p>

            <div className="mt-8 h-[24rem] w-full">
              <ResponsiveContainer>
                <LineChart data={liquidityChart}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "rgba(231,229,228,0.7)", fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tick={{ fill: "rgba(231,229,228,0.7)", fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#11181d",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 0,
                      color: "#fafaf9",
                    }}
                    formatter={(value: number, name: string) => [formatCompact(value), name]}
                  />
                  <Legend wrapperStyle={{ color: "#d6d3d1", fontSize: "12px" }} />
                  <Line type="monotone" dataKey="net_liquidity" name="Net Liquidity" stroke="#8fc1b7" strokeWidth={2.2} dot={false} />
                  <Line type="monotone" dataKey="reserves" name="Reserves" stroke="#d6b38d" strokeWidth={1.3} dot={false} />
                  <Line type="monotone" dataKey="tga" name="TGA" stroke="#d16f5a" strokeWidth={1.3} dot={false} />
                  <Line type="monotone" dataKey="rrp" name="RRP" stroke="#8da8d6" strokeWidth={1.3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <aside className="space-y-5">
            <article className="research-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Weekly Snapshot</p>
                  <h2>流動性摘要</h2>
                </div>
                <Landmark className="h-4 w-4 text-[#8fc1b7]" />
              </div>

              <div className="mt-6 space-y-4">
                {data.liquidity_summary.map((item) => (
                  <div key={item.series} className="metric-row">
                    <span>{item.series}</span>
                    <strong>{item.unit === "%" ? `${formatNumber(item.value, 2)}%` : formatCompact(item.value)}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="research-panel">
              <p className="eyebrow">Readout</p>
              <p className="mt-4 text-sm leading-7 text-stone-300">
                如果 <strong>準備金上升</strong> 但 <strong>TGA 同步上升</strong>，市場感受到的有效流動性改善可能會被部分抵銷；反之，若 TGA 回落且 RRP 低位徘徊，股票與高 beta 資產通常更容易受益。
              </p>
            </article>
          </aside>
        </section>

        <section className="border-y border-white/10 bg-[#0d1318]">
          <div className="container grid gap-8 py-10 lg:grid-cols-[340px_minmax(0,1fr)] lg:py-14">
            <article className="research-panel">
              <p className="eyebrow">Behavioral Signal</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-stone-50">AAII 看跌比例</h2>
              <p className="mt-4 text-sm leading-7 text-stone-300">
                AAII 的 bearish 讀數本身常被當作反向指標。高看跌不代表市場一定馬上轉強，但它提示你：投資人的心理擺盪已明顯偏向防禦，這時候更需要與流動性和相關性一起看。
              </p>

              <div className="mt-8 border-t border-white/10 pt-5 text-sm text-stone-300">
                <div className="metric-row">
                  <span>最新 Bearish</span>
                  <strong>{formatNumber(data.aaii_history[0]?.bearish ?? null)}%</strong>
                </div>
                <div className="metric-row">
                  <span>長期平均</span>
                  <strong>30.5%</strong>
                </div>
                <div className="metric-row">
                  <span>相對偏離</span>
                  <strong>
                    {formatNumber((data.aaii_history[0]?.bearish ?? 0) - 30.5)} pct pts
                  </strong>
                </div>
              </div>
            </article>

            <article className="research-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Weekly Survey</p>
                  <h2>近期多空分布</h2>
                </div>
              </div>

              <div className="mt-6 h-[23rem] w-full">
                <ResponsiveContainer>
                  <AreaChart data={aaiiHistory}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "rgba(231,229,228,0.7)", fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "rgba(231,229,228,0.7)", fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#11181d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 0 }}
                    />
                    <Legend wrapperStyle={{ color: "#d6d3d1", fontSize: "12px" }} />
                    <Area type="monotone" dataKey="bearish" stackId="1" stroke="#d16f5a" fill="#d16f5a55" name="Bearish" />
                    <Area type="monotone" dataKey="neutral" stackId="1" stroke="#8b8b86" fill="#8b8b8645" name="Neutral" />
                    <Area type="monotone" dataKey="bullish" stackId="1" stroke="#8fc1b7" fill="#8fc1b755" name="Bullish" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>
        </section>

        <section className="container py-10 lg:py-14">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_370px]">
            <article className="research-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Cross-Asset Structure</p>
                  <h2>SPY ETF / 標普 500 指數 / 十年期美債 / XMAG</h2>
                </div>
                <div className="segmented-control">
                  {(["20d", "60d", "120d"] as const).map((window) => (
                    <button
                      key={window}
                      type="button"
                      onClick={() => setSelectedWindow(window)}
                      className={selectedWindow === window ? "segment-active" : "segment-inactive"}
                    >
                      {windowLabels[window]}
                    </button>
                  ))}
                </div>
              </div>

              <p className="mt-5 max-w-3xl text-sm leading-7 text-stone-300">
                這裡專門回答你新增的問題：系統會追蹤 <strong>SPY ETF</strong>、<strong>標準普爾 500 指數</strong>、<strong>美國十年期國債價格代理</strong> 與 <strong>XMAG</strong> 在短期內究竟是偏向正相關還是負相關。
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-4">
                <div className={`corr-pill ${correlationClass(latestCorrelation?.spy_vs_bond ?? null)}`}>
                  <span>SPY vs 10Y Bond</span>
                  <strong>{formatNumber(latestCorrelation?.spy_vs_bond ?? null, 2)}</strong>
                </div>
                <div className={`corr-pill ${correlationClass(latestCorrelation?.spx_vs_bond ?? null)}`}>
                  <span>SPX vs 10Y Bond</span>
                  <strong>{formatNumber(latestCorrelation?.spx_vs_bond ?? null, 2)}</strong>
                </div>
                <div className={`corr-pill ${correlationClass(latestCorrelation?.xmag_vs_bond ?? null)}`}>
                  <span>XMAG vs 10Y Bond</span>
                  <strong>{formatNumber(latestCorrelation?.xmag_vs_bond ?? null, 2)}</strong>
                </div>
                <div className={`corr-pill ${correlationClass(latestCorrelation?.spy_vs_xmag ?? null)}`}>
                  <span>SPY vs XMAG</span>
                  <strong>{formatNumber(latestCorrelation?.spy_vs_xmag ?? null, 2)}</strong>
                </div>
              </div>

              <div className="mt-8 overflow-hidden border border-white/10">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-white/[0.04] text-left text-stone-300">
                      <th className="px-4 py-3">資產</th>
                      {assetOrder.map((asset) => (
                        <th key={asset} className="px-4 py-3 text-right">
                          {data.correlation_meta[asset]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assetOrder.map((assetX, rowIndex) => (
                      <tr key={assetX} className="border-t border-white/10">
                        <td className="px-4 py-3 font-medium text-stone-100">{data.correlation_meta[assetX]}</td>
                        {matrixByWindow[rowIndex].map((cell, cellIndex) => (
                          <td key={`${assetX}-${cellIndex}`} className="px-4 py-3 text-right">
                            <span className={`inline-flex min-w-[5.2rem] justify-center border px-2.5 py-1 ${correlationClass(cell?.corr ?? null)}`}>
                              {formatNumber(cell?.corr ?? null, 2)}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <aside className="space-y-5">
              <article className="research-panel">
                <p className="eyebrow">Short-Term Read</p>
                <p className="mt-4 text-sm leading-7 text-stone-300">{latestCorrelation?.interpretation}</p>
              </article>

              <article className="research-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Reference Series</p>
                    <h2>10Y Yield</h2>
                  </div>
                  <ShieldAlert className="h-4 w-4 text-[#d6b38d]" />
                </div>
                <div className="mt-6 h-[15rem] w-full">
                  <ResponsiveContainer>
                    <LineChart data={data.us10y_series.slice(-120)}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "rgba(231,229,228,0.7)", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis tick={{ fill: "rgba(231,229,228,0.7)", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#11181d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 0 }} />
                      <Line type="monotone" dataKey="value" stroke="#d6b38d" strokeWidth={2} dot={false} name="10Y Yield" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </aside>
          </div>
        </section>

        <section id="crowdedness-drilldown" className="border-y border-white/10 bg-[#0d1318]">
          <div className="container grid gap-8 py-10 lg:grid-cols-[minmax(0,1.2fr)_390px] lg:py-14">
            <article className="research-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Crowdedness Engine</p>
                  <h2>板塊擁擠度排名</h2>
                </div>
              </div>

                <p className="mt-5 text-sm leading-7 text-stone-300">
                  我已把原本只顯示代碼的方式改成 <strong>板塊全名 + ticker</strong>。例如 <strong>XLY = 非必需消費</strong>、<strong>XLF = 金融</strong>、<strong>XLK = 科技</strong>。下方每一列都可以點擊，右側面板會同步切換到該板塊，讓你直接看 <strong>擁擠度分數</strong>、<strong>5 日 / 20 日變化歷史軌跡</strong> 與 <strong>分析結論</strong>。
                </p>


              <div className="mt-6 grid gap-3 border border-white/10 bg-white/[0.03] p-3.5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
                <div>
                  <p className="eyebrow">How To Read</p>
                  <p className="mt-2.5 text-sm leading-6.5 text-stone-300">先看排名與分數，再點進去看 5 日與 20 日變化，最後用右側歷史走勢確認擁擠是在升溫、鈍化，還是正在退潮。</p>
                </div>
                <div className="grid gap-2.5 text-sm text-stone-300 sm:grid-cols-3">
                  <div className="border border-white/10 px-3 py-2.5">
                    <div className="text-[0.68rem] uppercase tracking-[0.16em] text-stone-500">Find Data</div>
                    <div className="mt-1.5 text-stone-100">板塊全名、來源、刷新時間</div>
                  </div>
                  <div className="border border-white/10 px-3 py-2.5">
                    <div className="text-[0.68rem] uppercase tracking-[0.16em] text-stone-500">Read Signal</div>
                    <div className="mt-1.5 text-stone-100">即時分數、5 日變化、20 日變化</div>
                  </div>
                  <div className="border border-white/10 px-3 py-2.5">
                    <div className="text-[0.68rem] uppercase tracking-[0.16em] text-stone-500">Make Conclusion</div>
                    <div className="mt-1.5 text-stone-100">結合走勢與說明做判讀</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 border border-[#8fc1b7]/18 bg-[#0f171b] px-3.5 py-2 text-sm text-stone-300 md:grid-cols-[minmax(0,1fr)_minmax(230px,0.82fr)] md:items-center">
                <div>
                  <div className="text-[0.62rem] uppercase tracking-[0.16em] text-stone-500">Step 1 · 目前選中的板塊</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-stone-100">
                    <span>{selectedSector?.name ?? "—"} ({selectedSector?.ticker ?? "—"})</span>
                    <span className="border border-[#8fc1b7]/35 bg-[#122126] px-2 py-0.5 text-[0.62rem] uppercase tracking-[0.16em] text-[#b6d9d2]">已同步到右側</span>
                  </div>
                </div>
                <div className="border-l-0 border-white/10 pt-0 text-[0.7rem] leading-5 text-stone-400 md:border-l md:pl-3.5">
                  先確認目前選中的板塊，再往下切換清單；右側詳情與近 1 年歷史視角會同步更新。
                </div>
              </div>

              <div className="mt-6 h-[23rem] w-full">
                <ResponsiveContainer>
                  <BarChart data={[...sectorRanking].reverse()} layout="vertical" margin={{ left: 12, right: 12 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "rgba(231,229,228,0.7)", fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fill: "rgba(245,245,244,0.86)", fontSize: 12 }} tickLine={false} axisLine={false} width={88} />
                    <Bar dataKey="crowded_score" radius={0}>
                      {sectorRanking
                        .slice()
                        .reverse()
                        .map((entry) => (
                          <Cell key={entry.ticker} fill={entry.crowded_score > 72 ? "#d16f5a" : entry.crowded_score > 60 ? "#d6b38d" : "#8fc1b7"} />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-[0.12rem] grid gap-0 border border-white/10 bg-white/[0.02] px-[0.66rem] py-[0.05rem] text-sm text-stone-400 md:grid-cols-[minmax(0,1fr)_minmax(108px,0.42fr)] md:items-center">
                <div>
                  <div className="text-[0.54rem] uppercase tracking-[0.14em] text-stone-500">Step 2 · 選擇你要分析的板塊</div>
                  <div className="mt-0 text-[0.46rem] leading-[0.52rem] text-stone-200">上方柱圖看整體排名；下方清單切換右側詳情。</div>
                </div>
                <div className="text-[0.37rem] leading-[0.44rem] text-stone-500 md:text-right">
                  建議先挑 <strong className="text-stone-300">分數最高</strong> 或 <strong className="text-stone-300">5 日 / 20 日變化最大</strong> 的板塊，再去右側讀變化與結論。
                </div>
              </div>

              <div className="mt-[0.02rem] space-y-[0.02rem]">
                {sectorRanking.map((sector) => (
                  <button
                    key={sector.ticker}
                    type="button"
                    onClick={() => setSelectedSectorTicker(sector.ticker)}
                    className={`grid w-full gap-[0.03rem] border px-[0.66rem] py-[0.26rem] text-left transition-all md:grid-cols-[28px_minmax(0,1fr)_40px_40px_40px] ${
                      selectedSectorTicker === sector.ticker
                        ? "border-[#93d0c4] bg-[#0b1517] shadow-[inset_5px_0_0_0_rgba(147,208,196,1),inset_0_0_0_1px_rgba(147,208,196,0.34),0_0_0_1px_rgba(147,208,196,0.22)]"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                    }`}
                  >
                    <div>
                      <div className="text-[0.43rem] uppercase tracking-[0.11em] text-stone-500">Rank</div>
                      <div className="mt-0 flex items-center gap-[0.16rem] text-[0.55rem] font-semibold text-stone-100">
                        <span>#{sector.current_rank}</span>
                        {selectedSectorTicker === sector.ticker ? <span className="h-2 w-2 rounded-full bg-[#8fc1b7]" /> : null}
                      </div>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1">
                        <div className="text-[0.55rem] font-semibold text-stone-100">{sector.name} ({sector.ticker})</div>
                        {selectedSectorTicker === sector.ticker ? <span className="border border-[#9fe1d4]/80 bg-[#11272a] px-[0.14rem] py-[0.04rem] text-[0.3rem] font-semibold uppercase tracking-[0.07em] text-[#e7fbf6]">目前查看中</span> : null}
                      </div>
                      <div className="mt-0 text-[0.37rem] leading-[0.4rem] text-stone-400">{sector.english_name}</div>
                    </div>
                    <div>
                      <div className="text-[0.43rem] uppercase tracking-[0.11em] text-stone-500">Score</div>
                      <div className="mt-0 text-[0.53rem] font-semibold text-stone-100">{formatNumber(sector.crowded_score, 1)}</div>
                    </div>
                    <div>
                      <div className="text-[0.43rem] uppercase tracking-[0.11em] text-stone-500">5 日變化</div>
                      <div className={`mt-0 inline-flex min-w-[1.78rem] justify-center border px-[0.32rem] py-[0.06rem] text-[0.42rem] ${crowdedDeltaClass(sector.crowded_change_5d)}`}>
                        {formatSigned(sector.crowded_change_5d, 1)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[0.43rem] uppercase tracking-[0.11em] text-stone-500">20 日變化</div>
                      <div className={`mt-0 inline-flex min-w-[1.78rem] justify-center border px-[0.32rem] py-[0.06rem] text-[0.42rem] ${crowdedDeltaClass(sector.crowded_change_20d)}`}>
                        {formatSigned(sector.crowded_change_20d, 1)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </article>

            <aside className="space-y-5">
              <article className="research-panel">
                <p className="eyebrow">Step 3 · Selected Sector Drill-down</p>
                <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-semibold tracking-tight text-stone-50">{selectedSector?.name ?? "—"} <span className="text-stone-400">({selectedSector?.ticker ?? "—"})</span></h2>
                    <p className="mt-2 text-sm text-stone-400">{selectedSector?.english_name} · Rank #{selectedSector?.current_rank ?? "—"}</p>
                  </div>
                  <div className="border border-[#8fc1b7]/35 bg-[#122126] px-3 py-2 text-[0.68rem] uppercase tracking-[0.16em] text-[#b6d9d2]">點擊左側清單即可切換</div>
                </div>
                <p className="mt-4 text-sm leading-7 text-stone-300">{selectedSector?.description}</p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="border border-white/10 px-3 py-3">
                    <div className="text-[0.68rem] uppercase tracking-[0.16em] text-stone-500">Current Score</div>
                    <div className="mt-2 text-2xl font-semibold text-stone-100">{formatNumber(selectedSector?.crowded_score ?? null, 1)}</div>
                  </div>
                  <div className="border border-white/10 px-3 py-3">
                    <div className="text-[0.68rem] uppercase tracking-[0.16em] text-stone-500">5 日</div>
                    <div className={`mt-2 inline-flex min-w-[5rem] justify-center border px-2.5 py-1.5 text-sm ${crowdedDeltaClass(selectedSector?.crowded_change_5d ?? null)}`}>{formatSigned(selectedSector?.crowded_change_5d ?? null, 1)}</div>
                  </div>
                  <div className="border border-white/10 px-3 py-3">
                    <div className="text-[0.68rem] uppercase tracking-[0.16em] text-stone-500">20 日</div>
                    <div className={`mt-2 inline-flex min-w-[5rem] justify-center border px-2.5 py-1.5 text-sm ${crowdedDeltaClass(selectedSector?.crowded_change_20d ?? null)}`}>{formatSigned(selectedSector?.crowded_change_20d ?? null, 1)}</div>
                  </div>
                </div>

                <div className="mt-7 border border-white/10 bg-white/[0.035] px-3.5 py-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className={`inline-flex border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] ${selectedSectorConclusion.toneClass}`}>
                      {selectedSectorConclusion.label}
                    </span>
                    <span className="text-[0.68rem] uppercase tracking-[0.14em] text-stone-500">Auto Conclusion</span>
                  </div>
                  <p className="mt-2.5 text-[0.94rem] leading-6 text-stone-100">{selectedSectorConclusion.sentence}</p>
                </div>

                <div className="mt-3 border border-[#8fc1b7]/18 bg-white/[0.025] px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[0.7rem] uppercase tracking-[0.14em] text-stone-500">Historical View</div>
                      <div className="mt-1 text-sm text-stone-200">{selectedSectorHistoryConfig.title}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(crowdedHistoryViewLabels) as [keyof typeof crowdedHistoryViewLabels, string][]).map(([viewKey, label]) => (
                        <button
                          key={viewKey}
                          type="button"
                          onClick={() => setSelectedCrowdedHistoryView(viewKey)}
                          className={selectedCrowdedHistoryView === viewKey ? "segment-active" : "segment-inactive"}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-stone-400">{selectedSectorHistoryConfig.description}</p>
                </div>

                <div className="mt-3 h-[16rem] w-full border border-white/10 bg-white/[0.02] p-3">
                  <ResponsiveContainer>
                    <LineChart data={selectedSectorHistory}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "rgba(231,229,228,0.7)", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis domain={selectedSectorHistoryConfig.domain} tick={{ fill: "rgba(231,229,228,0.7)", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#11181d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 0 }}
                        formatter={(value: number) => [selectedSectorHistoryConfig.formatter(value), crowdedHistoryViewLabels[selectedCrowdedHistoryView]]}
                        labelFormatter={(label) => `${selectedSector?.name ?? "板塊"} · ${label}`}
                      />
                      <Line type="monotone" dataKey={selectedSectorHistoryConfig.dataKey} stroke={selectedSectorHistoryConfig.stroke} strokeWidth={2.1} dot={false} connectNulls={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-6 space-y-4 border-t border-white/10 pt-5 text-sm text-stone-300">
                  <div className="metric-row">
                    <span>RSI 14</span>
                    <strong>{formatNumber(selectedSector?.rsi14 ?? null, 1)}</strong>
                  </div>
                  <div className="metric-row">
                    <span>距離 52 週高點</span>
                    <strong>{formatNumber(selectedSector?.distance_to_52w_high_pct ?? null, 1)}%</strong>
                  </div>
                  <div className="metric-row">
                    <span>60 日成交量 z-score</span>
                    <strong>{formatNumber(selectedSector?.volume_zscore_60d ?? null, 2)}</strong>
                  </div>
                  <div className="metric-row">
                    <span>3 個月動能</span>
                    <strong>{formatNumber(selectedSector?.momentum_3m_pct ?? null, 1)}%</strong>
                  </div>
                </div>
              </article>

              <article className="research-panel">
                <p className="eyebrow">Update Policy</p>
                <h3 className="mt-4 text-xl font-semibold tracking-tight text-stone-50">資料會持續更新嗎？</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="border border-white/10 bg-white/[0.025] px-4 py-3">
                    <div className="text-[0.68rem] uppercase tracking-[0.16em] text-stone-500">目前模式</div>
                    <p className="mt-2 text-sm leading-7 text-stone-300">這是靜態網站版本，因此頁面本身不會自動即時重抓資料；資料會在重新執行擷取腳本並重新發佈之後更新。</p>
                  </div>
                  <div className="border border-white/10 bg-white/[0.025] px-4 py-3">
                    <div className="text-[0.68rem] uppercase tracking-[0.16em] text-stone-500">最近刷新</div>
                    <p className="mt-2 text-sm leading-7 text-stone-100">{data.update_policy.last_refresh}</p>
                    <p className="mt-1 text-[0.78rem] leading-6 text-stone-400">可自動化的模組已重新抓取至最新可取得時間點；低頻欄位則保留來源與口徑說明。</p>
                  </div>
                </div>
                <div className="mt-4 space-y-4 text-sm leading-7 text-stone-300">
                  <p>{data.update_policy.cadence}</p>
                  <p>{data.update_policy.delivery_mode}</p>
                </div>
                <div className="mt-6 grid gap-3 text-sm text-stone-300">
                  <div className="border border-white/10 bg-white/[0.025] px-4 py-3">
                    <div className="text-[0.68rem] uppercase tracking-[0.16em] text-stone-500">Automation Status</div>
                    <p className="mt-2 leading-7">{data.update_policy.automation_status}</p>
                  </div>
                  <div className="border border-white/10 bg-white/[0.025] px-4 py-3">
                    <div className="text-[0.68rem] uppercase tracking-[0.16em] text-stone-500">Published Site Note</div>
                    <p className="mt-2 leading-7">{data.update_policy.published_site_note}</p>
                  </div>
                  <div className="border border-[#8fc1b7]/18 bg-[#102027] px-4 py-3">
                    <div className="text-[0.68rem] uppercase tracking-[0.16em] text-[#9fd8ce]">Recommended Next Step</div>
                    <p className="mt-2 leading-7 text-stone-100">{data.update_policy.recommended_next_step}</p>
                  </div>
                </div>
                <div className="mt-6 rounded-none border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-stone-300">
                  <strong className="text-stone-100">最佳使用流程：</strong> {data.update_policy.analysis_flow}
                </div>
              </article>
            </aside>
          </div>
        </section>

        <section className="container py-10 lg:py-14">
          <div className="grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="space-y-5">
              <article className="research-panel">
                <p className="eyebrow">Social Monitor</p>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-stone-50">網上交流平台情緒指標</h2>
                <p className="mt-4 text-sm leading-7 text-stone-300">
                  按你的要求，系統加入了監察網上交流平台並轉化成情緒分數的模組。這個版本先採用 <strong>Reddit 多個股票社群的 RSS 新文</strong> 建立公開可重現的 proxy，之後若接入 Vanda 或其他商業 feed，可無縫升級。
                </p>
              </article>

              <article className="research-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Low-Frequency Risk</p>
                    <h2>Vanda / BofA / Private Credit</h2>
                  </div>
                  <Database className="h-4 w-4 text-[#8fc1b7]" />
                </div>

                <p className="mt-4 text-sm leading-7 text-stone-300">
                  這一區保留<strong className="text-stone-100">低頻但重要</strong>的風險線索。可自動化的高頻數據已在上方模組更新；這裡則重點標示最新可驗證口徑、日期與來源，避免把不同統計口徑混在一起讀。
                </p>

                <div className="mt-6 space-y-4">
                  {data.low_frequency_indicators.map((row) => (
                    <div key={row.series} className="border border-white/10 bg-white/[0.025] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-semibold text-stone-100">{row.series}</h3>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.14em] text-stone-500">
                            <span>As of {row.as_of}</span>
                            <span className="text-stone-600">/</span>
                            <span>{row.update_frequency}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="status-chip status-chip-muted">{row.status}</span>
                          <span className="border border-[#8fc1b7]/25 bg-[#102027] px-2.5 py-1 text-[0.74rem] font-semibold text-stone-100">
                            {row.latest_value === null ? row.unit : `${formatNumber(row.latest_value, 1)} ${row.unit}`}
                          </span>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-stone-300">{row.note}</p>
                      <div className="mt-3 border-t border-white/10 pt-3 text-[0.78rem] leading-6 text-stone-400">
                        <span className="text-stone-500">Source</span>
                        <div className="mt-1 break-all text-stone-300">{row.source}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </aside>

            <article className="research-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Open Proxy Feed</p>
                  <h2>最新社群討論樣本</h2>
                </div>
              </div>

              <div className="mt-6 overflow-hidden border border-white/10">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-white/[0.04] text-left text-stone-300">
                      <th className="px-4 py-3">來源</th>
                      <th className="px-4 py-3">標題</th>
                      <th className="px-4 py-3 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPosts.map((post) => (
                      <tr key={`${post.subreddit}-${post.published}-${post.title}`} className="border-t border-white/10 align-top">
                        <td className="px-4 py-3 text-stone-200">r/{post.subreddit}</td>
                        <td className="px-4 py-3 text-stone-300">{post.title}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex min-w-[4.5rem] justify-center border px-2.5 py-1 ${correlationClass(post.score)}`}>
                            {post.score > 0 ? `+${post.score}` : post.score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        </section>

        <section className="border-t border-white/10">
          <div className="container grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-14">
            <article className="research-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Methodology</p>
                  <h2>研究說明與限制</h2>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {data.methodology.map((row) => (
                  <details key={row.module} className="methodology-item" open={row.module === "淨流動性"}>
                    <summary>
                      <span>{row.module}</span>
                      <span>展開</span>
                    </summary>
                    <div className="mt-4 grid gap-4 text-sm leading-7 text-stone-300 md:grid-cols-2">
                      <p>{row.description}</p>
                      <p className="text-stone-400">限制：{row.limitations}</p>
                    </div>
                  </details>
                ))}
              </div>
            </article>

            <aside className="research-panel">
              <p className="eyebrow">Why This Format</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-stone-50">把研究變成可探索的靜態網頁</h2>
              <div className="mt-5 space-y-4 text-sm leading-7 text-stone-300">
                <p>這個版本不是把數據堆成單純表格，而是把你關心的宏觀、情緒與風格因子整理成可交叉閱讀的研究界面。</p>
                <p>你可以從同一頁面快速切換觀察窗口，判斷股債是短期負相關還是重新轉為同向，並把風險指標放回其制度與行為背景裡。</p>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
