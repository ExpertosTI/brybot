"""Real-world Market Data Provider using Yahoo Finance (CME Futures) & Binance (Crypto) public endpoints."""
from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional
import requests

logger = logging.getLogger(__name__)

# Symbol mapping
YAHOO_SYMBOL_MAP = {
    "NQ": "NQ=F",
    "MNQ": "MNQ=F",
    "ES": "ES=F",
    "MES": "MES=F",
    "YM": "YM=F",
    "MYM": "MYM=F",
    "RTY": "RTY=F",
    "M2K": "M2K=F",
    "CL": "CL=F",
    "QM": "QM=F",
    "GC": "GC=F",
    "MGC": "MGC=F",
    "SI": "SI=F",
    "SIL": "SIL=F",
    "BTC": "BTC-USD",
    "ETH": "ETH-USD",
    "SOL": "SOL-USD",
    "EURUSD": "EURUSD=X",
    "GBPUSD": "GBPUSD=X",
    "USDJPY": "JPY=X",
}

BINANCE_SYMBOL_MAP = {
    "BTC": "BTCUSDT",
    "ETH": "ETHUSDT",
    "SOL": "SOLUSDT",
    "BNB": "BNBUSDT",
    "XRP": "XRPUSDT",
    "DOGE": "DOGEUSDT",
    "ADA": "ADAUSDT",
}

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
}

# Global Session for Yahoo Finance cookie persistence
_yahoo_session: Optional[requests.Session] = None
_last_session_init: float = 0


def _get_yahoo_session() -> requests.Session:
    global _yahoo_session, _last_session_init
    now = time.time()
    if _yahoo_session is None or (now - _last_session_init) > 1800:
        s = requests.Session()
        s.headers.update(DEFAULT_HEADERS)
        try:
            s.get("https://fc.yahoo.com", timeout=3)
        except Exception:
            pass
        _yahoo_session = s
        _last_session_init = now
    return _yahoo_session


def _map_resolution_to_yahoo(resolution: str) -> tuple[str, str]:
    """Map resolution (e.g. '1', '5', '15', '60', 'D') to (interval, range) for Yahoo Finance."""
    res = str(resolution).strip().upper()
    if res in ("1", "1M"):
        return "1m", "1d"
    if res in ("2", "2M"):
        return "2m", "1d"
    if res in ("3", "3M"):
        return "5m", "1d"
    if res in ("5", "5M"):
        return "5m", "5d"
    if res in ("15", "15M"):
        return "15m", "5d"
    if res in ("30", "30M"):
        return "30m", "1mo"
    if res in ("60", "1H", "60M"):
        return "60m", "1mo"
    if res in ("D", "1D", "DAILY"):
        return "1d", "3mo"
    return "5m", "5d"


def _map_resolution_to_binance(resolution: str) -> str:
    """Map resolution to Binance interval."""
    res = str(resolution).strip().upper()
    if res in ("1", "1M"):
        return "1m"
    if res in ("3", "3M"):
        return "3m"
    if res in ("5", "5M"):
        return "5m"
    if res in ("15", "15M"):
        return "15m"
    if res in ("30", "30M"):
        return "30m"
    if res in ("60", "1H", "60M"):
        return "1h"
    if res in ("D", "1D", "DAILY"):
        return "1d"
    return "1m"


def fetch_binance_ohlc(symbol: str, resolution: str, count: int = 150) -> Optional[Dict[str, Any]]:
    """Fetch real-time crypto klines from Binance Public API."""
    sym = symbol.upper().strip()
    pair = BINANCE_SYMBOL_MAP.get(sym)
    if not pair:
        if sym.endswith("USDT") or sym.endswith("BUSD"):
            pair = sym
        else:
            return None

    interval = _map_resolution_to_binance(resolution)
    url = f"https://api.binance.com/api/v3/klines?symbol={pair}&interval={interval}&limit={min(count, 500)}"

    try:
        resp = requests.get(url, headers=DEFAULT_HEADERS, timeout=4)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                t_list, o_list, h_list, l_list, c_list, v_list = [], [], [], [], [], []
                for item in data:
                    t_list.append(int(item[0] // 1000))
                    o_list.append(float(item[1]))
                    h_list.append(float(item[2]))
                    l_list.append(float(item[3]))
                    c_list.append(float(item[4]))
                    v_list.append(float(item[5]))

                return {
                    "t": t_list,
                    "o": o_list,
                    "h": h_list,
                    "l": l_list,
                    "c": c_list,
                    "v": v_list,
                }
    except Exception as e:
        logger.warning(f"Binance fetch error for {symbol}: {e}")
    return None


def fetch_yahoo_ohlc(symbol: str, resolution: str, count: int = 150) -> Optional[Dict[str, Any]]:
    """Fetch real-time futures / stock / forex bars from Yahoo Finance."""
    sym = symbol.upper().strip()
    ticker = YAHOO_SYMBOL_MAP.get(sym, sym)
    interval, range_str = _map_resolution_to_yahoo(resolution)

    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?interval={interval}&range={range_str}"
    session = _get_yahoo_session()

    try:
        resp = session.get(url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            result = data.get("chart", {}).get("result")
            if result and len(result) > 0:
                chart_data = result[0]
                timestamps = chart_data.get("timestamp", [])
                quote = chart_data.get("indicators", {}).get("quote", [{}])[0]

                opens = quote.get("open", [])
                highs = quote.get("high", [])
                lows = quote.get("low", [])
                closes = quote.get("close", [])
                volumes = quote.get("volume", [])

                if timestamps and closes:
                    t_list, o_list, h_list, l_list, c_list, v_list = [], [], [], [], [], []
                    for i in range(len(timestamps)):
                        # Filter out null / None data points
                        if (
                            closes[i] is None
                            or opens[i] is None
                            or highs[i] is None
                            or lows[i] is None
                        ):
                            continue
                        t_list.append(timestamps[i])
                        o_list.append(round(float(opens[i]), 2))
                        h_list.append(round(float(highs[i]), 2))
                        l_list.append(round(float(lows[i]), 2))
                        c_list.append(round(float(closes[i]), 2))
                        v_list.append(int(volumes[i] or 0) if i < len(volumes) else 0)

                    if len(t_list) > count:
                        t_list = t_list[-count:]
                        o_list = o_list[-count:]
                        h_list = h_list[-count:]
                        l_list = l_list[-count:]
                        c_list = c_list[-count:]
                        v_list = v_list[-count:]

                    if len(t_list) > 0:
                        return {
                            "t": t_list,
                            "o": o_list,
                            "h": h_list,
                            "l": l_list,
                            "c": c_list,
                            "v": v_list,
                        }
    except Exception as e:
        logger.warning(f"Yahoo finance fetch error for {ticker}: {e}")
    return None


def fetch_real_quote(symbol: str) -> Dict[str, Any]:
    """Fetch the latest real quote for a symbol."""
    sym = symbol.upper().strip()

    # 1. Check Binance for Crypto
    if sym in BINANCE_SYMBOL_MAP:
        pair = BINANCE_SYMBOL_MAP[sym]
        try:
            r = requests.get(f"https://api.binance.com/api/v3/ticker/24hr?symbol={pair}", headers=DEFAULT_HEADERS, timeout=3)
            if r.status_code == 200:
                data = r.json()
                price = float(data.get("lastPrice", 0.0))
                change_pct = float(data.get("priceChangePercent", 0.0))
                high = float(data.get("highPrice", 0.0))
                low = float(data.get("lowPrice", 0.0))
                vol = float(data.get("volume", 0.0))
                return {
                    "symbol": sym,
                    "price": price,
                    "change": change_pct,
                    "high": high,
                    "low": low,
                    "volume": vol,
                    "source": "Binance Live",
                    "time": int(time.time()),
                }
        except Exception:
            pass

    # 2. Futures / Stocks via Yahoo Finance query2
    ticker = YAHOO_SYMBOL_MAP.get(sym, sym)
    try:
        url = f"https://query2.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1m&range=1d"
        session = _get_yahoo_session()
        resp = session.get(url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            result = data.get("chart", {}).get("result", [{}])[0]
            meta = result.get("meta", {})
            price = meta.get("regularMarketPrice") or meta.get("chartPreviousClose") or 0.0
            prev = meta.get("chartPreviousClose") or meta.get("previousClose") or price
            change_pct = round(((price - prev) / prev) * 100, 2) if prev > 0 else 0.0
            high = meta.get("regularMarketDayHigh") or price
            low = meta.get("regularMarketDayLow") or price
            vol = meta.get("regularMarketVolume") or 0

            return {
                "symbol": sym,
                "ticker": ticker,
                "price": round(price, 2),
                "change": change_pct,
                "high": round(high, 2),
                "low": round(low, 2),
                "volume": vol,
                "source": "CME / Yahoo Realtime",
                "time": int(time.time()),
            }
    except Exception as e:
        logger.warning(f"Quote fetch error for {symbol}: {e}")

    return {
        "symbol": sym,
        "price": 0.0,
        "change": 0.0,
        "high": 0.0,
        "low": 0.0,
        "volume": 0,
        "source": "Fallback",
        "time": int(time.time()),
    }


def fetch_real_ohlc(symbol: str, resolution: str, start: int = 0, end: int = 0, count: int = 150) -> Optional[Dict[str, Any]]:
    """Try real Binance first for crypto, then Yahoo for futures/stocks."""
    sym = symbol.upper().strip()

    # 1. Crypto -> Binance
    if sym in BINANCE_SYMBOL_MAP:
        data = fetch_binance_ohlc(sym, resolution, count=count)
        if data and len(data.get("t", [])) > 0:
            return data

    # 2. Futures / Stocks -> Yahoo Finance
    data = fetch_yahoo_ohlc(sym, resolution, count=count)
    if data and len(data.get("t", [])) > 0:
        return data

    return None
