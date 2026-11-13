from __future__ import annotations

import hashlib
import math
import os
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Protocol

EMBED_DIM = 256
_TOKEN = re.compile(r"[a-z0-9']+")


@dataclass(frozen=True)
class Notice:
    id: str
    title: str
    body: str
    published_at: datetime
    lines: tuple[str, ...] = ()
    synthetic: bool = True


class HashEmbedder:
    """
    Dependency-free lexical embedding (signed feature hashing over unigrams + bigrams).
    Same vector(256) column works with a real embedding model later: swap this class and re-index.
    """

    dim = EMBED_DIM

    def embed(self, text: str) -> list[float]:
        toks = _TOKEN.findall(text.lower())
        grams = toks + [f"{a}_{b}" for a, b in zip(toks, toks[1:])]
        vec = [0.0] * self.dim
        for g in grams:
            h = int.from_bytes(hashlib.blake2b(g.encode(), digest_size=8).digest(), "big")
            vec[h % self.dim] += 1.0 if (h >> 63) & 1 else -1.0
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]


class NoticeStore(Protocol):
    def search(self, query: str, k: int = 3, line: str | None = None) -> list[tuple[Notice, float]]: ...


@dataclass
class InMemoryNoticeStore:
    notices: list[Notice]
    embedder: HashEmbedder = field(default_factory=HashEmbedder)

    def __post_init__(self) -> None:
        self._vecs = [self.embedder.embed(f"{n.title}. {n.body}") for n in self.notices]

    def search(self, query: str, k: int = 3, line: str | None = None) -> list[tuple[Notice, float]]:
        q = self.embedder.embed(query)
        scored = [
            (n, sum(a * b for a, b in zip(q, v)))
            for n, v in zip(self.notices, self._vecs)
            if line is None or not n.lines or line in n.lines
        ]
        scored.sort(key=lambda t: (-t[1], -t[0].published_at.timestamp()))
        return scored[:k]


class PgVectorNoticeStore:
    """service_notices(embedding vector(256)); cosine distance via pgvector's <=> operator."""

    def __init__(self, dsn: str, embedder: HashEmbedder | None = None):
        self.dsn = dsn
        self.embedder = embedder or HashEmbedder()

    @staticmethod
    def _lit(vec: list[float]) -> str:
        return "[" + ",".join(f"{v:.6f}" for v in vec) + "]"

    def upsert(self, notices: list[Notice]) -> None:
        import psycopg

        with psycopg.connect(self.dsn) as conn, conn.cursor() as cur:
            for n in notices:
                cur.execute(
                    """INSERT INTO service_notices (id, title, body, published_at, lines, synthetic, embedding)
                       VALUES (%s,%s,%s,%s,%s,%s,%s::vector)
                       ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, body=EXCLUDED.body,
                         published_at=EXCLUDED.published_at, lines=EXCLUDED.lines,
                         synthetic=EXCLUDED.synthetic, embedding=EXCLUDED.embedding""",
                    (n.id, n.title, n.body, n.published_at, list(n.lines), n.synthetic,
                     self._lit(self.embedder.embed(f"{n.title}. {n.body}"))),
                )

    def search(self, query: str, k: int = 3, line: str | None = None) -> list[tuple[Notice, float]]:
        import psycopg

        qv = self._lit(self.embedder.embed(query))
        sql = """SELECT id, title, body, published_at, lines, synthetic, 1 - (embedding <=> %s::vector) AS score
                 FROM service_notices
                 WHERE (%s::text IS NULL OR cardinality(lines) = 0 OR %s = ANY(lines))
                 ORDER BY embedding <=> %s::vector LIMIT %s"""
        with psycopg.connect(self.dsn) as conn, conn.cursor() as cur:
            cur.execute(sql, (qv, line, line, qv, k))
            return [(Notice(i, t, b, p, tuple(ls), s), float(sc)) for i, t, b, p, ls, s, sc in cur.fetchall()]


def get_store() -> NoticeStore:
    from .seed_notices import SEED_NOTICES

    dsn = os.getenv("DATABASE_URL")
    if dsn:
        return PgVectorNoticeStore(dsn)
    return InMemoryNoticeStore(SEED_NOTICES)
