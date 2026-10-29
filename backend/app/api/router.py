from fastapi import APIRouter

from app.api.auth import router as auth_router

from app.api.patients import router as patients_router

from app.api.doctors import router as doctors_router

from app.api.appointments import router as appointments_router

from app.api.medicines import router as medicines_router

from app.api.prescriptions import router as prescriptions_router

from app.api.chat import router as chat_router

from app.api.emergency import router as emergency_router

from app.api.billing import router as billing_router

from app.api.reports import router as reports_router


api_router = APIRouter(prefix="/api")


api_router.include_router(auth_router)

api_router.include_router(patients_router)

api_router.include_router(doctors_router)

api_router.include_router(appointments_router)

api_router.include_router(medicines_router)

api_router.include_router(prescriptions_router)

api_router.include_router(chat_router)

api_router.include_router(emergency_router)

api_router.include_router(billing_router)

api_router.include_router(reports_router)