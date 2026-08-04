import time
import uuid

from fastapi import FastAPI, Request
from app.api.routes.agent import router as agent_router
from app.api.routes.webhook import router as webhook_router
from app.api.routes.health import router as health_router
from app.api.routes.crowd_prediction import router as crowd_router
from app.api.routes.crowd_prediction_daily import router as crowd_daily_router
from app.api.routes.analytics import router as analytics_router

app = FastAPI(title='Orchestration API', version='0.1.0')
app.include_router(agent_router)
app.include_router(webhook_router)
app.include_router(health_router)
app.include_router(crowd_router)
app.include_router(crowd_daily_router)
app.include_router(analytics_router)


@app.middleware('http')
async def record_request(request: Request, call_next):
    import datetime
    from app.analytics import track
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    request_id = request.headers.get('x-request-id') or uuid.uuid4().hex
    await track('api_requests', {
        'request_time': datetime.datetime.utcnow(),
        'method': request.method,
        'path': request.url.path,
        'status_code': response.status_code,
        'duration_ms': round(duration_ms, 2),
        'request_id': request_id,
    })
    return response
