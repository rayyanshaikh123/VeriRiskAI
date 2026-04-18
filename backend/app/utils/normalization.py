from __future__ import annotations


def clamp01(value: float) -> float:
    """Clamp numeric values to the [0, 1] range."""
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(1.0, numeric))
