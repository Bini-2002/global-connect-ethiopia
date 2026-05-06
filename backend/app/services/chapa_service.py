import os
import uuid
import httpx
from fastapi import HTTPException

# Using the provided test keys as defaults if env is missing
CHAPA_SECRET_KEY = os.getenv("CHAPA_SECRET_KEY", "CHASECK_TEST-bRzQUZZDbeDk7Vk7BQxxIqBxbEFBB0w8")
CHAPA_PUBLIC_KEY = os.getenv("CHAPA_PUBLIC_KEY", "CHAPUBK_TEST-lJCcDzcYPwjYSKYM6vDvLSjGqZA4dc24")
CHAPA_INITIALIZE_URL = "https://api.chapa.co/v1/transaction/initialize"
CHAPA_VERIFY_URL = "https://api.chapa.co/v1/transaction/verify/"

async def initialize_payment(amount: float, email: str, first_name: str, last_name: str, return_url: str):
    tx_ref = f"tx-{uuid.uuid4().hex}"
    
    payload = {
        "amount": str(amount),
        "currency": "ETB",
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "tx_ref": tx_ref,
        "callback_url": return_url, # Usually a server-to-server webhook, but we'll use return_url for client verification in this MVP
        "return_url": f"{return_url}?tx_ref={tx_ref}",
        "customization[title]": "Global Connect Ethiopia Wallet",
        "customization[description]": "Wallet Top-up"
    }

    headers = {
        "Authorization": f"Bearer {CHAPA_SECRET_KEY}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(CHAPA_INITIALIZE_URL, json=payload, headers=headers)
        
        if response.status_code != 200:
            print("Chapa Init Error:", response.text)
            raise HTTPException(status_code=400, detail="Failed to initialize payment with Chapa")
            
        data = response.json()
        if data.get("status") != "success":
            raise HTTPException(status_code=400, detail=data.get("message", "Payment initialization failed"))
            
        return {
            "checkout_url": data["data"]["checkout_url"],
            "tx_ref": tx_ref
        }

async def verify_payment(tx_ref: str):
    headers = {
        "Authorization": f"Bearer {CHAPA_SECRET_KEY}"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(f"{CHAPA_VERIFY_URL}{tx_ref}", headers=headers)
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to verify payment with Chapa")
            
        data = response.json()
        
        # Chapa returns status: 'success' for successful payments
        if data.get("status") == "success" and data.get("data", {}).get("status") == "success":
            return {
                "success": True,
                "amount": float(data["data"]["amount"]),
                "currency": data["data"]["currency"],
                "tx_ref": data["data"]["tx_ref"]
            }
        
        return {
            "success": False,
            "status": data.get("data", {}).get("status", "failed")
        }
