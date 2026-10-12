"""Verifies Supabase access tokens (ES256 / RS256) against the project's public JWKS."""
from functools import lru_cache

import jwt
from fastapi import Header, HTTPException

from app.config import settings


@lru_cache(maxsize=1)
def _jwks() -> jwt.PyJWKClient:
    url = settings.SUPABASE_JWKS_URL or f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    return jwt.PyJWKClient(url, cache_keys=True, lifespan=3600)


def current_user_id(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Please sign in.")
    token = authorization.split(" ", 1)[1].strip()
    try:
        key = _jwks().get_signing_key_from_jwt(token).key
        claims = jwt.decode(token, key, algorithms=["ES256", "RS256"], audience="authenticated",
                            issuer=f"{settings.SUPABASE_URL}/auth/v1")
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Your session expired. Please sign in again.")
    except Exception:
        raise HTTPException(401, "Please sign in.")
    return claims["sub"]
