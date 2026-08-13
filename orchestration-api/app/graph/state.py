from typing import TypedDict, Literal


class NOCState(TypedDict, total=False):
    query: str
    intent: Literal["finops", "health", "general", "mobility"]
    answer: str
    # Mobility-specific fields (set by the mobility_planner node)
    parking_results: list          # list of Carpark dicts
    crowd_context: dict            # crowd forecast for nearest station
    transit_context: list          # OTP itineraries or fallback routes
    # Metadata fields (for future tracing / incident correlation)
    incident_id: str
    metadata: dict
