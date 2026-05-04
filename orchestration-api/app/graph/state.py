from typing import TypedDict, Literal


class NOCState(TypedDict, total=False):
    query: str
    intent: Literal['finops', 'health', 'general']
    answer: str
    incident_id: str
    metadata: dict
