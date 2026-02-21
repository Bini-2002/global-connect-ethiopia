import asyncio
from httpx import AsyncClient
from app.main import app

async def test_register():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Test User",
                "email": "test45@example.com",
                "password": "Testpassword123!"
            },
        )
        print("Status:", response.status_code)
        print("Response:", response.json())

if __name__ == "__main__":
    asyncio.run(test_register())
