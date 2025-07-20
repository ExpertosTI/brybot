# auth.py
import requests
import os
from dotenv import load_dotenv
from requests.exceptions import RequestException
import json

load_dotenv()

LOGIN_URL = "https://api.topstepx.com/api/Auth/loginKey"

def get_session_token():
    user_name = os.getenv("TOPSTEP_USER")
    api_key = os.getenv("TOPSTEP_API_KEY")

    print("Username:", user_name)
    print("API Key:", api_key)

    payload = {
        "userName": user_name,
        "apiKey": api_key
    }

    headers = {
        "accept": "text/plain",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(LOGIN_URL, headers=headers, json=payload)
        print("Status Code:", response.status_code)
        print("Response Text:", response.text)

        # Raise if bad status code
        response.raise_for_status()

        # Attempt to parse JSON
        try:
            data = response.json()
        except json.JSONDecodeError:
            raise Exception("❌ Failed to decode JSON from auth response")

        # Check API response success
        if data.get("success") and data.get("token"):
            print("✅ Auth successful!")
            print("Session Token:", data["token"])
            return data["token"]
        else:
            raise Exception(f"❌ Auth failed: {data.get('errorMessage', 'Unknown error')}")

    except RequestException as e:
        raise Exception(f"❌ Request failed: {str(e)}")
