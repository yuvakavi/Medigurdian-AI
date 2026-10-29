from app.services.supabase_client import supabase


def signup(
    email: str,
    password: str,
    full_name: str,
):
    response = supabase.auth.sign_up(
        {
            "email": email,
            "password": password,
            "options": {
                "data": {
                    "full_name": full_name,
                }
            },
        }
    )

    return response


def login(
    email: str,
    password: str,
):
    response = supabase.auth.sign_in_with_password(
        {
            "email": email,
            "password": password,
        }
    )

    return response


def logout():
    return supabase.auth.sign_out()