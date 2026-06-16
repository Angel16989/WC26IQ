from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.settings import get_settings
from app.routes.fixtures import router as fixtures_router
from app.routes.health import router as health_router
from app.routes.predict import router as predict_router
from app.routes.simulate import router as simulate_router
from app.routes.teams import router as teams_router

settings = get_settings()

app = FastAPI(
    title="WorldCupIQ API",
    version=settings.api_version,
    description=(
        "Provider-backed API scaffold for a 2026 FIFA World Cup analytics and "
        "prediction product."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(teams_router)
app.include_router(fixtures_router)
app.include_router(predict_router)
app.include_router(simulate_router)
