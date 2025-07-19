import os
import csv
from datetime import datetime

LOG_FILE = "logs/trades.csv"

# Ensure logs directory exists
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

def log_trade(symbol, side, quantity, price, status, response_text):
    file_exists = os.path.isfile(LOG_FILE)
    
    with open(LOG_FILE, mode="a", newline="") as file:
        writer = csv.writer(file)
        
        if not file_exists:
            writer.writerow([
                "timestamp", "symbol", "side", "quantity", "price", "status", "response"
            ])
        
        writer.writerow([
            datetime.now().isoformat(),
            symbol,
            side,
            quantity,
            price,
            status,
            response_text
        ])
