"""
ARQ worker — INDXR.AI

Draait als aparte Railway service naast de FastAPI API-service.
Start: python -m arq worker.WorkerSettings

Fase 1: alleen stub (noop_task). Fase 2 voegt run_whisper_job toe,
Fase 3 voegt run_playlist_job toe.
"""

import os
from arq.connections import RedisSettings


async def noop_task(ctx: dict) -> str:
    """Fase 1 stub — verifieer dat worker jobs oppikt uit de queue."""
    return "ok"


class WorkerSettings:
    functions = [noop_task]
    redis_settings = RedisSettings.from_dsn(
        os.environ["UPSTASH_REDIS_URL"]
    )
    # Geen max_jobs limiet in Fase 1 — jobs zijn sequentieel per playlist
    # (rate limiting van YouTube), maar de worker mag meerdere Whisper-jobs parallel.
    # Wordt geconfigureerd in Fase 2/3 wanneer echte jobs worden toegevoegd.
