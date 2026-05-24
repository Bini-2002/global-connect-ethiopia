"""
MongoDB Atlas Connection Diagnostic Script
Run with: python diagnose_db.py
"""
import asyncio
import sys
import os

# Add the backend folder to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ── 1. Read the raw .env and check for problems ──────────────────────────────
env_path = os.path.join(os.path.dirname(__file__), ".env")
print("=" * 60)
print("1. CHECKING .env FILE")
print("=" * 60)

env_vars = {}
with open(env_path, "r") as f:
    for i, line in enumerate(f, 1):
        raw = line.rstrip("\n\r")
        # Check for corruption / non-.env content
        if raw.startswith("/*") or raw.startswith("*/"):
            print(f"  ⚠  LINE {i}: Found non-.env content (looks like a JS comment): {raw!r}")
            continue
        if raw.startswith("#") or not raw.strip():
            continue
        if "=" in raw:
            key, _, val = raw.partition("=")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            env_vars[key] = val

print(f"  Parsed {len(env_vars)} environment variables")
print(f"  MONGODB_URL  = {env_vars.get('MONGODB_URL', 'NOT FOUND')[:60]}...")
print(f"  DATABASE_NAME = {env_vars.get('DATABASE_NAME', 'NOT FOUND')}")

# ── 2. Test raw Motor connection ──────────────────────────────────────────────
print()
print("=" * 60)
print("2. TESTING DIRECT MOTOR CONNECTION TO MONGODB ATLAS")
print("=" * 60)

async def test_motor():
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        url = env_vars.get("MONGODB_URL", "")
        db_name = env_vars.get("DATABASE_NAME", "global_connect_db")

        print(f"  Connecting to: {url[:60]}...")
        client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=10000)

        # Ping
        result = await client.admin.command("ping")
        print(f"  ✅ PING SUCCESS: {result}")

        # List databases
        db_names = await client.list_database_names()
        print(f"  ✅ Databases on cluster: {db_names}")

        # Check our specific database
        db = client[db_name]
        collections = await db.list_collection_names()
        print(f"  ✅ Collections in '{db_name}': {collections[:15]}")

        # Count a few key collections
        for col_name in ["users", "proposals", "events", "vendors"]:
            count = await db[col_name].count_documents({})
            print(f"     - {col_name}: {count} documents")

        client.close()
        return True

    except Exception as e:
        print(f"  ❌ CONNECTION FAILED: {type(e).__name__}: {e}")
        return False


# ── 3. Test via settings/app config ──────────────────────────────────────────
async def test_via_app():
    print()
    print("=" * 60)
    print("3. TESTING VIA APP SETTINGS (app.core.config)")
    print("=" * 60)
    try:
        from app.core.config import settings
        print(f"  MONGODB_URL loaded: {settings.MONGODB_URL[:60]}...")
        print(f"  DATABASE_NAME: {settings.DATABASE_NAME}")
        print(f"  USE_MOCK_DB: {getattr(settings, 'USE_MOCK_DB', False)}")

        from app.db.mongodb import client, db
        result = await client.admin.command("ping")
        print(f"  ✅ App-level ping: {result}")

        collections = await db.list_collection_names()
        print(f"  ✅ App-level collections: {collections[:10]}")
        return True
    except Exception as e:
        print(f"  ❌ App-level connection FAILED: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    ok1 = await test_motor()
    ok2 = await test_via_app()

    print()
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"  Direct Motor connection: {'✅ OK' if ok1 else '❌ FAILED'}")
    print(f"  App-level connection:    {'✅ OK' if ok2 else '❌ FAILED'}")

    if not ok1:
        print()
        print("LIKELY CAUSES:")
        print("  1. MongoDB Atlas cluster hostname is wrong")
        print("  2. DB username/password is wrong")
        print("  3. Your IP is not whitelisted in Atlas Network Access")
        print("  4. The cluster was paused/deleted on Atlas")
    if ok1 and not ok2:
        print()
        print("LIKELY CAUSES:")
        print("  1. .env file is being parsed incorrectly (corruption at top)")
        print("  2. pydantic_settings env_file path is wrong")
        print("  3. USE_MOCK_DB is being set True accidentally")


asyncio.run(main())
