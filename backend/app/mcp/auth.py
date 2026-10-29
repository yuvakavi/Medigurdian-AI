from typing import Any

from mcp.server.auth.provider import (
    AccessToken,
    TokenVerifier,
)

from app.config import settings
from supabase import create_client


class SupabaseTokenVerifier(TokenVerifier):
    """
    Verifies Supabase access tokens for MCP HTTP requests.
    """

    async def verify_token(
        self,
        token: str
    ) -> AccessToken | None:

        if not token:
            return None

        try:
            client = create_client(
                settings.supabase_url,
                settings.supabase_publishable_key
            )

            response = client.auth.get_user(token)

            if response.user is None:
                return None

            user = response.user

            return AccessToken(
                token=token,
                client_id=str(user.id),
                scopes=[],
                expires_at=None,
                resource=None,
            )

        except Exception as e:
            print("MCP AUTH ERROR:", repr(e))
            return None