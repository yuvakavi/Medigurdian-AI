# Medigurdian AI

**Integrating Agentic AI and Retrieval-Augmented Generation for Secure and Personalized Healthcare Assistance and Intelligent Patient Management**

A full-stack healthcare platform with a FastAPI backend (LangGraph agent, MCP tools,
ChromaDB RAG, Supabase persistence) and a React patient portal styled with a
lavender-and-white clinical theme.

```
Medigurdian-AI/
├── backend/          FastAPI service — LangGraph agent, MCP tools, RAG, Supabase
├── frontend/         React + Vite + Tailwind CSS patient portal
├── docs/             Architecture, API, database and deployment notes
├── rag_data/         Curated clinical guidelines used by the RAG pipeline
└── chroma_db/        Persisted vector store
```

---

## Quick start

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt

# create backend/.env (see backend/.env.example or docs/deployment.md)
copy .env.example .env

uvicorn app.main:app --reload --port 8000
```

The API is then available at <http://127.0.0.1:8000> and the interactive docs at
<http://127.0.0.1:8000/docs>.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **<http://localhost:5173>**.

> Open the app through `localhost`, not `127.0.0.1`. The backend's CORS
> allow-list contains `http://localhost:5173`; using `127.0.0.1:5173` makes the
> browser preflight request fail.

---

## Environment variables

### `backend/.env`

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Browser-safe publishable key (server side) |
| `DATABASE_URL` | SQLAlchemy connection string for the legacy local models |
| `CORS_ORIGINS` | Allowed browser origin, e.g. `http://localhost:5173` |
| `UPLOAD_DIR` | Legacy local upload directory; medical reports use private Supabase Storage |
| `CHROMA_DIR` | ChromaDB persistence directory |
| `llm_provider` / `llm_model` | LLM backend selection |
| `REPORT_STORAGE_BUCKET` | Private Supabase Storage bucket for reports (default `medical-reports`) |
| `REPORT_MAX_FILE_SIZE_BYTES` | Report upload limit in bytes (default `10485760`, i.e. 10 MB) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key used by the optional mock-patient seeder and private report storage. Never expose it to the browser or commit it. |

### `frontend/.env`

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Backend API base URL including `/api`, e.g. `http://127.0.0.1:8000/api` |

No server secret (service-role key, database password) may ever be placed in a
`VITE_` variable — Vite inlines those into the client bundle.

---

## Optional demo patient accounts

`backend/create_mock_patients.py` creates 50 fictional Supabase Auth users
(`patient001@example.com` … `patient050@example.com`, passwords
`DemoPatient001!` … `DemoPatient050!`) and links each one to a row in
`public.patients` through `supabase_user_id`.

```bash
cd backend

# Dry run (default): lists what would be created, writes nothing
..\.venv\Scripts\python.exe create_mock_patients.py

# Verify whether the accounts already exist (also read-only)
..\.venv\Scripts\python.exe create_mock_patients.py --check

# Create the accounts and write the private credentials CSV
..\.venv\Scripts\python.exe create_mock_patients.py --apply

# Refuse to run against a non-development project unless explicitly allowed
..\.venv\Scripts\python.exe create_mock_patients.py --apply --allow-production
```

* Requires `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`) in
  `backend/.env`. Without it the script exits with a clear error and writes
  nothing.
* Idempotent and non-destructive: existing mock accounts are reused, and a
  same-email account that is **not** tagged as a mock user is never adopted.
* Credentials are written to `backend/.local/mock_patient_credentials.csv`,
  which is git-ignored. On Windows the script also restricts the file's ACL to
  the current user. Passwords are never stored in `public.patients`.
* `--apply` is required before any write happens.

The accounts are **not** created in this repository by default. If the
service-role key is absent, the seed must be treated as not performed.

---

## The patient portal

| Route | Purpose |
| --- | --- |
| `/login`, `/register` | Authentication with validation, password visibility toggle and error handling |
| `/` | Dashboard — real-data welcome summary, next appointment, prescriptions, billing, recent activity, onboarding when no patient profile exists |
| `/assistant` | Medigurdian AI chat over `POST /api/chat-sessions/ask` with streaming-free loading state, retry, suggestion chips and a medical disclaimer |
| `/doctors` | Searchable, filterable doctor directory with a detail view and booking entry point |
| `/appointments` | Upcoming / past lists, booking form with times derived from each doctor's published hours (server-confirmed), cancellation confirmation |
| `/reports` | Secure upload, history, details, authenticated preview/download and owner-only delete; private Supabase Storage bucket; AI explanation shown only when one exists |
| `/medicines` | Medicine catalogue with search and full detail (uses, warnings, contraindications) |
| `/prescriptions` | The patient's prescriptions with dosage, frequency, duration and prescribing clinician |
| `/billing` | Invoice table with totals, status filters, search and mobile card layout |
| `/emergency` | Prominent emergency guidance, warning signs and patient-scoped emergency records |
| `/profile` | Create the patient record on first use, then view it read-only (no update route exists) |
| `/settings` | Working theme switch, session info, backend connection test and the detected API surface |

Medical reports are implemented against the existing `public.medical_reports`
table and a private Supabase Storage bucket. Apply
`backend/migrations/20261023_medical_reports_storage.sql` once if the bucket is
missing, then set the server-only `SUPABASE_SERVICE_ROLE_KEY`. See
[`docs/reports.md`](docs/reports.md) for the storage, ownership and AI-state
details.

See [`frontend/README.md`](frontend/README.md) for the full frontend
documentation, the endpoint map and the list of features that still need
backend work.

---

## Documentation

| File | Contents |
| --- | --- |
| [`docs/architecture.md`](docs/architecture.md) | System design, request flow, agent graph |
| [`docs/api.md`](docs/api.md) | Complete REST reference with schemas |
| [`docs/database.md`](docs/database.md) | Supabase tables and relationships |
| [`docs/mcp.md`](docs/mcp.md) | MCP server and its tools |
| [`docs/rag.md`](docs/rag.md) | Retrieval pipeline, chunking and embedding strategy |
| [`docs/deployment.md`](docs/deployment.md) | Local setup and deployment notes |

---

## Security model

* Identity is managed by Supabase Auth and surfaced through the FastAPI
  `/api/auth/*` routes. The frontend never talks to Supabase directly.
* Every protected backend route verifies the bearer token and queries
  Supabase with that token attached, so **Row Level Security** scopes each
  query to the signed-in patient.
* The frontend stores only the access token in `localStorage`, sends it via an
  Axios interceptor, and clears the session on any `401`.
* No password, token or medical detail is logged to the browser console.
* The AI assistant is presented as informational support only. It never
  presents a confirmed diagnosis, and the emergency page always directs the
  user to local emergency services first.
