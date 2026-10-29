from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.services.supabase_client import supabase


security = HTTPBearer(auto_error=False)


class AuthenticatedUser:
    def __init__(self, user, token: str):
        self.user = user
        self._token = token
        self.token = token
        self.id = user.id
        self.email = getattr(user, "email", None)

    def __getitem__(self, key):
        if key == "user":
            return self.user

        if key == "token":
            return self._token

        raise KeyError(key)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
):
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    token = credentials.credentials

    try:
        response = supabase.auth.get_user(token)

        if response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )

        return AuthenticatedUser(
            user=response.user,
            token=token,
        )

    except HTTPException:
        raise

    except Exception as e:
        print("AUTH ERROR:", repr(e))

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        )