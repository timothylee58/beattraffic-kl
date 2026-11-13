# Minutes of travel time that a route's worst-station crowd risk (max p_high, 0..1) is worth.
CROWD_MIN_EQUIV = 10.0
LABELS = ("Low", "Moderate", "High")


def effective_minutes(total_minutes: float, crowd_score: float | None) -> float:
    return total_minutes + (CROWD_MIN_EQUIV * crowd_score if crowd_score is not None else 0.0)
