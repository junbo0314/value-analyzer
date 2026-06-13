#!/usr/bin/env python3
"""
backtest.py — Value Analyzer v5.0 Backtesting  (SEC EDGAR edition)

Financial fundamentals : SEC EDGAR XBRL Company Facts API  (free, ~2009–present)
Stock price history    : yfinance  (still needed for prices)
10Y Treasury yield     : yfinance ^TNX

Cache layout (delete individual files to force re-fetch):
    cache/sp500_list.pkl          Wikipedia SP500 list
    cache/cik_map.pkl             SEC ticker→CIK map
    cache/10y_yield.pkl           ^TNX price history
    cache/edgar_{CIK}.pkl         per-company EDGAR company-facts JSON
    cache/price_{TICKER}.pkl      per-ticker yfinance price history
    cache/all_rows_edgar.pkl      merged rows — DELETE THIS to redo analysis

Outputs:
    backtest_data.csv   cleaned, graded dataset
    results.txt         optimisation results vs current GRADE_CONFIGS

Runtime:
    First run  : ~20–40 min  (400 EDGAR fetches + 400 yfinance price fetches)
    Re-run     : ~3–5 min    (all cache hits)
"""

import io
import sys
import time
import pickle
import logging
import warnings
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import requests
from scipy import stats
from scipy.stats.mstats import winsorize

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Paths & constants
# ─────────────────────────────────────────────────────────────────────────────
CACHE_DIR   = Path("cache")
CACHE_DIR.mkdir(exist_ok=True)
DATA_CSV    = Path("backtest_data.csv")
RESULTS_TXT = Path("results.txt")

TARGET_N    = 400
RANDOM_SEED = 42

EDGAR_UA = "ValueAnalyzer backtest junbo0314@g.skku.edu"   # SEC fair-access policy
EDGAR_DELAY = 0.15          # seconds between EDGAR requests
HTTP_TIMEOUT = 45

CURRENT_PARAMS: Dict[int, Dict] = {
    1: {"basePER": 18.0, "gMult": 3.0},
    2: {"basePER": 12.0, "gMult": 2.0},
    3: {"basePER":  8.5, "gMult": 1.5},
    4: {"basePER":  5.0, "gMult": 1.0},
}

GRID: Dict[int, Dict] = {
    1: {"basePER": np.arange(10.0, 20.5, 0.5),  "gMult": np.arange(1.50, 3.25, 0.25)},
    2: {"basePER": np.arange( 7.0, 14.5, 0.5),  "gMult": np.arange(1.00, 2.75, 0.25)},
    3: {"basePER": np.arange( 5.0, 10.5, 0.5),  "gMult": np.arange(0.50, 2.25, 0.25)},
    4: {"basePER": np.arange( 3.0,  7.5, 0.5),  "gMult": np.arange(0.50, 1.75, 0.25)},
}

CRISIS_WINDOWS = [
    (pd.Timestamp("2008-09-01"), pd.Timestamp("2009-03-31")),
    (pd.Timestamp("2020-02-01"), pd.Timestamp("2020-04-30")),
    (pd.Timestamp("2025-01-01"), pd.Timestamp("2025-07-31")),
]

# ─────────────────────────────────────────────────────────────────────────────
# XBRL tag candidates  (tried in order; first with data wins)
# ─────────────────────────────────────────────────────────────────────────────
REVENUE_TAGS = [
    "Revenues",
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "RevenueFromContractWithCustomerIncludingAssessedTax",
    "SalesRevenueNet",
    "SalesRevenueGoodsNet",
    "RegulatedAndUnregulatedOperatingRevenue",
]
GROSS_PROFIT_TAGS  = ["GrossProfit"]
OP_INCOME_TAGS     = ["OperatingIncomeLoss"]
NET_INCOME_TAGS    = [
    "NetIncomeLoss",
    "NetIncomeLossAvailableToCommonStockholdersBasic",
    "ProfitLoss",
]
EPS_TAGS = ["EarningsPerShareDiluted", "EarningsPerShareBasic"]
SHARES_TAGS = [
    "CommonStockSharesOutstanding",
    "WeightedAverageNumberOfDilutedSharesOutstanding",
    "WeightedAverageNumberOfSharesOutstandingBasic",
]
CASH_TAGS = [
    "CashAndCashEquivalentsAtCarryingValue",
    "CashCashEquivalentsAndShortTermInvestments",
]
DEBT_TAGS = [
    "LongTermDebt",
    "LongTermDebtNoncurrent",
    "LongTermDebtAndCapitalLeaseObligations",
    "DebtAndCapitalLeaseObligations",
]
EQUITY_TAGS = [
    "StockholdersEquity",
    "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
]
ASSETS_TAGS = ["Assets"]


# ═════════════════════════════════════════════════════════════════════════════
# STEP 1 — Data Collection
# ═════════════════════════════════════════════════════════════════════════════

# ── S&P 500 list ──────────────────────────────────────────────────────────────
def fetch_sp500_list() -> pd.DataFrame:
    cache = CACHE_DIR / "sp500_list.pkl"
    if cache.exists():
        log.info("S&P 500 list: cache hit")
        return pickle.loads(cache.read_bytes())
    log.info("S&P 500 list: downloading from Wikipedia…")
    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                              "AppleWebKit/537.36 Chrome/120.0 Safari/537.36"}
    resp = requests.get(
        "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies",
        headers=headers, timeout=30,
    )
    resp.raise_for_status()
    df = pd.read_html(resp.text, header=0)[0][["Symbol", "Security", "GICS Sector"]].copy()
    df.columns = ["ticker", "name", "sector"]
    df["ticker"] = df["ticker"].str.replace(".", "-", regex=False)
    cache.write_bytes(pickle.dumps(df))
    log.info(f"  {len(df)} companies  |  {df['sector'].nunique()} GICS sectors")
    return df


def sample_tickers(sp500: pd.DataFrame, n: int = TARGET_N) -> pd.DataFrame:
    rng = np.random.default_rng(RANDOM_SEED)
    per_sec = max(3, n // sp500["sector"].nunique())
    sampled = []
    for sec in sp500["sector"].unique():
        grp = sp500[sp500["sector"] == sec]
        k   = min(per_sec, len(grp))
        sampled.append(grp.iloc[rng.choice(len(grp), k, replace=False)])
    result = pd.concat(sampled, ignore_index=True)
    log.info(f"Sampled {len(result)} tickers across {result['sector'].nunique()} sectors:")
    for sec, g in sorted(result.groupby("sector")):
        log.info(f"    {sec:<42}  {len(g):3d}")
    return result


# ── 10Y Treasury yield (yfinance ^TNX) ───────────────────────────────────────
def fetch_10y_yield() -> pd.Series:
    cache  = CACHE_DIR / "10y_yield.pkl"
    legacy = CACHE_DIR / "fred_10y.pkl"
    if cache.exists():
        log.info("10Y yield: cache hit")
        return pickle.loads(cache.read_bytes())
    if legacy.exists():
        log.info("10Y yield: loading from legacy fred_10y.pkl cache")
        s = pickle.loads(legacy.read_bytes())
        # Normalise to tz-naive DatetimeIndex pd.Series if needed
        if hasattr(s, "index") and hasattr(s.index, "tz") and s.index.tz:
            s = s.copy(); s.index = s.index.tz_localize(None)
        cache.write_bytes(pickle.dumps(s))
        return s
    import yfinance as yf
    log.info("10Y yield: downloading ^TNX…")
    hist = yf.Ticker("^TNX").history(period="max", auto_adjust=True)
    if hist is None or hist.empty:
        raise RuntimeError("Cannot download ^TNX from yfinance")
    idx = hist.index.tz_localize(None) if hist.index.tz else hist.index
    s   = hist["Close"].copy()
    s.index = idx
    cache.write_bytes(pickle.dumps(s))
    log.info(f"  {len(s)} daily observations  {s.index[0].year}–{s.index[-1].year}")
    return s


def yearly_10y(fred: pd.Series, year: int) -> Optional[float]:
    sub = fred[fred.index.year == year]
    return float(sub.mean()) if len(sub) > 5 else None


# ── SEC EDGAR: ticker → CIK map ──────────────────────────────────────────────
def fetch_cik_map() -> Dict[str, str]:
    """Returns dict {ticker_upper: zero_padded_10digit_cik}."""
    cache = CACHE_DIR / "cik_map.pkl"
    if cache.exists():
        log.info("CIK map: cache hit")
        return pickle.loads(cache.read_bytes())
    log.info("CIK map: downloading from SEC…")
    resp = requests.get(
        "https://www.sec.gov/files/company_tickers.json",
        headers={"User-Agent": EDGAR_UA}, timeout=HTTP_TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    # Format: {idx: {cik_str, title, ticker}}
    cik_map = {
        v["ticker"].upper(): str(v["cik_str"]).zfill(10)
        for v in data.values()
    }
    cache.write_bytes(pickle.dumps(cik_map))
    log.info(f"  {len(cik_map)} ticker→CIK mappings")
    return cik_map


# ── SEC EDGAR: per-company facts ─────────────────────────────────────────────
def fetch_edgar_facts(cik: str) -> Optional[dict]:
    """Download and cache EDGAR company-facts JSON for one CIK."""
    cache = CACHE_DIR / f"edgar_{cik}.pkl"
    if cache.exists():
        return pickle.loads(cache.read_bytes())
    url  = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
    for attempt in range(1, 4):
        try:
            resp = requests.get(
                url, headers={"User-Agent": EDGAR_UA}, timeout=HTTP_TIMEOUT,
            )
            if resp.status_code == 404:
                cache.write_bytes(pickle.dumps(None))
                return None
            resp.raise_for_status()
            data = resp.json()
            cache.write_bytes(pickle.dumps(data))
            time.sleep(EDGAR_DELAY)
            return data
        except Exception as e:
            log.debug(f"  EDGAR {cik} attempt {attempt}/3: {e}")
            if attempt == 3:
                cache.write_bytes(pickle.dumps(None))
                return None
            time.sleep(EDGAR_DELAY * 3)
    return None


# ── XBRL: extract annual series from company-facts ───────────────────────────
def get_annual_series(
    taxonomy: dict,
    tag_candidates: List[str],
    forms: Tuple[str, ...] = ("10-K", "20-F"),
) -> Dict[int, Tuple[float, str]]:
    """
    Try each XBRL tag in order; return {fiscal_year: (value, end_date_str)}
    for the first tag that has annual (fp='FY') data.
    For period items, only keeps ~12-month windows (300–400 days).
    """
    for tag in tag_candidates:
        if tag not in taxonomy:
            continue
        collected: Dict[int, dict] = {}
        for unit_items in taxonomy[tag].get("units", {}).values():
            for item in unit_items:
                if item.get("form") not in forms:
                    continue
                if item.get("fp") != "FY":
                    continue
                # Reject sub-annual periods (sometimes a 10-K restates a quarter)
                if "start" in item:
                    try:
                        days = (pd.Timestamp(item["end"])
                                - pd.Timestamp(item["start"])).days
                        if not (300 <= days <= 400):
                            continue
                    except Exception:
                        pass
                fy = item.get("fy")
                if not fy:
                    end = item.get("end", "")
                    fy  = int(end[:4]) if len(end) >= 4 else None
                if fy:
                    prev = collected.get(fy)
                    if not prev or item.get("filed", "") > prev.get("filed", ""):
                        collected[fy] = item
        if collected:
            return {
                fy: (item["val"], item.get("end", f"{fy}-12-31"))
                for fy, item in collected.items()
            }
    return {}


# ── yfinance: per-ticker price history ───────────────────────────────────────
def _normalise_price_df(data) -> Optional[pd.DataFrame]:
    """Convert any cached price object (DataFrame or dict) to a clean DataFrame."""
    if data is None:
        return None
    if isinstance(data, pd.DataFrame):
        if data.empty:
            return None
        if data.index.tz:
            data = data.copy(); data.index = data.index.tz_localize(None)
        return data
    if isinstance(data, dict):
        try:
            df = pd.DataFrame(data)
            if df.empty or "Close" not in df.columns:
                return None
            if df.index.tz:
                df = df.copy(); df.index = df.index.tz_localize(None)
            return df
        except Exception:
            return None
    return None


def fetch_price_history(ticker: str) -> Optional[pd.DataFrame]:
    # Try legacy "raw_" prefix first (from yfinance-based run), then "price_"
    legacy = CACHE_DIR / f"raw_{ticker.replace('/', '_')}.pkl"
    cache  = CACHE_DIR / f"price_{ticker.replace('/', '_')}.pkl"
    if legacy.exists():
        df = _normalise_price_df(pickle.loads(legacy.read_bytes()))
        if df is not None:
            return df
    if cache.exists():
        df = _normalise_price_df(pickle.loads(cache.read_bytes()))
        if df is not None:
            return df
    try:
        import yfinance as yf
        hist = yf.Ticker(ticker).history(period="max", auto_adjust=True)
        if hist is None or hist.empty:
            cache.write_bytes(pickle.dumps(None))
            return None
        # Normalise index to tz-naive
        if hist.index.tz:
            hist.index = hist.index.tz_localize(None)
        cache.write_bytes(pickle.dumps(hist))
        return hist
    except Exception as e:
        log.debug(f"price {ticker}: {e}")
        cache.write_bytes(pickle.dumps(None))
        return None


def price_at(hist: pd.DataFrame, target: pd.Timestamp, window: int = 15) -> Optional[float]:
    if hist is None or hist.empty or "Close" not in hist.columns:
        return None
    target = target.tz_localize(None) if target.tzinfo else target
    idx    = hist.index.tz_localize(None) if hist.index.tz else hist.index
    lo, hi = target - pd.Timedelta(days=window), target + pd.Timedelta(days=window)
    mask   = (idx >= lo) & (idx <= hi)
    sub    = hist["Close"].values[mask]
    if len(sub) == 0:
        return None
    nearest = int(np.argmin(np.abs((idx[mask] - target).days)))
    v = sub[nearest]
    return float(v) if not np.isnan(v) else None


# ── Per-ticker EDGAR processing ───────────────────────────────────────────────
def process_ticker_edgar(
    ticker:   str,
    sector:   str,
    cik:      str,
    price_hist: Optional[pd.DataFrame],
    ten_y:    pd.Series,
) -> List[dict]:
    """Build annual rows from EDGAR facts + yfinance price history."""
    facts = fetch_edgar_facts(cik)
    if not facts:
        return []

    gaap = facts.get("facts", {}).get("us-gaap", {})
    dei  = facts.get("facts", {}).get("dei",     {})
    if not gaap:
        return []

    # ── Extract annual series ─────────────────────────────────────────────────
    eps_s    = get_annual_series(gaap, EPS_TAGS)
    ni_s     = get_annual_series(gaap, NET_INCOME_TAGS)
    rev_s    = get_annual_series(gaap, REVENUE_TAGS)
    gp_s     = get_annual_series(gaap, GROSS_PROFIT_TAGS)
    op_s     = get_annual_series(gaap, OP_INCOME_TAGS)
    cash_s   = get_annual_series(gaap, CASH_TAGS)
    debt_s   = get_annual_series(gaap, DEBT_TAGS)
    eq_s     = get_annual_series(gaap, EQUITY_TAGS)
    assets_s = get_annual_series(gaap, ASSETS_TAGS)
    # Shares: try us-gaap first, then dei
    shares_s = get_annual_series(gaap, SHARES_TAGS)
    if not shares_s:
        shares_s = get_annual_series(dei, ["EntityCommonStockSharesOutstanding"])

    # Need at least EPS or net income
    anchor_years = sorted(set(eps_s) | set(ni_s))
    if not anchor_years:
        return []

    rows: List[dict] = []
    prev_rev: Optional[float] = None

    for fy in sorted(anchor_years):
        eps_val,  fy_end  = eps_s.get(fy,    (None, None))
        ni_val,   ni_end  = ni_s.get(fy,     (None, None))
        rev_val,  _       = rev_s.get(fy,    (None, None))
        gp_val,   _       = gp_s.get(fy,     (None, None))
        op_val,   _       = op_s.get(fy,     (None, None))
        cash_val, _       = cash_s.get(fy,   (None, None))
        debt_val, _       = debt_s.get(fy,   (None, None))
        eq_val,   _       = eq_s.get(fy,     (None, None))
        assets_val, _     = assets_s.get(fy, (None, None))
        sh_val,   _       = shares_s.get(fy, (None, None))

        # ── Fiscal year end date ──────────────────────────────────────────────
        fy_end_str = fy_end or ni_end or f"{fy}-12-31"
        try:
            fy_date = pd.Timestamp(fy_end_str)
        except Exception:
            fy_date = pd.Timestamp(f"{fy}-12-31")

        # ── EPS ───────────────────────────────────────────────────────────────
        eps: Optional[float] = None
        if eps_val is not None:
            eps = float(eps_val)
        elif ni_val is not None and sh_val and sh_val > 0:
            eps = ni_val / sh_val

        if eps is None or eps <= 0:
            prev_rev = rev_val
            continue

        # ── ROE ───────────────────────────────────────────────────────────────
        roe = 0.0
        if ni_val is not None and eq_val is not None and eq_val > 0:
            roe = float(ni_val / eq_val)

        # ── Revenue growth ────────────────────────────────────────────────────
        rev_growth: Optional[float] = None
        if rev_val is not None and prev_rev is not None and abs(prev_rev) > 0:
            rev_growth = (rev_val - prev_rev) / abs(prev_rev)
        prev_rev = rev_val

        # ── Margins ───────────────────────────────────────────────────────────
        gm = float(gp_val / rev_val)  if (gp_val  and rev_val and rev_val > 0) else 0.0
        om = float(op_val / rev_val)  if (op_val  and rev_val and rev_val > 0) else 0.0

        # ── Debt ratio ────────────────────────────────────────────────────────
        total_debt = float(debt_val) if debt_val is not None else 0.0
        if total_debt > 0 and assets_val and assets_val > 0:
            debt_ratio = float(np.clip(total_debt / assets_val, 0, 1))
        elif total_debt > 0 and eq_val and eq_val > 0:
            de = total_debt / eq_val
            debt_ratio = de / (1 + de) if de >= 0 else 0.0
        else:
            debt_ratio = 0.0

        # ── Shares & net cash per share ───────────────────────────────────────
        shares = float(sh_val) if sh_val and sh_val > 0 else None
        if shares is None and ni_val and eps and abs(eps) > 1e-4:
            shares = abs(ni_val / eps)
        shares = shares or 1.0

        cash = float(cash_val) if cash_val is not None else 0.0
        net_cash_ps = (cash - total_debt) / max(shares, 1)

        # ── AAA yield ─────────────────────────────────────────────────────────
        ten_y_val = yearly_10y(ten_y, fy)
        if ten_y_val is None or ten_y_val < 0.1:
            continue
        aaa_yield = ten_y_val + 0.5

        # ── Prices ────────────────────────────────────────────────────────────
        p0  = price_at(price_hist, fy_date)
        if p0 is None or p0 <= 0:
            continue
        p1y = price_at(price_hist, fy_date + pd.DateOffset(years=1))
        p2y = price_at(price_hist, fy_date + pd.DateOffset(years=2))

        rows.append({
            "ticker":             ticker,
            "sector":             sector,
            "year":               fy,
            "fy_date":            fy_date,
            "eps":                eps,
            "roe":                roe,
            "revenue_growth":     rev_growth,
            "gross_margin":       gm,
            "operating_margin":   om,
            "debt_ratio":         debt_ratio,
            "net_cash_per_share": net_cash_ps,
            "market_cap":         p0 * max(shares, 1),
            "price":              p0,
            "price_fwd1y":        p1y,
            "price_fwd2y":        p2y,
            "aaa_yield":          aaa_yield,
        })

    return rows


# ── Main collection loop ──────────────────────────────────────────────────────
def collect_data(sampled: pd.DataFrame, cik_map: Dict[str, str],
                 ten_y: pd.Series) -> pd.DataFrame:
    cache = CACHE_DIR / "all_rows_edgar.pkl"
    if cache.exists():
        log.info("All rows: loading from cache  "
                 "(delete cache/all_rows_edgar.pkl to re-fetch)")
        df = pickle.loads(cache.read_bytes())
        log.info(f"  {len(df)} rows  |  {df['ticker'].nunique()} tickers  "
                 f"|  years {df['year'].min()}–{df['year'].max()}")
        return df

    all_rows: List[dict] = []
    skipped:  List[str]  = []
    total = len(sampled)
    t0    = time.time()

    for i, (_, row) in enumerate(sampled.iterrows(), 1):
        ticker = row["ticker"]
        sector = row["sector"]
        cik    = cik_map.get(ticker.upper())

        if cik is None:
            skipped.append(f"{ticker}(no CIK)")
        else:
            price_hist = fetch_price_history(ticker)
            rows = process_ticker_edgar(ticker, sector, cik, price_hist, ten_y)
            if rows:
                all_rows.extend(rows)
            else:
                skipped.append(f"{ticker}(no data)")

        if i % 20 == 0 or i == total:
            elapsed = time.time() - t0
            eta_min = elapsed / i * (total - i) / 60
            log.info(
                f"  [{i:3d}/{total}]  {100*i/total:5.1f}%  "
                f"rows={len(all_rows):5d}  skipped={len(skipped):3d}  "
                f"ETA {eta_min:.1f} min"
            )

    log.info(f"\nDone.  Processed: {total-len(skipped)}  |  Skipped: {len(skipped)}")
    if skipped:
        log.info("Skipped: " + ", ".join(skipped[:60])
                 + ("…" if len(skipped) > 60 else ""))

    if not all_rows:
        sys.exit("ERROR: no rows collected — check network / EDGAR access.")

    df = pd.DataFrame(all_rows)
    cache.write_bytes(pickle.dumps(df))
    log.info(f"Raw data cached → {cache}")
    return df


# ═════════════════════════════════════════════════════════════════════════════
# STEP 2 — Preprocessing
# ═════════════════════════════════════════════════════════════════════════════

def crosses_crisis(year: int) -> bool:
    check = [
        pd.Timestamp(f"{year}-12-31"),
        pd.Timestamp(f"{year+1}-12-31"),
        pd.Timestamp(f"{year+2}-12-31"),
    ]
    return any(lo <= d <= hi for d in check for lo, hi in CRISIS_WINDOWS)


def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    log.info("─── Step 2: Preprocessing ───────────────────────────────────────")
    n0 = len(df)

    df = df.dropna(subset=["eps", "price", "revenue_growth", "aaa_yield"]).copy()
    log.info(f"  Drop NA core fields:      {n0:6d} → {len(df):6d}")

    df = df[df["eps"] > 0]
    log.info(f"  EPS > 0:                  → {len(df):6d}")

    mask = df["year"].apply(crosses_crisis)
    df   = df[~mask]
    log.info(f"  Remove crisis years:      → {len(df):6d}  (removed {mask.sum()})")

    df = df.dropna(subset=["price_fwd1y", "price_fwd2y"])
    log.info(f"  Forward prices available: → {len(df):6d}")

    df["ret1y"] = df["price_fwd1y"] / df["price"] - 1
    df["ret2y"] = df["price_fwd2y"] / df["price"] - 1

    for col in ("ret1y", "ret2y"):
        arr = winsorize(df[col].values.astype(float), limits=[0.01, 0.01])
        df[col] = np.array(arr)
    log.info("  Returns winsorized at 1%/99%")

    df["revenue_growth"] = df["revenue_growth"].clip(-1.0, 1.0)

    years = sorted(df["year"].unique())
    log.info(f"\n  Final: {len(df)} rows  |  {df['ticker'].nunique()} tickers  "
             f"|  years {years[0]}–{years[-1]}")
    return df.reset_index(drop=True)


# ═════════════════════════════════════════════════════════════════════════════
# STEP 3 — Moat Score / Grade
# ═════════════════════════════════════════════════════════════════════════════

def assign_grades(df: pd.DataFrame) -> pd.DataFrame:
    log.info("─── Step 3: Moat Score / Grade Assignment ───────────────────────")
    df = df.copy()

    z_targets = {"gross_margin": "z_gm", "operating_margin": "z_om"}
    if "market_cap" in df.columns and (df["market_cap"] > 0).any():
        df["log_mcap"] = np.where(df["market_cap"] > 0, np.log(df["market_cap"]), np.nan)
        z_targets["log_mcap"] = "z_lmc"

    for raw, z in z_targets.items():
        df[z] = df.groupby(["year", "sector"])[raw].transform(
            lambda x: (x - x.mean()) / x.std()
            if x.std() > 1e-8 else pd.Series(0.0, index=x.index)
        )

    df["moat_score"] = df[list(z_targets.values())].mean(axis=1)
    df["grade"] = pd.qcut(
        df["moat_score"], q=4, labels=[4, 3, 2, 1], duplicates="drop"
    ).astype(int)

    gc = df["grade"].value_counts().sort_index()
    log.info(f"  Grade distribution: {gc.to_dict()}")
    log.info(f"  Moat score: [{df['moat_score'].min():.3f}, {df['moat_score'].max():.3f}]")
    return df


# ═════════════════════════════════════════════════════════════════════════════
# STEP 4 — IV Formula  (mirrors calculations.ts + ROE_Factor)
# ═════════════════════════════════════════════════════════════════════════════

def get_default_cp(gm: float) -> float:
    if gm > 0.60: return 1.20
    if gm > 0.40: return 1.10
    if gm > 0.25: return 1.00
    if gm > 0.10: return 0.90
    return 0.80

def get_roe_factor(roe: float) -> float:
    if roe >= 0.20: return 1.10
    if roe >= 0.15: return 1.05
    if roe >= 0.10: return 1.00
    if roe >= 0.05: return 0.95
    return 0.90

def get_default_df(dr: float) -> float:
    if dr < 0.20: return 1.00
    if dr < 0.40: return 0.95
    if dr < 0.60: return 0.90
    if dr < 0.80: return 0.80
    return 0.70


def compute_iv_series(df: pd.DataFrame, params: Dict[int, Dict]) -> pd.Series:
    """
    IV = (EPS × adjPER × CP × ROE_Factor × 4.0 / Y) × DF + Net_Cash_Per_Share
    """
    cp  = np.array([get_default_cp(v)  for v in df["gross_margin"]])
    rf  = np.array([get_roe_factor(v)  for v in df["roe"]])
    dff = np.array([get_default_df(v)  for v in df["debt_ratio"]])
    g   = (df["revenue_growth"].values * 100).clip(-10, 40)
    y   = np.maximum(df["aaa_yield"].values, 0.5)

    bp  = np.array([params[int(gr)]["basePER"] for gr in df["grade"]])
    gm  = np.array([params[int(gr)]["gMult"]   for gr in df["grade"]])
    adj = np.maximum(bp + gm * g, 1.0)

    iv = (df["eps"].values * adj * cp * rf * 4.0 / y) * dff \
         + df["net_cash_per_share"].values
    return pd.Series(iv, index=df.index)


# ═════════════════════════════════════════════════════════════════════════════
# STEP 5 — Grid Search
# ═════════════════════════════════════════════════════════════════════════════

def spearman_and_quintiles(
    ivp: np.ndarray, ret: np.ndarray
) -> Tuple[float, float, pd.Series]:
    mask = np.isfinite(ivp) & np.isfinite(ret)
    x, y = ivp[mask], ret[mask]
    if len(x) < 10:
        return np.nan, np.nan, pd.Series(dtype=float)
    r, _ = stats.spearmanr(x, y)
    try:
        ql     = pd.qcut(x, 5, labels=False, duplicates="drop")
        q_mean = pd.Series(y).groupby(ql).mean()
        spread = float(q_mean.iloc[-1] - q_mean.iloc[0]) if len(q_mean) >= 2 else np.nan
    except Exception:
        q_mean, spread = pd.Series(dtype=float), np.nan
    return float(r), spread, q_mean


def optimize_grade(
    grade: int, train: pd.DataFrame,
    fixed: Dict[int, Dict], metric: str = "ret1y",
) -> Tuple[float, float, float, float]:
    sub = train[train["grade"] == grade].reset_index(drop=True)
    if len(sub) < 10:
        log.warning(f"  Grade {grade}: only {len(sub)} rows — keeping current params")
        return fixed[grade]["basePER"], fixed[grade]["gMult"], np.nan, np.nan

    bp_vals = GRID[grade]["basePER"]
    gm_vals = GRID[grade]["gMult"]
    ret_arr = sub[metric].values.astype(float)
    best_r, best_spread, best_bp, best_gm = -np.inf, np.nan, \
        fixed[grade]["basePER"], fixed[grade]["gMult"]

    for bp in bp_vals:
        for gm in gm_vals:
            iv  = compute_iv_series(sub, {grade: {"basePER": float(bp), "gMult": float(gm)}})
            ivp = (iv / sub["price"]).values
            r, spread, _ = spearman_and_quintiles(ivp, ret_arr)
            if np.isfinite(r) and r > best_r:
                best_r, best_spread, best_bp, best_gm = r, spread, float(bp), float(gm)

    log.info(
        f"    Grade {grade}: {len(sub):4d} rows  {len(bp_vals)*len(gm_vals):3d} combos  "
        f"basePER={best_bp:.1f}  gMult={best_gm:.2f}  "
        f"r={best_r:.4f}  spread={best_spread:.4f}"
    )
    return best_bp, best_gm, best_r, best_spread


def full_metrics(df: pd.DataFrame, params: Dict[int, Dict],
                 metric: str = "ret1y") -> dict:
    iv   = compute_iv_series(df, params)
    ivp  = (iv / df["price"]).values
    r1, s1, q1 = spearman_and_quintiles(ivp, df["ret1y"].values.astype(float))
    r2, s2, _  = spearman_and_quintiles(ivp, df["ret2y"].values.astype(float))
    by_grade: Dict[int, float] = {}
    for g in [1, 2, 3, 4]:
        gm = (df["grade"] == g).values
        if gm.sum() < 5:
            by_grade[g] = np.nan
            continue
        iv_g  = compute_iv_series(df[gm].reset_index(drop=True), params)
        ivp_g = (iv_g / df.loc[gm, "price"].values)
        r_g, _, _ = spearman_and_quintiles(
            ivp_g.values, df.loc[gm, metric].values.astype(float))
        by_grade[g] = r_g
    return {"r1y": r1, "spread1y": s1, "quintiles1y": q1,
            "r2y": r2, "spread2y": s2, "by_grade": by_grade, "n": len(df)}


def grid_search(train: pd.DataFrame, val: pd.DataFrame) -> Tuple[Dict, dict]:
    log.info("─── Step 5: Grid Search ─────────────────────────────────────────")
    log.info(f"  Train: {len(train)} rows  |  Val: {len(val)} rows")
    params = {g: {"basePER": CURRENT_PARAMS[g]["basePER"],
                  "gMult":   CURRENT_PARAMS[g]["gMult"]} for g in [1, 2, 3, 4]}

    for pass_n in range(1, 3):
        log.info(f"\n  ── Coordinate-descent pass {pass_n}/2 ──")
        for grade in [1, 2, 3, 4]:
            bp, gm, _, _ = optimize_grade(grade, train, params)
            params[grade] = {"basePER": bp, "gMult": gm}

    log.info("\n  Computing full-dataset metrics…")
    return params, {
        "train":       full_metrics(train,                   params),
        "val":         full_metrics(val,                     params),
        "current_all": full_metrics(pd.concat([train, val]), CURRENT_PARAMS),
    }


# ═════════════════════════════════════════════════════════════════════════════
# STEP 6 — Train / Val Split & Results
# ═════════════════════════════════════════════════════════════════════════════

def train_val_split(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
    years = sorted(df["year"].unique())
    cut   = years[len(years) // 2]
    train = df[df["year"] <  cut].reset_index(drop=True)
    val   = df[df["year"] >= cut].reset_index(drop=True)
    log.info(f"Train: {years[0]}–{cut-1}  ({len(train)} rows)  |  "
             f"Val: {cut}–{years[-1]}  ({len(val)} rows)")
    return train, val


def format_results(best: Dict, metrics: dict, df: pd.DataFrame) -> str:
    W = 72
    lines = []
    lines += ["═"*W,
              "  VALUE ANALYZER v5.0 — BACKTEST PARAMETER OPTIMIZATION (EDGAR)",
              f"  Generated: {pd.Timestamp.now():%Y-%m-%d %H:%M}", "═"*W]

    lines += ["─"*W, "  Dataset Summary", "─"*W]
    lines.append(f"  Total rows     : {len(df):,}")
    lines.append(f"  Unique tickers : {df['ticker'].nunique()}")
    lines.append(f"  Year range     : {df['year'].min()} – {df['year'].max()}")
    lines.append(f"  Sectors        : {df['sector'].nunique()}")
    for g, cnt in df["grade"].value_counts().sort_index().items():
        lines.append(f"    Grade {g}: {cnt:5d} rows ({100*cnt/len(df):5.1f}%)")

    lines += ["─"*W, "  Optimal Parameters vs. Current GRADE_CONFIGS", "─"*W]
    lines.append(f"  {'Grade':<6} {'basePER_opt':>12} {'gMult_opt':>10}   "
                 f"{'basePER_cur':>12} {'gMult_cur':>10}   "
                 f"{'Δ basePER':>10} {'Δ gMult':>10}")
    for g in [1, 2, 3, 4]:
        bo, go = best[g]["basePER"], best[g]["gMult"]
        bc, gc = CURRENT_PARAMS[g]["basePER"], CURRENT_PARAMS[g]["gMult"]
        lines.append(f"  Grade {g}   {bo:>12.1f} {go:>10.2f}   "
                     f"{bc:>12.1f} {gc:>10.2f}   "
                     f"{bo-bc:>+10.1f} {go-gc:>+10.2f}")

    def _fmt(m: dict, label: str):
        nonlocal lines
        lines += ["─"*W, f"  {label}", "─"*W]
        lines.append(f"  Spearman r (1y) : {m['r1y']:+.4f}  |  5Q spread : {m['spread1y']:+.4f}")
        lines.append(f"  Spearman r (2y) : {m['r2y']:+.4f}  |  5Q spread : {m['spread2y']:+.4f}")
        lines.append("  Per-grade r (1y):")
        for g in [1, 2, 3, 4]:
            lines.append(f"    Grade {g}: {m['by_grade'][g]:+.4f}")
        if len(m.get("quintiles1y", [])) >= 2:
            lines.append("  5-quintile mean 1y return (Q1=overvalued → Q5=undervalued):")
            for qi, rv in m["quintiles1y"].items():
                lines.append(f"    Q{int(qi)+1}: {rv:+.4f}")

    _fmt(metrics["train"],       f"Train — Optimal Params    (n={metrics['train']['n']:,})")
    _fmt(metrics["val"],         f"Val   — Optimal Params    (n={metrics['val']['n']:,})")
    _fmt(metrics["current_all"], f"All   — Current  Params   (n={metrics['current_all']['n']:,})")

    lines += ["─"*W, "  Recommendations for GRADE_CONFIGS", "─"*W]
    for g in [1, 2, 3, 4]:
        lines.append(f"  Grade {g}: basePER = {best[g]['basePER']:.1f}  "
                     f"gMultiplier = {best[g]['gMult']:.2f}")
    lines += ["", "  ⚠  Apply only if:",
              "    • train r1y and val r1y are both positive and similar",
              "    • quintile spread increases Q1 → Q5  (monotone)",
              "    • each grade has ≥ 50 rows", "═"*W]
    return "\n".join(lines)


# ═════════════════════════════════════════════════════════════════════════════
# Main
# ═════════════════════════════════════════════════════════════════════════════

def main() -> None:
    log.info("═" * 60)
    log.info("Value Analyzer v5.0 Backtest  (SEC EDGAR edition)")
    log.info("═" * 60)
    t0 = time.time()

    log.info("─── Step 1: Data Collection ─────────────────────────────────────")
    sp500   = fetch_sp500_list()
    sampled = sample_tickers(sp500)
    ten_y   = fetch_10y_yield()
    cik_map = fetch_cik_map()
    raw_df  = collect_data(sampled, cik_map, ten_y)

    log.info("─── Step 2: Preprocessing ───────────────────────────────────────")
    df = preprocess(raw_df)
    if len(df) < 100:
        sys.exit(f"ERROR: only {len(df)} rows — insufficient data.")

    log.info("─── Step 3: Grade Assignment ────────────────────────────────────")
    df = assign_grades(df)

    save_cols = ["ticker", "sector", "year",
                 "eps", "roe", "revenue_growth",
                 "gross_margin", "operating_margin", "debt_ratio",
                 "net_cash_per_share",
                 "price", "price_fwd1y", "price_fwd2y",
                 "aaa_yield", "moat_score", "grade"]
    df[save_cols].to_csv(DATA_CSV, index=False)
    log.info(f"Dataset saved → {DATA_CSV}")

    log.info("─── Step 4: Train / Val Split ───────────────────────────────────")
    train, val = train_val_split(df)

    best_params, metrics = grid_search(train, val)

    log.info("─── Step 6: Results ─────────────────────────────────────────────")
    report = format_results(best_params, metrics, df)
    print("\n" + report)
    RESULTS_TXT.write_text(report, encoding="utf-8")
    log.info(f"Results saved → {RESULTS_TXT}")
    log.info(f"Total elapsed: {(time.time()-t0)/60:.1f} min")


if __name__ == "__main__":
    main()
