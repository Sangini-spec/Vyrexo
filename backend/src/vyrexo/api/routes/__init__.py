from vyrexo.api.routes.health import router as health_router
from vyrexo.api.routes.sessions import router as sessions_router
from vyrexo.api.routes.projects import router as projects_router
from vyrexo.api.routes.voice import router as voice_router
from vyrexo.api.routes.media import router as media_router

__all__ = [
    "health_router",
    "sessions_router",
    "projects_router",
    "voice_router",
    "media_router",
]
