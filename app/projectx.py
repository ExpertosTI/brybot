# projectx.py
from app.auth import get_session_token
import os
import requests
import json

USER_NAME = os.getenv("TOPSTEP_USER")
API_KEY = os.getenv("TOPSTEP_API_KEY")
_account_id_raw = os.getenv("TOPSTEP_ACCOUNT_ID")
ACCOUNT_ID = int(_account_id_raw) if _account_id_raw else None
BASE_URL = "https://api.topstepx.com"

def get_active_account_id(token):
    url = f"{BASE_URL}/api/Account/search"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {"onlyActiveAccounts": True}

    try:
        response = requests.post(url, headers=headers, json=payload)
        print("Status Code (Account Search):", response.status_code)
        print("Response (Account Search):", response.text)

        data = response.json()
        if data.get("success") and data.get("accounts"):
            account_id = data["accounts"][0]["id"]
            print(f"✅ Found active account: ID {account_id}")
            return account_id
        else:
            print("❌ No active accounts found.")
            return None
    except requests.exceptions.RequestException as e:
        print("❌ Account search failed:", e)
        return None

def get_contract_id(symbol: str, token):
    url = f"{BASE_URL}/api/Contract/search"
    payload = {
        "searchText": symbol.upper(),
        "live": False
    }
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        print("Status Code (Contract Search):", response.status_code)
        print("Response (Contract Search):", response.text)
        response.raise_for_status()
        data = response.json()

        contracts = data.get("contracts", [])
        print("Contracts returned:", contracts)
        for contract in contracts:
            if symbol.upper() in (contract["name"], contract["description"]):
                print(f"✅ Found contract: {symbol} -> ID: {contract['id']}")
                return contract["id"]

        print(f"❌ No matching contract found for symbol: {symbol}")
        return None

    except requests.exceptions.RequestException as e:
        print(f"❌ Error fetching contract ID: {e}")
        return None

def execute_trade(symbol: str, side: str, quantity: int, token: str):   

    account_id = get_active_account_id(token)
    if not account_id:
        return {"error": "No active account available to place trade."}

    contract_id = get_contract_id(symbol, token)
    if not contract_id:
        return {"error": f"Could not find contract for symbol: {symbol}"}

    url = f"{BASE_URL}/api/Order/place"

    payload = {
        "accountId": account_id,
        "contractId": contract_id,
        "type": 2,  # MARKET
        "side": 0 if side.upper() == "BUY" else 1,  # 0 = BUY, 1 = SELL
        "size": quantity,
        "timeInForce": "GTC"
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    try:
        print("Final Payload:\n", json.dumps(payload, indent=2))
        response = requests.post(url, headers=headers, json=payload)
        print("Status Code:", response.status_code)
        print("Response:", response.text)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"error": str(e)}
