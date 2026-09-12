import os
import requests
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class TradovateClient:
    def __init__(self, env="demo"):
        self.env = env
        if env == "demo":
            self.base_url = "https://demo.tradovateapi.com/v1"
        else:
            self.base_url = "https://live.tradovateapi.com/v1"

        self.username = os.getenv("TOPSTEP_USERNAME")
        self.password = os.getenv("TOPSTEP_PASSWORD")
        self.app_id = os.getenv("TOPSTEP_APP_ID", "BrybotApp")
        self.client_id = os.getenv("TOPSTEP_API_CLIENT_ID")
        self.client_secret = os.getenv("TOPSTEP_API_SECRET_KEY")
        self.account_id = os.getenv("TOPSTEP_ACCOUNT_ID")
        self.account_name = os.getenv("TOPSTEP_ACCOUNT_NAME")

        self.access_token = None
        self.token_expiration = None

    def get_access_token(self):
        """Fetch or return cached OAuth access token."""
        if self.access_token and self.token_expiration:
            # Check if expired (with 1 min buffer)
            if datetime.utcnow().isoformat() < self.token_expiration:
                return self.access_token

        url = f"{self.base_url}/auth/accesstokenrequest"
        payload = {
            "name": self.username,
            "password": self.password,
            "appId": self.app_id,
            "appVersion": "1.0.0",
            "cid": self.client_id,
            "sec": self.client_secret
        }
        
        headers = {"Content-Type": "application/json"}
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            response.raise_for_status()
            data = response.json()
            self.access_token = data.get("accessToken")
            self.token_expiration = data.get("expirationTime")
            logger.info("Successfully authenticated with Tradovate REST API.")
            return self.access_token
        except Exception as e:
            logger.error(f"Failed to authenticate with Tradovate: {e}")
            return None

    def place_bracket_order(self, symbol: str, action: str, qty: int, tp_price: float, sl_price: float):
        """Place an OCO Bracket Order via REST API."""
        token = self.get_access_token()
        if not token:
            return {"error": "Authentication failed"}

        url = f"{self.base_url}/order/placeorder"
        
        payload = {
            "accountSpec": self.account_name,
            "accountId": int(self.account_id) if self.account_id else None,
            "action": action.capitalize(), # Buy or Sell
            "symbol": symbol.upper(),
            "orderQty": qty,
            "orderType": "Market",
            "isAutomated": True,
            "bracket1": {
                "profitTarget": {
                    "action": "Sell" if action.lower() == "buy" else "Buy",
                    "orderType": "Limit",
                    "price": tp_price
                },
                "stopLoss": {
                    "action": "Sell" if action.lower() == "buy" else "Buy",
                    "orderType": "Stop",
                    "stopPrice": sl_price
                }
            }
        }
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        
        try:
            logger.info(f"Placing Bracket Order: {json.dumps(payload)}")
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error placing bracket order: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response: {e.response.text}")
            return {"error": str(e)}

    def cancel_order(self, order_id: int):
        token = self.get_access_token()
        url = f"{self.base_url}/order/cancelorder"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        payload = {"orderId": order_id}
        try:
            response = requests.post(url, headers=headers, json=payload)
            return response.json()
        except Exception as e:
            return {"error": str(e)}

    def close_position(self, position_id: int):
        token = self.get_access_token()
        url = f"{self.base_url}/position/closeposition"
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        payload = {"positionId": position_id}
        try:
            response = requests.post(url, headers=headers, json=payload)
            return response.json()
        except Exception as e:
            return {"error": str(e)}
