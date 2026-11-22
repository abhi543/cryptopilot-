import sys
import types
from pathlib import Path

# Ensure paths resolve properly for Vercel Python runtime
curr_dir = Path(__file__).resolve().parent
parent_dir = curr_dir.parent

for p in [str(curr_dir), str(parent_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# When root is set to "backend" on Vercel, the directory is mounted without a parent "backend" package.
# Register an alias so 'backend.app' imports seamlessly resolve to 'app'.
if "backend" not in sys.modules:
    pkg = types.ModuleType("backend")
    pkg.__path__ = [str(curr_dir)]
    pkg.__file__ = str(curr_dir / "__init__.py")
    sys.modules["backend"] = pkg

from backend.app.main import app

# Export for ASGI servers (Uvicorn, Vercel Serverless)
__all__ = ["app"]

