#!/usr/bin/env python
"""Create 50 fictional development patient accounts in Supabase.

This script is intended for **local development only**. It uses the Supabase
Admin API with a service-role key, which must never be exposed to the browser
or committed to source control.

What it does
------------
1. Reads ``SUPABASE_URL`` and ``SUPABASE_SERVICE_ROLE_KEY`` (or
   ``SUPABASE_SECRET_KEY``) from ``backend/.env`` (or the process environment).
2. Creates Auth users ``patient001@example.com`` .. ``patient050@example.com``
   with the passwords ``DemoPatient001!`` .. ``DemoPatient050!``.
3. Creates a matching row in ``public.patients`` for every Auth user, linked
   through ``supabase_user_id`` and using the database defaults for ``id`` and
   ``created_at``.
4. Writes a private CSV of the development credentials for local testing.

Safety guarantees
-----------------
* Dry-run by default. Pass ``--apply`` to write anything.
* Idempotent: an existing mock account/profile is reused, never duplicated.
* Accounts are tagged in Supabase Auth metadata with
  ``medigurdian_mock_patient = true``. An existing user with the same email
  that does *not* carry this marker is treated as a conflict and is never
  modified.
* Existing accounts and profiles are never deleted.
* Secrets and generated passwords are never printed to the console.

Usage
-----
    # Validate configuration and show the plan without writing anything
    ..\\.venv\\Scripts\\python.exe create_mock_patients.py

    # Create the accounts and profiles
    ..\\.venv\\Scripts\\python.exe create_mock_patients.py --apply

    # Re-run to verify idempotency (no duplicate users or profiles are made)
    ..\\.venv\\Scripts\\python.exe create_mock_patients.py --apply
"""

from __future__ import annotations

import argparse
import csv
import os
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse


BACKEND_DIR = Path(__file__).resolve().parent
ENV_PATH = BACKEND_DIR / ".env"
DEFAULT_CSV_PATH = BACKEND_DIR / ".local" / "mock_patient_credentials.csv"
MOCK_MARKER = "medigurdian_mock_patient"
MOCK_INDEX = "mock_patient_index"
EXPECTED_COUNT = 50


# ---------------------------------------------------------------------------
# Fictional profile data
# ---------------------------------------------------------------------------

NAMES = (
    ("Aarav Sharma", "Male"),
    ("Ananya Iyer", "Female"),
    ("Rohan Mehta", "Male"),
    ("Diya Nair", "Female"),
    ("Vikram Reddy", "Male"),
    ("Sneha Kulkarni", "Female"),
    ("Arjun Banerjee", "Male"),
    ("Kavya Menon", "Female"),
    ("Aditya Joshi", "Male"),
    ("Priya Deshpande", "Female"),
    ("Rahul Verma", "Male"),
    ("Ishita Chatterjee", "Female"),
    ("Siddharth Rao", "Male"),
    ("Meera Pillai", "Female"),
    ("Nikhil Agarwal", "Male"),
    ("Riya Kapoor", "Female"),
    ("Karan Malhotra", "Male"),
    ("Pooja Gupta", "Female"),
    ("Harsh Patel", "Male"),
    ("Neha Shah", "Female"),
    ("Vivek Kumar", "Male"),
    ("Aisha Khan", "Female"),
    ("Manish Yadav", "Male"),
    ("Tanvi Bhat", "Female"),
    ("Abhishek Singh", "Male"),
    ("Shreya Ghosh", "Female"),
    ("Gaurav Saxena", "Male"),
    ("Anjali Mishra", "Female"),
    ("Rajesh Krishnan", "Male"),
    ("Divya Suresh", "Female"),
    ("Amit Chaudhary", "Male"),
    ("Ritika Pandey", "Female"),
    ("Suresh Naidu", "Male"),
    ("Lakshmi Venkatesh", "Female"),
    ("Pranav Desai", "Male"),
    ("Maya Thomas", "Female"),
    ("Yash Thakur", "Male"),
    ("Sakshi Jain", "Female"),
    ("Deepak Rana", "Male"),
    ("Nandini Bose", "Female"),
    ("Farhan Ali", "Male"),
    ("Isha Chawla", "Female"),
    ("Om Prakash", "Male"),
    ("Radhika Shetty", "Female"),
    ("Kabir Anand", "Male"),
    ("Simran Kaur", "Female"),
    ("Tarun Bhatia", "Male"),
    ("Vidya Raman", "Female"),
    ("Anil Prasad", "Male"),
    ("Trisha Roy", "Female"),
)

BLOOD_GROUPS = ("O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-")

LOCATIONS = (
    ("Bengaluru", "Karnataka", "560001"),
    ("Chennai", "Tamil Nadu", "600001"),
    ("Hyderabad", "Telangana", "500001"),
    ("Pune", "Maharashtra", "411001"),
    ("Mumbai", "Maharashtra", "400001"),
    ("Kolkata", "West Bengal", "700001"),
    ("New Delhi", "Delhi", "110001"),
    ("Ahmedabad", "Gujarat", "380001"),
    ("Jaipur", "Rajasthan", "302001"),
    ("Kochi", "Kerala", "682001"),
)

BUILDINGS = (
    "Rosewood Residency",
    "Lavender Heights",
    "Silver Oak Apartments",
    "Cedar Grove",
    "Palm Meadows",
    "Jasmine Court",
    "Bluebell Enclave",
    "Orchid Towers",
)


@dataclass(frozen=True)
class MockPatient:
    index: int
    full_name: str
    email: str
    password: str
    date_of_birth: str
    gender: str
    blood_group: str
    phone: str
    address: str


def build_mock_patients() -> list[MockPatient]:
    patients: list[MockPatient] = []

    for position, (name, gender) in enumerate(NAMES, start=1):
        index = position
        year = 1960 + ((index * 7) % 44)  # 1960 - 2003
        month = ((index * 5) % 12) + 1
        day = ((index * 11) % 28) + 1
        city, state, postcode = LOCATIONS[(index - 1) % len(LOCATIONS)]

        phone = f"+91 9{600000000 + index * 1234567:09d}"
        address = (
            f"{12 + index}, {BUILDINGS[(index - 1) % len(BUILDINGS)]}, "
            f"{city}, {state} {postcode}"
        )

        patients.append(
            MockPatient(
                index=index,
                full_name=name,
                email=f"patient{index:03d}@example.com",
                password=f"DemoPatient{index:03d}!",
                date_of_birth=f"{year:04d}-{month:02d}-{day:02d}",
                gender=gender,
                blood_group=BLOOD_GROUPS[(index - 1) % len(BLOOD_GROUPS)],
                phone=phone,
                address=address,
            )
        )

    return patients


MOCK_PATIENTS = build_mock_patients()


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Config:
    url: str
    service_role_key: str
    environment: str
    host: str


def load_config() -> Config | None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        print("ERROR: python-dotenv is not installed. Run: pip install -r requirements.txt")
        return None

    # Existing environment variables win over values in backend/.env.
    load_dotenv(ENV_PATH, override=False)

    url = os.getenv("SUPABASE_URL", "").strip()
    service_role_key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        or os.getenv("SUPABASE_SECRET_KEY", "").strip()
    )
    environment = os.getenv("ENVIRONMENT", "development").strip() or "development"

    if not url:
        print("ERROR: SUPABASE_URL is not configured in backend/.env.")
        return None

    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        print("ERROR: SUPABASE_URL is not a valid http(s) URL.")
        return None

    if not service_role_key:
        print("ERROR: SUPABASE_SERVICE_ROLE_KEY is not configured in backend/.env.")
        print("       Add the service-role key from Supabase Dashboard -> Project Settings -> API.")
        print("       Keep it in backend/.env only. Never add it to frontend/.env or any VITE_* value.")
        return None

    return Config(
        url=url.rstrip("/"),
        service_role_key=service_role_key,
        environment=environment,
        host=parsed.hostname,
    )


# ---------------------------------------------------------------------------
# Supabase helpers
# ---------------------------------------------------------------------------


def create_admin_client(config: Config):
    try:
        from supabase import create_client
    except ImportError:
        print("ERROR: supabase is not installed. Run: pip install -r requirements.txt")
        return None

    return create_client(config.url, config.service_role_key)


def list_all_auth_users(admin) -> list:
    users = []
    page = 1
    per_page = 200

    while True:
        batch = admin.list_users(page=page, per_page=per_page) or []
        users.extend(batch)

        if len(batch) < per_page:
            break

        page += 1

        if page > 100:  # defensive guard
            break

    return users


def user_metadata(user) -> dict:
    metadata = getattr(user, "user_metadata", None)
    return metadata if isinstance(metadata, dict) else {}


def app_metadata(user) -> dict:
    metadata = getattr(user, "app_metadata", None)
    return metadata if isinstance(metadata, dict) else {}


def is_mock_user(user) -> bool:
    return bool(
        user_metadata(user).get(MOCK_MARKER)
        or app_metadata(user).get(MOCK_MARKER)
    )


def get_user_id(user) -> str | None:
    value = getattr(user, "id", None)
    return str(value) if value else None


def fetch_profiles(client, auth_user_id: str) -> list[dict]:
    response = (
        client.table("patients")
        .select("id,supabase_user_id,full_name")
        .eq("supabase_user_id", auth_user_id)
        .execute()
    )
    return response.data or []


def create_auth_user(admin, patient: MockPatient):
    response = admin.create_user(
        {
            "email": patient.email,
            "password": patient.password,
            "email_confirm": True,
            "user_metadata": {
                MOCK_MARKER: True,
                MOCK_INDEX: patient.index,
                "full_name": patient.full_name,
            },
        }
    )

    user = getattr(response, "user", None)
    if user is None:
        raise RuntimeError("Supabase returned no user for the created account.")

    return user


def create_patient_profile(client, patient: MockPatient, auth_user_id: str) -> dict:
    payload = {
        "supabase_user_id": auth_user_id,
        "full_name": patient.full_name,
        "date_of_birth": patient.date_of_birth,
        "gender": patient.gender,
        "blood_group": patient.blood_group,
        "phone": patient.phone,
        "address": patient.address,
    }

    response = client.table("patients").insert(payload).execute()

    if not response.data:
        raise RuntimeError("Supabase returned no patient row after insert.")

    return response.data[0]


def verify_seed(client, records: list[dict]) -> tuple[bool, list[str]]:
    problems: list[str] = []

    if not records:
        return False, ["No mock accounts were resolved."]

    auth_ids = [record["user_id"] for record in records]

    response = (
        client.table("patients")
        .select("id,supabase_user_id,full_name")
        .in_("supabase_user_id", auth_ids)
        .execute()
    )
    rows = response.data or []

    by_user = Counter(str(row.get("supabase_user_id")) for row in rows)

    for record in records:
        count = by_user.get(str(record["user_id"]), 0)

        if count == 0:
            problems.append(f"{record['email']}: profile missing")
        elif count > 1:
            problems.append(f"{record['email']}: {count} duplicate profiles")

    return (not problems and len(records) == EXPECTED_COUNT), problems


def restrict_file_permissions(path: Path) -> None:
    """Restrict the credentials file to the current operating-system user."""
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass

    if os.name != "nt":
        return

    # On Windows os.chmod cannot express a full ACL. Remove inheritance and
    # grant the current account alone. Failures are non-fatal because the file
    # still lives inside the git-ignored backend/.local directory.
    username = os.environ.get("USERNAME")
    domain = os.environ.get("USERDOMAIN")

    if not username:
        return

    account = f"{domain}\\{username}" if domain else username

    try:
        import subprocess

        subprocess.run(
            [
                "icacls",
                str(path),
                "/inheritance:r",
                "/grant:r",
                f"{account}:F",
            ],
            check=False,
            capture_output=True,
            text=True,
        )
    except OSError:
        pass


def write_credentials_csv(path: Path, records: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["email", "password", "patient_name"])

        for record in sorted(records, key=lambda item: item["email"]):
            writer.writerow(
                [record["email"], record["password"], record["patient_name"]]
            )

    restrict_file_permissions(path)


# ---------------------------------------------------------------------------
# Main workflow
# ---------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed 50 fictional patient accounts in Supabase (development only).",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Create Auth users and patient profiles. Without this flag the script is a dry run.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Only validate that the required environment variables are configured.",
    )
    parser.add_argument(
        "--csv-path",
        type=Path,
        default=DEFAULT_CSV_PATH,
        help=f"Private credentials CSV path (default: {DEFAULT_CSV_PATH}).",
    )
    parser.add_argument(
        "--allow-production",
        action="store_true",
        help="Permit writes when ENVIRONMENT is not 'development'.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config = load_config()

    if config is None:
        print("\nNo data was written.")
        return 2

    print("Medigurdian AI - mock patient seeding")
    print(f"Supabase project host: {config.host}")
    print(f"Environment: {config.environment}")
    print(f"Planned accounts: {EXPECTED_COUNT}")
    print(f"Credentials CSV: {args.csv_path}")

    if config.environment.lower() not in {"development", "dev", "local", "test"}:
        print(f"WARNING: ENVIRONMENT is '{config.environment}', not a development value.")

    if args.check:
        print("Configuration check passed (URL and service-role key are present).")
        print("No data was written.")
        return 0

    if not args.apply:
        print("\nDRY RUN: no Auth users or patient rows will be created.")
        print("The first five accounts that would be ensured:")
        for patient in MOCK_PATIENTS[:5]:
            print(f"  - {patient.email}  ({patient.full_name})")
        print("  ...")
        print(f"  - {MOCK_PATIENTS[-1].email}  ({MOCK_PATIENTS[-1].full_name})")
        print("\nRe-run with --apply to create the accounts and profiles.")
        return 0

    if (
        config.environment.lower() not in {"development", "dev", "local", "test"}
        and not args.allow_production
    ):
        print(
            "ERROR: Refusing to write outside a development environment. "
            "Set ENVIRONMENT=development or pass --allow-production explicitly."
        )
        print("No data was written.")
        return 2

    client = create_admin_client(config)
    if client is None:
        return 2

    admin = client.auth.admin

    try:
        existing_users = list_all_auth_users(admin)
    except Exception as error:  # pragma: no cover - network dependent
        print(f"ERROR: Unable to list Auth users: {error}")
        print("No data was written.")
        return 2

    users_by_email = {
        str(getattr(user, "email", "")).lower(): user
        for user in existing_users
        if getattr(user, "email", None)
    }

    created_users = 0
    reused_users = 0
    created_profiles = 0
    existing_profiles = 0
    errors: list[str] = []
    resolved: list[dict] = []

    for patient in MOCK_PATIENTS:
        email = patient.email.lower()
        auth_user = users_by_email.get(email)

        try:
            if auth_user is None:
                auth_user = create_auth_user(admin, patient)
                users_by_email[email] = auth_user
                created_users += 1
                print(f"[auth+] {patient.email}")
            elif is_mock_user(auth_user):
                reused_users += 1
            else:
                errors.append(
                    f"{patient.email}: an Auth user already exists but is not marked "
                    "as a Medigurdian mock patient; it was left unchanged."
                )
                print(f"[skip] {patient.email} (existing non-mock user; not modified)")
                continue

            auth_user_id = get_user_id(auth_user)
            if not auth_user_id:
                raise RuntimeError("Auth user has no id.")

            profiles = fetch_profiles(client, auth_user_id)

            if len(profiles) > 1:
                errors.append(
                    f"{patient.email}: {len(profiles)} patient profiles already reference "
                    "this Auth UUID; no row was changed."
                )
                print(f"[warn] {patient.email} (duplicate profiles found)")
                continue

            if profiles:
                existing_profiles += 1
                profile = profiles[0]

                if profile.get("full_name") != patient.full_name:
                    print(
                        f"[warn] {patient.email}: existing profile name differs from the "
                        "seed name; profile left unchanged."
                    )
            else:
                profile = create_patient_profile(client, patient, auth_user_id)
                created_profiles += 1
                print(f"[profile+] {patient.email}")

            resolved.append(
                {
                    "email": patient.email,
                    "password": patient.password,
                    "patient_name": patient.full_name,
                    "user_id": auth_user_id,
                    "profile_id": profile.get("id"),
                }
            )

        except Exception as error:  # pragma: no cover - network dependent
            errors.append(f"{patient.email}: {error}")
            print(f"[error] {patient.email} (see summary)")

    print("\nSeed summary")
    print(f"  Auth users created:        {created_users}")
    print(f"  Existing Auth users reused: {reused_users}")
    print(f"  Patient profiles created:  {created_profiles}")
    print(f"  Existing profiles verified: {existing_profiles}")
    print(f"  Resolved mock records:     {len(resolved)}/{EXPECTED_COUNT}")
    print(f"  Errors:                    {len(errors)}")

    if errors:
        print("\nErrors (no secrets are shown):")
        for message in errors:
            print(f"  - {message}")

    complete, problems = verify_seed(client, resolved)

    if problems:
        print("\nVerification problems:")
        for problem in problems:
            print(f"  - {problem}")

    write_credentials_csv(args.csv_path, resolved)
    print(f"\nCredentials CSV written to: {args.csv_path}")
    print("Keep this file private. It is git-ignored and must never be committed.")

    if complete and not errors:
        print("\nVerification passed: 50 Auth accounts and 50 matching profiles are present.")
        print("Re-running this command is safe and will not create duplicates.")
        return 0

    print("\nVerification incomplete. Review the errors above; no existing data was deleted.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
