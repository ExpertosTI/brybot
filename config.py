# config.py
from dotenv import load_dotenv
import os

load_dotenv()

ACCESS_TOKEN = os.getenv("ACCESS_TOKEN")
SECRET_KEY = os.getenv("SECRET_KEY")
ACCOUNT_ID = os.getenv("ACCOUNT_ID")
BASE_URL = "https://api.topstepx.com"
