from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.settings import get_settings
from app.routes.admin import router as admin_router
from app.routes.fixtures import router as fixtures_router
from app.routes.knockout import router as knockout_router
from app.routes.matches import router as matches_router
from app.routes.health import router as health_router
from app.routes.predict import router as predict_router
from app.routes.simulate import router as simulate_router
from app.routes.teams import router as teams_router

settings = get_settings()

_is_production = settings.environment == "production"

app = FastAPI(
    title="WorldCupIQ API",
    version=settings.api_version,
    description=(
        "Provider-backed API scaffold for a 2026 FIFA World Cup analytics and "
        "prediction product."
    ),
    # Disable interactive docs in production to avoid leaking schema details.
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Accept"],
)

app.include_router(health_router)
app.include_router(admin_router)
app.include_router(knockout_router)
app.include_router(matches_router)
app.include_router(teams_router)
app.include_router(fixtures_router)
app.include_router(predict_router)
app.include_router(simulate_router)
