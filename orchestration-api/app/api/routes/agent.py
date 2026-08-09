from fastapi import APIRouter
from pydantic import BaseModel
from app.graph.noc_graph import run_noc_graph

router = APIRouter(prefix="/agent", tags=["agent"])


class AgentRequest(BaseModel):
    query: str
    user: str | None = None  # reserved for per-user context in future


@router.post("/query")
async def agent_query(payload: AgentRequest):
    result = await run_noc_graph(payload.query)
    return {"answer": result.get("answer", ""), "intent": result.get("intent")}
