from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.router import api_router

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Medigurdian AI Healthcare Assistant API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(api_router)


@app.get("/")
def root():
    return {
        "message": "Medigurdian AI API is running",
        "status": "success",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }