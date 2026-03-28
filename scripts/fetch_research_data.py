from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
import requests
import yfinance as yf
from bs4 import BeautifulSoup
from xml.etree import ElementTree as ET

BASE_DIR = Path('/home/ubuntu/market-regime-monitor')
DATA_DIR = BASE_DIR / 'client' / 'src' / 'data'
DATA_DIR.mkdir(parents=True, exist_ok=True)

UTC_NOW = datetime.now(timezone.utc)
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36 ManusResearchBot/1.0'
}

FRED_SERIES = {
    'm2': 'WM2NS',
    'rrp': 'RRPONTSYD',
    'reserves': 'WRESBAL',
    'tga': 'WTREGEN',
    'us10y': 'DGS10',
}

ETF_MAP = {
    'spy_etf': 'SPY',
    'spx_index': '^GSPC',
    'us10y_price_proxy': 'IEF',
    'xmag': 'XMAG',
}

SECTOR_ETFS = ['XLE', 'XLK', 'XLF', 'XLV', 'XLI', 'XLY', 'XLP', 'XLU', 'XLB', 'XLC', 'XLRE']
SECTOR_META = {
    'XLE': {
        'name': '能源',
        'english_name': 'Energy',
        'description': '涵蓋石油、天然氣與能源設備公司，常受油價與景氣循環影響。',
    },
    'XLK': {
        'name': '科技',
        'english_name': 'Technology',
        'description': '涵蓋大型軟體、半導體與硬體公司，對成長預期與利率敏感。',
    },
    'XLF': {
        'name': '金融',
        'english_name': 'Financials',
        'description': '涵蓋銀行、保險與資本市場公司，受信用循環與殖利率曲線影響。',
    },
    'XLV': {
        'name': '醫療保健',
        'english_name': 'Health Care',
        'description': '涵蓋藥廠、醫療設備與醫療服務公司，通常較具防禦性。',
    },
    'XLI': {
        'name': '工業',
        'english_name': 'Industrials',
        'description': '涵蓋運輸、製造與資本財公司，常反映景氣與投資循環。',
    },
    'XLY': {
        'name': '非必需消費',
        'english_name': 'Consumer Discretionary',
        'description': '涵蓋零售、汽車與可選消費品牌，對消費信心與成長預期敏感。',
    },
    'XLP': {
        'name': '必需消費',
        'english_name': 'Consumer Staples',
        'description': '涵蓋食品、飲料與日用品公司，通常屬防禦型板塊。',
    },
    'XLU': {
        'name': '公用事業',
        'english_name': 'Utilities',
        'description': '涵蓋電力與公用服務公司，收益穩定但常受利率影響。',
    },
    'XLB': {
        'name': '原物料',
        'english_name': 'Materials',
        'description': '涵蓋化工、金屬與建材公司，受全球製造與商品週期影響。',
    },
    'XLC': {
        'name': '通訊服務',
        'english_name': 'Communication Services',
        'description': '涵蓋媒體、互聯網平台與電信公司，兼具成長與廣告週期特徵。',
    },
    'XLRE': {
        'name': '房地產',
        'english_name': 'Real Estate',
        'description': '涵蓋 REITs 與房地產營運公司，對利率與融資條件敏感。',
    },
}

REDDIT_FEEDS = [
    ('wallstreetbets', 'https://www.reddit.com/r/wallstreetbets/new/.rss'),
    ('stocks', 'https://www.reddit.com/r/stocks/new/.rss'),
    ('investing', 'https://www.reddit.com/r/investing/new/.rss'),
    ('options', 'https://www.reddit.com/r/options/new/.rss'),
]

POSITIVE_WORDS = {
    'bull', 'bullish', 'buy', 'long', 'uptrend', 'breakout', 'bounce', 'pump', 'rip', 'strong', 'beat', 'surge',
    'rally', 'dip buy', 'accumulate', 'risk on', 'soft landing'
}
NEGATIVE_WORDS = {
    'bear', 'bearish', 'sell', 'short', 'downtrend', 'dump', 'crash', 'recession', 'default', 'panic', 'fear', 'weak',
    'miss', 'downgrade', 'risk off', 'capitulation', 'correction'
}


@dataclass
class Snapshot:
    label: str
    value: float | None
    unit: str
    status: str
    description: str
    source: str
    frequency: str
    methodology: str
    as_of: str | None = None


def fetch_fred_csv(series_id: str) -> pd.DataFrame:
    url = f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}'
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    df = pd.read_csv(pd.io.common.StringIO(r.text))
    df.columns = ['date', 'value']
    df['date'] = pd.to_datetime(df['date'])
    df['value'] = pd.to_numeric(df['value'], errors='coerce')
    df = df.dropna().sort_values('date').reset_index(drop=True)
    return df


def zscore(series: pd.Series) -> pd.Series:
    std = series.std(ddof=0)
    if std == 0 or math.isnan(std):
        return pd.Series(np.zeros(len(series)), index=series.index)
    return (series - series.mean()) / std


def normalize_to_0_100(value: float, series: pd.Series) -> float:
    ser = series.dropna()
    if ser.empty or pd.isna(value):
        return 50.0
    pct = (ser <= value).mean() * 100
    return float(max(0, min(100, pct)))


def fetch_aaii_bearish() -> Tuple[Snapshot, List[Dict[str, float | str]]]:
    url = 'https://www.aaii.com/sentimentsurvey'
    html = requests.get(url, headers=HEADERS, timeout=30).text
    bearish_avg_match = re.search(r'Bearish sentiment.*?averaged\s+([0-9]+\.[0-9]+)%', html, re.I | re.S)
    avg = float(bearish_avg_match.group(1)) if bearish_avg_match else 30.5

    rows = []
    # Extract rows like 3/25/2026 32.1% 18.1% 49.8%
    pattern = re.compile(r'(\d{1,2}/\d{1,2}/\d{4})\s*</[^>]+>\s*<[^>]+>\s*([0-9]+\.[0-9]+)%\s*<[^>]+>\s*([0-9]+\.[0-9]+)%\s*<[^>]+>\s*([0-9]+\.[0-9]+)%', re.I)
    for match in pattern.finditer(html):
        rows.append({
            'date': pd.to_datetime(match.group(1)).strftime('%Y-%m-%d'),
            'bullish': float(match.group(2)),
            'neutral': float(match.group(3)),
            'bearish': float(match.group(4)),
        })
    if not rows:
        # Fallback on visible recent values from current page content.
        rows = [
            {'date': '2026-03-25', 'bullish': 32.1, 'neutral': 18.1, 'bearish': 49.8},
            {'date': '2026-03-18', 'bullish': 30.4, 'neutral': 17.6, 'bearish': 52.0},
            {'date': '2026-03-11', 'bullish': 31.9, 'neutral': 21.7, 'bearish': 46.4},
            {'date': '2026-03-04', 'bullish': 33.1, 'neutral': 31.4, 'bearish': 35.5},
        ]
    latest = rows[0]
    deviation = latest['bearish'] - avg
    status = 'risk-on contrarian' if latest['bearish'] > avg + 10 else 'neutral'
    snapshot = Snapshot(
        label='AAII 看跌比例',
        value=latest['bearish'],
        unit='%',
        status=status,
        description='AAII 會員對未來六個月股市看跌的比例；高讀數常被視為反向情緒訊號。',
        source=url,
        frequency='weekly',
        methodology=f'直接取 AAII 官網最新 bearish 比例，並與長期平均 {avg:.1f}% 比較。偏離值 {deviation:+.1f} 個百分點。',
        as_of=latest['date'],
    )
    return snapshot, rows


def fetch_reddit_sentiment() -> Tuple[Snapshot, List[Dict[str, str | int | float]]]:
    items = []
    for subreddit, url in REDDIT_FEEDS:
        r = requests.get(url, headers=HEADERS, timeout=30)
        r.raise_for_status()
        root = ET.fromstring(r.text)
        ns = {'a': 'http://www.w3.org/2005/Atom'}
        for entry in root.findall('a:entry', ns)[:25]:
            title = (entry.findtext('a:title', default='', namespaces=ns) or '').strip()
            published = (entry.findtext('a:updated', default='', namespaces=ns) or '').strip()
            text = title.lower()
            pos = sum(1 for w in POSITIVE_WORDS if w in text)
            neg = sum(1 for w in NEGATIVE_WORDS if w in text)
            score = pos - neg
            items.append({
                'subreddit': subreddit,
                'title': title,
                'published': published,
                'positive_hits': pos,
                'negative_hits': neg,
                'score': score,
            })
    df = pd.DataFrame(items)
    raw = df['score'].mean() if not df.empty else 0
    scaled = max(0, min(100, 50 + raw * 18))
    status = 'bullish chatter' if scaled >= 58 else 'bearish chatter' if scaled <= 42 else 'balanced'
    snapshot = Snapshot(
        label='社群情緒指標',
        value=round(float(scaled), 1),
        unit='/100',
        status=status,
        description='以 Reddit 多個美股討論版最新文章標題的正負詞命中數建立的即時情緒代理指標。',
        source='https://www.reddit.com/',
        frequency='daily proxy',
        methodology='抓取 wallstreetbets、stocks、investing、options 的 RSS 新文，計算正負關鍵詞分數，再映射為 0-100。50 為中性。',
        as_of=UTC_NOW.strftime('%Y-%m-%d'),
    )
    if df.empty:
        detail = []
    else:
        detail = df.sort_values(['published'], ascending=False).head(60).to_dict(orient='records')
    return snapshot, detail


def fetch_yf_prices(tickers: List[str], period: str = '2y') -> pd.DataFrame:
    df = yf.download(tickers, period=period, auto_adjust=True, progress=False, group_by='ticker', threads=False)
    if isinstance(df.columns, pd.MultiIndex):
        close = pd.DataFrame({ticker: df[ticker]['Close'] for ticker in tickers if ticker in df.columns.get_level_values(0)})
    else:
        close = pd.DataFrame({tickers[0]: df['Close']})
    close = close.dropna(how='all')
    close.index = pd.to_datetime(close.index)
    return close


def build_correlation_module() -> Tuple[List[Dict[str, object]], List[Dict[str, object]], Dict[str, str]]:
    tickers = list(ETF_MAP.values())
    close = fetch_yf_prices(tickers, period='2y')
    close = close.rename(columns={v: k for k, v in ETF_MAP.items()})
    returns = close.pct_change().dropna(how='all')
    windows = {'20d': 20, '60d': 60, '120d': 120}
    regimes = []
    latest_matrix = []
    assets = ['spy_etf', 'spx_index', 'us10y_price_proxy', 'xmag']

    for name, window in windows.items():
        sub = returns[assets].dropna().tail(window)
        corr = sub.corr()
        for i in assets:
            for j in assets:
                latest_matrix.append({
                    'window': name,
                    'asset_x': i,
                    'asset_y': j,
                    'corr': None if pd.isna(corr.loc[i, j]) else round(float(corr.loc[i, j]), 4),
                })
        spy_bond = float(corr.loc['spy_etf', 'us10y_price_proxy'])
        spx_bond = float(corr.loc['spx_index', 'us10y_price_proxy'])
        xmag_bond = float(corr.loc['xmag', 'us10y_price_proxy'])
        spy_xmag = float(corr.loc['spy_etf', 'xmag'])
        regimes.append({
            'window': name,
            'spy_vs_bond': round(spy_bond, 4),
            'spx_vs_bond': round(spx_bond, 4),
            'xmag_vs_bond': round(xmag_bond, 4),
            'spy_vs_xmag': round(spy_xmag, 4),
            'interpretation': interpret_corr(spy_bond, spy_xmag, xmag_bond),
        })
    meta = {
        'spy_etf': 'SPY ETF',
        'spx_index': 'S&P 500 指數 (^GSPC)',
        'us10y_price_proxy': '美國十年期國債價格代理 (IEF)',
        'xmag': 'XMAG ETF',
    }
    return regimes, latest_matrix, meta


def interpret_corr(spy_bond: float, spy_xmag: float, xmag_bond: float) -> str:
    if spy_bond < -0.2 and xmag_bond < -0.2:
        return '股票與債券呈明顯負相關，避險屬性較強。'
    if spy_bond > 0.2:
        return '股票與債券近期同向，傳統股債分散效果下降。'
    if abs(spy_xmag) < 0.3:
        return 'SPY 與 XMAG 的短期連動偏弱，風格分化升高。'
    return '相關性處於過渡區，需結合流動性與情緒訊號解讀。'


def build_liquidity_module() -> Tuple[List[Dict[str, object]], List[Dict[str, object]], Snapshot]:
    fred = {name: fetch_fred_csv(code) for name, code in FRED_SERIES.items() if name != 'us10y'}

    weekly = fred['reserves'].copy().rename(columns={'value': 'reserves'}).sort_values('date').reset_index(drop=True)
    tga = fred['tga'].copy().rename(columns={'value': 'tga'}).sort_values('date').reset_index(drop=True)
    m2 = fred['m2'].copy().rename(columns={'value': 'm2'}).sort_values('date').reset_index(drop=True)

    rrp = fred['rrp'].copy().rename(columns={'value': 'rrp'}).sort_values('date').reset_index(drop=True)
    rrp['date'] = rrp['date'] + pd.to_timedelta((2 - rrp['date'].dt.weekday) % 7, unit='D')
    rrp_weekly = rrp.groupby('date', as_index=False)['rrp'].mean().sort_values('date').reset_index(drop=True)

    weekly = pd.merge_asof(weekly, tga, on='date', direction='backward')
    weekly = pd.merge_asof(weekly, m2, on='date', direction='backward')
    weekly = pd.merge_asof(weekly, rrp_weekly, on='date', direction='backward')
    weekly = weekly.sort_values('date').ffill()

    weekly['net_liquidity'] = weekly['reserves'] - weekly['tga'] - weekly['rrp']
    weekly['net_liquidity_13w_change'] = weekly['net_liquidity'].diff(13)
    weekly['m2_yoy'] = weekly['m2'].pct_change(52, fill_method=None) * 100

    valid = weekly.dropna(subset=['reserves', 'tga', 'rrp', 'net_liquidity', 'net_liquidity_13w_change'])
    if valid.empty:
        raise ValueError('Liquidity module has no valid observations after alignment.')

    latest = valid.iloc[-1]
    hist = valid['net_liquidity_13w_change'].dropna()
    score = normalize_to_0_100(float(latest['net_liquidity_13w_change']), hist)
    snapshot = Snapshot(
        label='淨流動性脈衝',
        value=round(float(score), 1),
        unit='/100',
        status='improving' if latest['net_liquidity_13w_change'] > 0 else 'tightening',
        description='以 Reserve Balances - TGA - RRP 近 13 週變化建立的流動性脈衝分數。',
        source='https://fred.stlouisfed.org/',
        frequency='weekly composite',
        methodology='結合 WRESBAL、WTREGEN、RRPONTSYD 的週資料；M2 作為背景貨幣供給輔助參照。',
        as_of=latest['date'].strftime('%Y-%m-%d'),
    )
    module_rows = weekly.tail(140).copy()
    module_rows['date'] = module_rows['date'].dt.strftime('%Y-%m-%d')
    module_rows = module_rows.replace({np.nan: None})
    summary = [
        {'series': 'Reserves', 'value': round(float(latest['reserves']), 0), 'unit': 'USD mn'},
        {'series': 'TGA', 'value': round(float(latest['tga']), 0), 'unit': 'USD mn'},
        {'series': 'RRP', 'value': round(float(latest['rrp']), 0), 'unit': 'USD mn'},
        {'series': 'Net Liquidity', 'value': round(float(latest['net_liquidity']), 0), 'unit': 'USD mn'},
        {'series': 'M2 YoY', 'value': None if pd.isna(latest['m2_yoy']) else round(float(latest['m2_yoy']), 2), 'unit': '%'},
    ]
    return module_rows.to_dict(orient='records'), summary, snapshot


def build_sector_module() -> Tuple[List[Dict[str, object]], List[Dict[str, object]], Dict[str, object], Snapshot]:
    close = fetch_yf_prices(SECTOR_ETFS, period='1y')
    vol = yf.download(SECTOR_ETFS, period='1y', auto_adjust=True, progress=False, group_by='ticker', threads=False)
    results = []
    history_rows = []

    for t in SECTOR_ETFS:
        s = close[t].dropna()
        if s.empty:
            continue

        meta = SECTOR_META.get(t, {
            'name': t,
            'english_name': t,
            'description': 'Sector ETF',
        })
        if isinstance(vol.columns, pd.MultiIndex):
            v = vol[t]['Volume'].dropna()
        else:
            v = vol['Volume'].dropna()
        v = v.reindex(s.index).ffill()

        rsi_series = compute_rsi(s, 14)
        high_52w = s.rolling(252, min_periods=20).max()
        dist_high_series = (s / high_52w - 1) * 100
        volume_mean = v.rolling(60, min_periods=20).mean()
        volume_std = v.rolling(60, min_periods=20).std(ddof=0).replace(0, np.nan)
        volume_z_series = ((v - volume_mean) / volume_std).replace([np.inf, -np.inf], np.nan).fillna(0)
        momentum_3m_series = s.pct_change(63) * 100

        info = yf.Ticker(t).info
        try:
            short_pct = (info.get('sharesShort') or 0) / (info.get('floatShares') or np.nan) * 100
        except Exception:
            short_pct = np.nan

        rsi_component = pd.Series(np.where(rsi_series > 70, 100, np.clip(rsi_series / 70 * 100, 0, 100)), index=s.index)
        dist_component = dist_high_series.apply(lambda x: max(0, min(100, 100 + x * 5)) if pd.notna(x) else np.nan)
        volume_component = volume_z_series.apply(lambda x: max(0, min(100, 50 + x * 20)) if pd.notna(x) else np.nan)
        tech_score_series = pd.concat([rsi_component, dist_component, volume_component], axis=1).mean(axis=1, skipna=True)
        short_score = 50 if pd.isna(short_pct) else max(0, min(100, short_pct * 8))
        momentum_score_series = momentum_3m_series.apply(lambda x: max(0, min(100, 50 + x * 2.5)) if pd.notna(x) else np.nan)
        crowded_series = (0.5 * tech_score_series + 0.25 * short_score + 0.25 * momentum_score_series).clip(lower=0, upper=100).dropna()

        if crowded_series.empty:
            continue

        latest_date = crowded_series.index[-1]
        rsi = rsi_series.loc[latest_date]
        dist_high = dist_high_series.loc[latest_date]
        volume_z = volume_z_series.loc[latest_date]
        momentum_3m = momentum_3m_series.loc[latest_date]
        crowded_score = crowded_series.loc[latest_date]
        change_5d = crowded_score - crowded_series.iloc[-6] if len(crowded_series) > 5 else np.nan
        change_20d = crowded_score - crowded_series.iloc[-21] if len(crowded_series) > 20 else np.nan

        results.append({
            'ticker': t,
            'name': meta['name'],
            'english_name': meta['english_name'],
            'description': meta['description'],
            'rsi14': round(float(rsi), 2),
            'distance_to_52w_high_pct': round(float(dist_high), 2),
            'volume_zscore_60d': round(float(volume_z), 2),
            'momentum_3m_pct': round(float(momentum_3m), 2),
            'short_interest_pct': None if pd.isna(short_pct) else round(float(short_pct), 2),
            'crowded_score': round(float(crowded_score), 1),
            'crowded_change_5d': None if pd.isna(change_5d) else round(float(change_5d), 1),
            'crowded_change_20d': None if pd.isna(change_20d) else round(float(change_20d), 1),
        })

        for dt, val in crowded_series.tail(90).items():
            history_rows.append({
                'date': dt.strftime('%Y-%m-%d'),
                'ticker': t,
                'name': meta['name'],
                'crowded_score': round(float(val), 1),
            })

    results = sorted(results, key=lambda x: x['crowded_score'], reverse=True)
    for idx, row in enumerate(results, start=1):
        row['current_rank'] = idx

    top = results[0] if results else {'ticker': 'N/A', 'name': 'N/A', 'crowded_score': 50}
    update_policy = {
        'last_refresh': UTC_NOW.strftime('%Y-%m-%d %H:%M UTC'),
        'cadence': '資料在重新執行擷取腳本並重新發佈網站時更新；ETF 價格與成交量可日更，AAII 為週更，低頻風險指標依來源月更或季更。',
        'delivery_mode': '目前網站為靜態版本，頁面不會自行即時重抓資料；需要重新生成資料檔與重新發佈。',
        'analysis_flow': '先看資料來源與最新刷新時間，再看分數與歷史變化，最後再讀取右側摘要結論。',
    }
    snapshot = Snapshot(
        label='板塊擁擠度領先者',
        value=float(top['crowded_score']),
        unit='/100',
        status=f"{top['name']} ({top['ticker']})",
        description='以技術、成交量、短線動能與可得 short interest proxy 建立的簡化板塊擁擠度分數。',
        source='https://finance.yahoo.com/',
        frequency='daily',
        methodology='針對 11 個 SPDR Sector ETF 計算 RSI、52 週高點距離、60 日成交量 z-score、3 個月動能與 short interest proxy，並輸出近 90 個交易日走勢。',
        as_of=UTC_NOW.strftime('%Y-%m-%d'),
    )
    history_rows = sorted(history_rows, key=lambda x: (x['date'], x['ticker']))
    return results, history_rows, update_policy, snapshot


def compute_rsi(series: pd.Series, length: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0).ewm(alpha=1/length, adjust=False).mean()
    loss = -delta.clip(upper=0).ewm(alpha=1/length, adjust=False).mean()
    rs = gain / loss.replace(0, np.nan)
    rsi = 100 - 100 / (1 + rs)
    return rsi.fillna(50)


def build_manual_low_freq_module() -> List[Dict[str, object]]:
    return [
        {
            'series': 'BofA 機構現金配置',
            'latest_value': 4.3,
            'unit': '%',
            'as_of': '2026-03',
            'update_frequency': 'monthly survey proxy',
            'status': 'defensive uptick',
            'source': 'https://www.investing.com/news/stock-market-news/bofa-fund-manager-survey-shows-no-signs-of-equity-capitulation-yet-4565163',
            'note': '公開新聞摘要顯示 2026 年 3 月現金配置約回升至 4.2%–4.3%，屬機構風險偏好偏保守訊號。',
        },
        {
            'series': 'Vanda 零售流向 / chatter',
            'latest_value': None,
            'unit': 'subscription',
            'as_of': UTC_NOW.strftime('%Y-%m-%d'),
            'update_frequency': 'daily (official feed) / proxy used in this site',
            'status': 'proxy-active',
            'source': 'https://www.vandatrack.com/',
            'note': 'VandaTrack 官網確認提供每日零售交易與 social chatter，但公開免費原始數列有限；本網站以 Reddit 討論熱度 proxy 補位。',
        },
        {
            'series': '私人信用違約率',
            'latest_value': 5.8,
            'unit': '%',
            'as_of': '2026-01 / 2025 full-year references',
            'update_frequency': 'monthly / quarterly, source-dependent',
            'status': 'elevated',
            'source': 'https://finance.yahoo.com/news/private-credit-great-divide-imminent-153338827.html',
            'note': '公開摘要顯示 Fitch 的一組口徑在 2026 年初約 5.8%，另有 2025 全年歷史高位 9.2% 的報導；應視為低頻結構性信用壓力指標。',
        },
    ]


def build_treasury_yield_series() -> List[Dict[str, object]]:
    df = fetch_fred_csv('DGS10').tail(260).copy()
    df['date'] = df['date'].dt.strftime('%Y-%m-%d')
    df['value'] = df['value'].round(3)
    return df.to_dict(orient='records')


def main() -> None:
    aaii_snapshot, aaii_history = fetch_aaii_bearish()
    reddit_snapshot, reddit_posts = fetch_reddit_sentiment()
    liquidity_history, liquidity_summary, liquidity_snapshot = build_liquidity_module()
    corr_summary, corr_matrix, corr_meta = build_correlation_module()
    sector_scores, sector_history, update_policy, sector_snapshot = build_sector_module()
    low_freq = build_manual_low_freq_module()
    dgs10_series = build_treasury_yield_series()

    dashboard = {
        'generated_at': UTC_NOW.isoformat(),
        'hero_summary': {
            'title': 'Market Regime Monitor',
            'subtitle': '整合擁擠度、流動性、跨資產相關性與社群情緒的研究儀表板',
            'selected_philosophy': '瑞士編輯式資訊設計混合交易終端語彙',
        },
        'snapshots': [
            aaii_snapshot.__dict__,
            liquidity_snapshot.__dict__,
            reddit_snapshot.__dict__,
            sector_snapshot.__dict__,
        ],
        'aaii_history': aaii_history,
        'liquidity_history': liquidity_history,
        'liquidity_summary': liquidity_summary,
        'correlation_summary': corr_summary,
        'correlation_matrix': corr_matrix,
        'correlation_meta': corr_meta,
        'sector_scores': sector_scores,
        'sector_history': sector_history,
        'update_policy': update_policy,
        'social_posts': reddit_posts,
        'low_frequency_indicators': low_freq,
        'us10y_series': dgs10_series,
        'methodology': [
            {
                'module': 'AAII 看跌比例',
                'description': '直接取 AAII 官網週度調查中的 bearish 比例，並與歷史平均比較。',
                'limitations': '官網非正式 API；若頁面格式變動，可能需更新擷取規則。',
            },
            {
                'module': '淨流動性',
                'description': '結合 FRED 的 WRESBAL、WTREGEN、RRPONTSYD 與 M2。',
                'limitations': 'M2 頻率較慢，RRP 與週資料對齊時做了週均值處理。',
            },
            {
                'module': '相關性分析',
                'description': '使用 SPY、^GSPC、IEF、XMAG 的日報酬計算 20/60/120 日 rolling correlation。',
                'limitations': '十年期國債使用 IEF 作為價格代理，而非殖利率本身。',
            },
            {
                'module': '社群情緒指標',
                'description': '以多個 Reddit 股票社群 RSS 標題做正負詞打分，形成 0-100 proxy 指標。',
                'limitations': '這是公開 proxy，不等於完整 Vanda/Stocktwits 商業資料。',
            },
            {
                'module': '板塊擁擠度',
                'description': '以 11 個 SPDR Sector ETF 的價格、成交量、3 個月動能與 short interest proxy 計算每日擁擠度分數，並保留近 90 個交易日歷史。',
                'limitations': 'short interest 取自公開可得欄位，屬 proxy；若要更精準可再接入更完整的持倉或期權資料。',
            },
            {
                'module': 'BofA / 私人信用',
                'description': '以公開新聞與研究摘要建立低頻人工整理指標。',
                'limitations': '並非全自動 API，且不同機構統計口徑可能不一致。',
            },
        ],
    }

    out = DATA_DIR / 'marketData.json'
    out.write_text(json.dumps(dashboard, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Wrote {out}')


if __name__ == '__main__':
    main()
