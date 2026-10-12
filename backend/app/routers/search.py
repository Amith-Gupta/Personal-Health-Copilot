# Backward-compatibility alias: renamed to copilot.py per enterprise standard
from app.routers.copilot import router

__all__ = ["router"]
