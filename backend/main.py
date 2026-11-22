import sys
from pathlib import Path

# Ensure paths resolve properly for Vercel Python runtime
curr_dir = Path(__file__).resolve().parent
parent_dir = curr_dir.parent
for p in [str(curr_dir), str(parent_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app.main import app

# Export for ASGI servers (Uvicorn, Vercel Serverless)
__all__ = ["app"]
