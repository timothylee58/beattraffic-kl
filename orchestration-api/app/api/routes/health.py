from fastapi import APIRouter

router = APIRouter(prefix='/health', tags=['health'])


@router.get('/summary')
def health_summary():
    return {
        'status': 'DEGRADED',
        'open_incidents': 2,
        'regions': {'APAC': 'Nominal', 'EMEA': 'Latency Elevated', 'AMER': 'Nominal'},
    }
