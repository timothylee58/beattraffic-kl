from fastapi import FastAPI
from app.api.routes.agent import router as agent_router
from app.api.routes.webhook import router as webhook_router
from app.api.routes.health import router as health_router
from app.api.routes.crowd_prediction import router as crowd_router

app = FastAPI(title='Orchestration API', version='0.1.0')
app.include_router(agent_router)
app.include_router(webhook_router)
app.include_router(health_router)
app.include_router(crowd_router)
