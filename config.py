# config.py
from dotenv import load_dotenv
import os

load_dotenv()

ACCESS_TOKEN = os.getenv("ACCESS_TOKEN")
SECRET_KEY = os.getenv("SECRET_KEY")
ACCOUNT_ID = os.getenv("ACCOUNT_ID")
BASE_URL = "https://api.topstepx.com"

# TradingView API configuration
TRADINGVIEW_API_KEY = os.getenv("TRADINGVIEW_API_KEY")
TRADINGVIEW_BASE_URL = os.getenv("TRADINGVIEW_BASE_URL", "https://api.tradingview.com")
