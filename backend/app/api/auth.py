from fastapi import APIRouter, Depends, HTTPException

from app.schemas.auth import (
    SignupRequest,
    LoginRequest,
    AuthResponse,
)

from app.services.supabase_client import supabase
from app.utils.auth import get_current_user


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# =========================================================
# SIGNUP
# =========================================================

@router.post("/signup", response_model=AuthResponse)
def signup(data: SignupRequest):

    try:
        response = supabase.auth.sign_up(
            {
                "email": data.email,
                "password": data.password,
            }
        )

        if response.user is None:
            raise HTTPException(
                status_code=400,
                detail="Unable to create user.",
            )

        session = response.session

        # If email confirmation is enabled,
        # session can be None until the email is confirmed.
        if session is None:
            return AuthResponse(
                access_token="",
                refresh_token=None,
                token_type="bearer",
                user_id=response.user.id,
                email=response.user.email,
            )

        return AuthResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            token_type="bearer",
            user_id=response.user.id,
            email=response.user.email,
        )

    except HTTPException:
        raise

    except Exception as e:
        print("SIGNUP ERROR:", repr(e))

        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


# =========================================================
# LOGIN
# =========================================================

@router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest):

    try:
        response = supabase.auth.sign_in_with_password(
            {
                "email": data.email,
                "password": data.password,
            }
        )

        if response.user is None or response.session is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password.",
            )

        return AuthResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            token_type="bearer",
            user_id=response.user.id,
            email=response.user.email,
        )

    except HTTPException:
        raise

    except Exception as e:
        print("LOGIN ERROR:", repr(e))

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )


# =========================================================
# CURRENT USER
# =========================================================

@router.get("/me")
def get_me(
    current_user=Depends(get_current_user),
):
    return {
        "user_id": current_user.id,
        "email": current_user.email,
    }


# =========================================================
# LOGOUT
# =========================================================

@router.post("/logout")
def logout():

    try:
        supabase.auth.sign_out()

        return {
            "message": "Logged out successfully."
        }

    except Exception as e:
        print("LOGOUT ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="Unable to logout.",
        )