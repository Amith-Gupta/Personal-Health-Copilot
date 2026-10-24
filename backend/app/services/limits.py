"""Per-user request budgets for the expensive endpoints.

Every upload, question and voice clip costs a paid model call, so one signed-in
account must not be able to drain the quota for everyone else. The window lives
in process memory, which is correct for the single-instance deployment; behind a
load balancer this class is the one place to swap for Redis.
"""
import threading
import time
from collections import defaultdict, deque
from typing import Callable, Deque, Dict, Tuple

from fastapi import Depends, HTTPException

from app.services.auth import current_user_id


class SlidingWindow:
    def __init__(self, limit: int, seconds: int):
        self.limit = limit
        self.seconds = seconds
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def hit(self, key: str, now: float | None = None) -> float:
        """Records one request. Returns 0 when allowed, else seconds until the next slot frees up."""
        now = time.monotonic() if now is None else now
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] >= self.seconds:
                q.popleft()
            if len(q) >= self.limit:
                return max(0.0, self.seconds - (now - q[0]))
            q.append(now)
            return 0.0

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


# (per short window, per long window). Generous for a family, tight for abuse.
BUDGETS: Dict[str, Tuple[SlidingWindow, ...]] = {
    "upload": (SlidingWindow(6, 60), SlidingWindow(40, 3600)),
    "ask": (SlidingWindow(12, 60), SlidingWindow(150, 3600)),
    "voice": (SlidingWindow(20, 60), SlidingWindow(300, 3600)),
    "tts": (SlidingWindow(90, 60), SlidingWindow(1500, 3600)),
}

MESSAGE = "You are going a little fast. Please wait {s} seconds and try again."


def budget(name: str) -> Callable[..., str]:
    """FastAPI dependency: authenticates, charges the user's budget, returns the user id."""
    windows = BUDGETS[name]

    def dependency(owner: str = Depends(current_user_id)) -> str:
        for w in windows:
            wait = w.hit(f"{name}:{owner}")
            if wait:
                secs = int(wait) + 1
                raise HTTPException(429, MESSAGE.format(s=secs), headers={"Retry-After": str(secs)})
        return owner

    return dependency


def reset_all() -> None:
    for windows in BUDGETS.values():
        for w in windows:
            w.reset()
