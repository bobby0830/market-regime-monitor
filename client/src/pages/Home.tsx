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
  rsi14: number;
  distance_to_52w_high_pct: number;
  volume_zscore_60d: number;
  momentum_3m_pct: number;
  short_interest_pct: number | null;
  crowded_score: number;
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

  const snapshots = data.snapshots;
  const liquidityChart = data.liquidity_history.slice(-52);
  const aaiiHistory = [...data.aaii_history].reverse();
  const topPosts = data.social_posts.slice(0, 10);
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
          <div className="container py-10 lg:py-14">
            <div className="grid gap-8 lg:grid-cols-[170px_minmax(0,1fr)] lg:gap-10">
              <aside className="space-y-10 lg:sticky lg:top-8 lg:h-fit">
                <div>
                  <p className="eyebrow">Research Monitor</p>
                  <h1 className="mt-4 max-w-[9ch] font-serif-display text-4xl leading-[0.94] tracking-tight text-stone-50 sm:text-[3.3rem] lg:text-[3.7rem]">
                    {data.hero_summary.title}
                  </h1>
                </div>

                <div className="space-y-4 border-t border-white/10 pt-5 text-sm leading-7 text-stone-300">
                  <p>{data.hero_summary.subtitle}</p>
                  <div className="flex items-start gap-3 rounded-none border border-white/10 bg-white/[0.035] px-4 py-4">
                    <BookOpen className="mt-1 h-4 w-4 shrink-0 text-[#8fc1b7]" />
                    <p>設計語言採用瑞士編輯式研究桌面：強調密度、秩序、文字層級與判讀速度，而不是行銷式大字報。</p>
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
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.44fr)_252px]">
                  <article className="hero-panel overflow-hidden py-5 lg:py-6">
                    <div className="hero-grid lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
                      <div>
                        <p className="eyebrow">Regime Thesis</p>
                        <h2 className="mt-4 max-w-[17ch] font-serif-display text-[1.62rem] leading-[1.06] tracking-[-0.03em] text-stone-50 sm:text-[1.86rem] lg:max-w-[18ch] lg:text-[2.08rem]">
                          <span className="block">把悲觀、流動性與風格分化</span>
                          <span className="block">放進同一張研究桌面</span>
                        </h2>
                      </div>

                      <div className="max-w-[29rem] space-y-3 text-[0.86rem] leading-[1.95] text-stone-300/90">
                        <p>
                          這個版本已把你要求的新模組納入系統邏輯：包括 <strong>AAII 看跌比例</strong>、<strong>Vanda / BofA / 私人信用</strong>
                          的低頻風險框架、<strong>M2 / RRP / 準備金 / TGA</strong> 的流動性面板，以及 <strong>SPY ETF、標普 500 指數、十年期美債與 XMAG</strong> 的短期相關性分析。
                        </p>
                        <p>
                          社群情緒部分則先以公開可重現的方式建立 proxy，讓系統即使在沒有商業訂閱的情況下，也能持續監察網上交流平台的風險溫度與討論方向。
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 grid gap-4 md:grid-cols-3">
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

                  <aside className="research-panel flex flex-col gap-8">
                    <div>
                      <p className="eyebrow">Interpretation</p>
                      <h3 className="mt-4 max-w-[11ch] text-[1.42rem] font-semibold leading-snug tracking-tight text-stone-50">目前偏向「悲觀但未全面崩壞」的 regime</h3>
                    </div>

                    <div className="space-y-4 text-[0.92rem] leading-7 text-stone-300">
                      <p>
                        高 AAII 看跌與中性社群情緒並存，代表主觀悲觀仍高，但網上討論尚未出現一致性恐慌。這通常比單純價格下跌更值得觀察。
                      </p>
                      <div className="flex items-start gap-3 border-l border-[#8fc1b7]/60 pl-4 text-stone-200">
                        <CircleAlert className="mt-1 h-4 w-4 shrink-0 text-[#8fc1b7]" />
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

        <section className="border-y border-white/10 bg-[#0d1318]">
          <div className="container grid gap-8 py-10 lg:grid-cols-[minmax(0,1.15fr)_370px] lg:py-14">
            <article className="research-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Crowdedness Engine</p>
                  <h2>板塊擁擠度排名</h2>
                </div>
              </div>

              <p className="mt-5 text-sm leading-7 text-stone-300">
                這一塊延續你原本的 sector crowdedness 系統，並把目前最擁擠的板塊放在主畫面上。現階段簡化分數綜合了 <strong>RSI</strong>、<strong>距離 52 週高點</strong>、<strong>成交量 z-score</strong>、<strong>3 個月動能</strong> 與可取得的 <strong>short interest proxy</strong>。
              </p>

              <div className="mt-8 h-[25rem] w-full">
                <ResponsiveContainer>
                  <BarChart data={[...data.sector_scores].reverse()} layout="vertical" margin={{ left: 12, right: 12 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "rgba(231,229,228,0.7)", fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="ticker" type="category" tick={{ fill: "rgba(245,245,244,0.86)", fontSize: 12 }} tickLine={false} axisLine={false} width={50} />
                    <Tooltip contentStyle={{ backgroundColor: "#11181d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 0 }} />
                    <Bar dataKey="crowded_score" radius={0}>
                      {data.sector_scores
                        .slice()
                        .reverse()
                        .map((entry) => (
                          <Cell key={entry.ticker} fill={entry.crowded_score > 72 ? "#d16f5a" : entry.crowded_score > 60 ? "#d6b38d" : "#8fc1b7"} />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <aside className="research-panel">
              <p className="eyebrow">Top Sector</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-stone-50">{data.sector_scores[0]?.ticker ?? "—"}</h2>
              <p className="mt-4 text-sm leading-7 text-stone-300">
                目前該板塊在價格延續、成交量與短線動能上最接近「交易擁擠」狀態，因此值得搭配相關性與流動性一起觀察，以辨識是否出現 squeeze 或反轉風險。
              </p>

              <div className="mt-8 space-y-4 border-t border-white/10 pt-5 text-sm text-stone-300">
                <div className="metric-row">
                  <span>RSI 14</span>
                  <strong>{formatNumber(data.sector_scores[0]?.rsi14 ?? null, 1)}</strong>
                </div>
                <div className="metric-row">
                  <span>距離 52 週高點</span>
                  <strong>{formatNumber(data.sector_scores[0]?.distance_to_52w_high_pct ?? null, 1)}%</strong>
                </div>
                <div className="metric-row">
                  <span>3 個月動能</span>
                  <strong>{formatNumber(data.sector_scores[0]?.momentum_3m_pct ?? null, 1)}%</strong>
                </div>
              </div>
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

                <div className="mt-6 space-y-5">
                  {data.low_frequency_indicators.map((row) => (
                    <div key={row.series} className="border-t border-white/10 pt-5 first:border-t-0 first:pt-0">
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="text-sm font-semibold text-stone-100">{row.series}</h3>
                        <span className="status-chip status-chip-muted">{row.status}</span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-stone-300">{row.note}</p>
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
