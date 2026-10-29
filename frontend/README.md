# Medigurdian AI — Frontend

Patient portal for **Medigurdian AI: Integrating Agentic AI and Retrieval-Augmented
Generation for Secure and Personalized Healthcare Assistance and Intelligent Patient
Management**.

React + Vite + Tailwind CSS frontend that talks to the FastAPI backend in
`../backend`.

---

## Stack

| Concern | Choice |
| --- | --- |
| Build tool | Vite 6 |
| UI library | React 18 + React Router DOM 6 |
| Styling | Tailwind CSS 3.4 (theme tokens via CSS variables) |
| HTTP | Axios (single shared instance) |
| Icons | Lucide React |
| Charts | Recharts |
| Language | JavaScript (JSX) |

---

## Getting started

```bash
cd frontend
npm install
cp .env.example .env      # optional — the default points at the local backend
npm run dev
```

The app is served at **http://localhost:5173**.

> **Use `localhost`, not `127.0.0.1`.** The backend's CORS allow-list
> (`CORS_ORIGINS` in `backend/.env`) contains `http://localhost:5173`. Opening
> the app through `127.0.0.1:5173` makes the browser preflight fail. The Vite
> dev server is configured with `host: 'localhost'` for exactly this reason.

### Environment

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Base URL of the FastAPI API, **including** the `/api` prefix | `http://127.0.0.1:8000/api` |

```bash
# frontend/.env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

Only browser-safe values belong in a `VITE_` variable. The Supabase publishable
key, the database URL and every other server secret stay in `backend/.env`.

### Scripts

```bash
npm run dev       # development server on http://localhost:5173
npm run build     # production build into dist/
npm run preview   # serve the production build locally
```

---

## Project structure

```
frontend/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example
└── src/
    ├── main.jsx                 # React entry point
    ├── App.jsx                  # Providers + routes + route guards
    ├── index.css                # Tailwind layers + theme tokens
    ├── components/
    │   ├── common/              # Button, Card, Input, Select, Textarea, Modal,
    │   │                        # Badge, StatusBadge, ErrorState, EmptyState,
    │   │                        # Skeleton, Spinner, Drawer, PageHeader,
    │   │                        # SectionHeading, MedicalDisclaimer
    │   ├── layout/              # AppLayout, Sidebar, Topbar, Logo
    │   ├── dashboard/           # StatCard, UpcomingAppointmentCard,
    │   │                        # BillingSummary, BillingTrendChart,
    │   │                        # RecentActivity, QuickActions
    │   ├── doctors/             # DoctorCard, DoctorFilters, DoctorDetailModal
    │   ├── appointments/        # AppointmentCard, AppointmentForm
    │   └── chat/                # ChatMessage, ChatComposer, SuggestionChips
    ├── pages/                   # One file per route
    ├── services/                # One module per backend resource
    ├── hooks/                   # useAsync, useDoctorDirectory, useApiCapabilities
    ├── context/                 # AuthContext, ToastContext, ThemeContext
    └── utils/                   # format, normalize, slots, validators
```

---

## Backend endpoints used

Every request is sent with `Authorization: Bearer <access_token>`, where the
token is the Supabase JWT issued by the backend's `/api/auth/login` and
`/api/auth/signup` routes.

| Page | Method + path | Notes |
| --- | --- | --- |
| Login | `POST /api/auth/login` | `{ email, password }` |
| Register | `POST /api/auth/signup` | `{ email, password }` |
| Session restore | `GET /api/auth/me` | Validates the stored token on load |
| Logout | `POST /api/auth/logout` | Also clears the local session |
| Profile | `GET /api/patients/me`, `POST /api/patients/profile` | Create on first use; no update route exists |
| Dashboard | `GET /api/appointments/me`, `GET /api/billing/`, `GET /api/prescriptions/me` | Composed client-side |
| Doctors | `GET /api/doctors`, `GET /api/doctors/{id}` | Rows are mapped defensively (see below) |
| Appointments | `POST /api/appointments`, `GET /api/appointments/me`, `DELETE /api/appointments/{id}` | |
| Medical Reports | `POST /api/reports/upload`, `GET /api/reports/me`, `GET /api/reports/{id}`, `GET /api/reports/{id}/download`, `DELETE /api/reports/{id}` | Multipart upload; authenticated private file stream; owner-only access |
| Billing | `GET /api/billing/` | Returns `{ success, message, patient_id, billing[] }` |
| Medicines | `GET /api/medicines`, `GET /api/medicines/{id}` | |
| Prescriptions | `GET /api/prescriptions/me` | |
| Emergency | `GET/POST /api/emergency`, `PUT /api/emergency/{id}/status?status=`, `DELETE /api/emergency/{id}` | |
| AI Assistant | `POST /api/chat-sessions/ask?question=...` | `question` is a **query** parameter |
| Capability probe | `GET /openapi.json` | Used to detect which routes are actually mounted |
| Health check | `GET /health` | Settings → "Test connection" |

### Route availability is detected, not assumed

`backend/app/api/symptoms.py` and `admin.py` exist but their routers are **not
registered** in `backend/app/api/router.py`, so those routes are not served.
Rather than calling an endpoint that does not exist, the frontend reads the live
OpenAPI document (`services/capabilitiesService.js`) and adapts:

* **Settings → Detected API surface** lists the routes the backend is actually
  serving.
* The Medical Reports page now calls its routes directly; those routes are
  registered and do not use capability gating.

### Defensive doctor mapping

`GET /api/doctors` returns raw Supabase rows (`select("*")`), so the column
set depends on the database schema. `utils/normalize.js` maps a range of
possible column names onto a stable UI shape and omits any attribute the
backend did not return. Nothing is invented and no doctor UUID is hardcoded.

---

## Features that require further backend work

| Feature | Status | What's missing |
| --- | --- | --- |
| Patient profile creation | Implemented | `POST /api/patients/profile` creates the record on first use. |
| Patient profile editing | Not implemented | No `PUT/PATCH /api/patients/me` route exists; after creation the screen is read-only. |
| Appointment rescheduling | Routed through the AI Assistant | The REST API exposes no reschedule route. The assistant can reschedule via the backend's MCP `reschedule_appointment` tool, so the "Reschedule" action hands the request to the assistant. |
| Payment / invoice settlement | Not implemented | No payment endpoint exists, so invoices are read-only. |
| Medical report upload & history | Implemented | Authenticated upload, history, details, preview, download and owner-only delete via private Supabase Storage. AI explanations remain unavailable until a real pipeline writes `ai_analysis`. |
| Symptom checker | Not present | The `symptoms` router is not registered either. |
| Notifications | Not present | No notifications endpoint; no bell icon is shown. |

---

## Design system

| Token | Value |
| --- | --- |
| Primary | Lavender `#6F5A98` (hover `#5C4A80`) |
| Secondary | Lavender `#8B7BB5` |
| Pale wash | `#F7F4FC` / `#EEE8F7` |
| Accent | Muted emerald `#568F6C` / amber `#C8912E` / rose `#D45A5A` |
| Canvas | `#F7F4FC` (light) · `#16131E` (dark) |
| Surface | `#FFFFFF` (light) · `#201B2B` (dark) |
| Border | `#E7E1EF` (light) · `#382F49` (dark) |
| Text | `#292536` (light) · `#F4F1F9` (dark) |

The palette is centralised in `tailwind.config.js`. Legacy `navy` and `teal`
class names are aliased to the lavender scale so existing components inherit
the theme without duplicating colour values. Neutrals are exposed as CSS custom
properties in `src/index.css`, so the light/dark switch in Settings is a real,
working control that persists to `localStorage`. Typography uses Inter for body
text and Plus Jakarta Sans for headings.

---

## Safety and security notes

* No secret is ever bundled into the frontend — only `VITE_API_BASE_URL`.
* Tokens live in `localStorage` and are attached by the Axios interceptor; a
  `401` clears the session and returns the user to the login screen.
* Every list is scoped by the backend to the authenticated patient
  (Supabase RLS); the frontend never filters or fabricates patient data.
* Passwords, tokens and medical details are never logged to the console.
* Every AI surface carries a medical disclaimer and states that the assistant
  is not a substitute for professional care or emergency services.

---

## Verification performed

* `npm run build` — production build succeeds (Vite 6.4.3).
* `python -m pytest app/tests -q` — 33 backend tests pass; the report suite
  alone runs 29 tests.
* `python -m compileall app` — passes.
* Report API verification used real Supabase Auth and private Storage: upload,
  list, details, preview, download, cross-account isolation and owner delete all
  passed, with zero report rows and zero bucket objects left behind.
* UI states were checked at 390 px, 768 px and 1440 px with a temporary
  Playwright script (empty, loading, error/retry, validation, selected file,
  list, details, preview, download and delete confirmation). No browser test
  runner is part of the project; `package.json` exposes only `dev`, `build` and
  `preview`.
* Local verification used existing optional mock accounts only. It did not seed
  or modify patient records.
