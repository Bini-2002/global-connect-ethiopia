import httpx
import logging
import uuid
from fastapi import HTTPException
from app.core.config import settings

logger = logging.getLogger(__name__)

async def initiate_chapa_transfer(
    amount: float,
    reference: str = None,
    account_name: str = "Test User",
    account_number: str = "1000123456789",
    bank_code: str = "853d0598-9c01-41ab-ac99-48eab4da1513" # CBE / default bank code
) -> dict:
    """
    Initiate a transfer (withdrawal) to a user's bank account via Chapa.
    """
    if not reference:
        reference = f"tx-{uuid.uuid4().hex[:12]}"

    if not settings.CHAPA_SECRET_KEY or "placeholder" in settings.CHAPA_SECRET_KEY:
        logger.warning("CHAPA_SECRET_KEY is not set or is placeholder. Skipping real Chapa API call for withdrawal.")
        return {"status": "success", "message": "Simulated Chapa transfer successful.", "data": {"reference": reference}}

    url = f"{settings.CHAPA_API_URL}/transfers"
    headers = {
        "Authorization": f"Bearer {settings.CHAPA_SECRET_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "account_name": account_name,
        "account_number": account_number,
        "amount": amount,
        "currency": "ETB",
        "reference": reference,
        "bank_code": bank_code
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers, timeout=10.0)
            
            response_data = response.json()
            if response.status_code != 200:
                logger.error(f"Chapa Transfer API error: {response_data}")
                # We raise an error so the caller can abort the database deduction if needed.
                raise HTTPException(status_code=400, detail=f"Chapa Transfer Failed: {response_data.get('message', 'Unknown error')}")
                
            logger.info(f"Chapa Transfer Success: {response_data}")
            return response_data
    except httpx.RequestError as e:
        logger.error(f"Chapa request failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment Gateway currently unavailable")
