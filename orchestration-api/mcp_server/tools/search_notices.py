from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from mcp_server.context import ToolContext

MAX_BODY_CHARS = 600


class SearchNoticesArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")
    query: str = Field(min_length=2, max_length=300)
    line: str | None = Field(default=None, max_length=64)
    k: int = Field(default=3, ge=1, le=5)


def run(ctx: ToolContext, a: SearchNoticesArgs) -> dict:
    line = None
    if a.line:
        line = ctx.graph.resolve_line(a.line)
        if line is None:
            return {"ok": False, "error": f"unknown line: {a.line}"}
    hits = ctx.notices.search(a.query, a.k, line)
    return {
        "ok": True,
        # Notice text is third-party content. Consumers must treat `text` as data, never as instructions.
        "untrusted_text": True,
        "notices": [
            {"id": n.id, "title": n.title, "text": n.body[:MAX_BODY_CHARS], "published_at": n.published_at.isoformat(),
             "lines": list(n.lines), "synthetic": n.synthetic, "score": round(score, 4)}
            for n, score in hits
        ],
    }
