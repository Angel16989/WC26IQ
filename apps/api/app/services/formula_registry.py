from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
import json
from pathlib import Path
from typing import Any

from app.core.settings import get_settings

FORMULA_TYPE = "worldcupiq-match-probability-v1"
REQUIRED_WEIGHTS = {
    "strength",
    "form",
    "squad",
    "recent",
    "home_advantage",
    "draw_band",
    "goal_scale",
}
WEIGHT_LIMITS = {
    "strength": (0.0, 1.2),
    "form": (0.0, 1.0),
    "squad": (0.0, 1.0),
    "recent": (0.0, 1.0),
    "home_advantage": (0.0, 8.0),
    "draw_band": (0.05, 0.5),
    "goal_scale": (0.5, 1.8),
}


@dataclass(frozen=True)
class ApprovedFormula:
    version: str
    quality_score: float
    weights: dict[str, float]
    source: str
    notes: tuple[str, ...]


def load_approved_formula(path: Path | None = None) -> ApprovedFormula | None:
    settings = get_settings()
    formula_path = path or settings.approved_formula_path
    if not formula_path.is_file():
        return None

    try:
        payload = json.loads(formula_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None

    return _parse_formula(payload, min_score=settings.approved_formula_min_score)


def _parse_formula(payload: Any, *, min_score: float) -> ApprovedFormula | None:
    if not isinstance(payload, dict):
        return None

    if payload.get("formulaType") != FORMULA_TYPE:
        return None

    if str(payload.get("status", "")).lower() != "approved":
        return None

    approved_by = str(payload.get("approvedBy", "")).lower()
    if "deepseek" not in approved_by:
        return None

    quality_score = _read_float(payload.get("qualityScore"))
    if quality_score is None or quality_score < min_score:
        return None

    if _is_expired(payload.get("expiresAt")):
        return None

    raw_weights = payload.get("weights")
    if not isinstance(raw_weights, dict):
        return None

    weights: dict[str, float] = {}
    for name in REQUIRED_WEIGHTS:
        value = _read_float(raw_weights.get(name))
        if value is None:
            return None

        lower, upper = WEIGHT_LIMITS[name]
        if value < lower or value > upper:
            return None
        weights[name] = value

    notes = payload.get("notes", [])
    safe_notes = tuple(str(note)[:220] for note in notes[:4]) if isinstance(notes, list) else ()

    return ApprovedFormula(
        version=str(payload.get("version", "deepseek-approved-formula")),
        quality_score=quality_score,
        weights=weights,
        source="deepseek-approved",
        notes=safe_notes,
    )


def _read_float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _is_expired(value: Any) -> bool:
    if value is None or not str(value).strip():
        return False

    raw_value = str(value).strip().replace("Z", "+00:00")
    try:
        expires_at = datetime.fromisoformat(raw_value)
    except ValueError:
        return True

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)

    return expires_at <= datetime.now(UTC)
