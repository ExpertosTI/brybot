from __future__ import annotations

from enum import Enum


class IntegrationProvider(str, Enum):
    DEMO = "DEMO"
    TOPSTEPX = "TOPSTEPX"
    TRADOVATE = "TRADOVATE"
    NINJATRADER = "NINJATRADER"
    TRADINGVIEW = "TRADINGVIEW"
    IBKR = "IBKR"
    ETX = "ETX"


class IntegrationCapability(str, Enum):
    BROKER_TRADING = "BROKER_TRADING"
    MARKET_DATA = "MARKET_DATA"
    SIGNALS = "SIGNALS"
    ACCOUNT_INFO = "ACCOUNT_INFO"
    PAPER_TRADING = "PAPER_TRADING"


PROVIDER_CAPABILITIES: dict[IntegrationProvider, set[IntegrationCapability]] = {
    IntegrationProvider.DEMO: {
        IntegrationCapability.BROKER_TRADING,
        IntegrationCapability.MARKET_DATA,
        IntegrationCapability.ACCOUNT_INFO,
        IntegrationCapability.PAPER_TRADING,
    },
    IntegrationProvider.TOPSTEPX: {
        IntegrationCapability.BROKER_TRADING,
        IntegrationCapability.MARKET_DATA,
        IntegrationCapability.ACCOUNT_INFO,
    },
    IntegrationProvider.TRADOVATE: {
        IntegrationCapability.BROKER_TRADING,
        IntegrationCapability.MARKET_DATA,
        IntegrationCapability.ACCOUNT_INFO,
    },
    IntegrationProvider.NINJATRADER: {
        IntegrationCapability.BROKER_TRADING,
        IntegrationCapability.MARKET_DATA,
    },
    IntegrationProvider.IBKR: {
        IntegrationCapability.BROKER_TRADING,
        IntegrationCapability.MARKET_DATA,
        IntegrationCapability.ACCOUNT_INFO,
    },
    IntegrationProvider.ETX: {
        IntegrationCapability.BROKER_TRADING,
        IntegrationCapability.MARKET_DATA,
    },
    IntegrationProvider.TRADINGVIEW: {
        IntegrationCapability.SIGNALS,
    },
}
