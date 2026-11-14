export const AUTO = "__auto__";
export const NONE = "__none__";
export const DEFAULT_QUESTION = "the line is down, how do I still get to KLCC by 9am?";
// Simulated gate readings for the "event crowd" toggle: there is no live tap-in feed connected yet.
export const EVENT_STATIONS = ["klcc", "ampang_park", "persiaran_klcc"] as const;
export const EVENT_SIGNAL = { crowd_t15: 2, tap_t15: 0.92 } as const;
