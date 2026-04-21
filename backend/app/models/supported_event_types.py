from __future__ import annotations

SUPPORTED_EVENT_TYPES: tuple[str, ...] = (
    "conference",
    "summit_forum",
    "workshop_training",
    "expo_trade_fair",
    "networking_gala",
)


EVENT_TYPE_ALIASES: dict[str, str] = {
    "conference": "conference",
    "summit": "summit_forum",
    "forum": "summit_forum",
    "summit_forum": "summit_forum",
    "summit forum": "summit_forum",
    "workshop": "workshop_training",
    "training": "workshop_training",
    "seminar": "workshop_training",
    "workshop_training": "workshop_training",
    "workshop training": "workshop_training",
    "expo": "expo_trade_fair",
    "trade_fair": "expo_trade_fair",
    "trade fair": "expo_trade_fair",
    "exhibition": "expo_trade_fair",
    "expo_trade_fair": "expo_trade_fair",
    "expo trade fair": "expo_trade_fair",
    "networking": "networking_gala",
    "gala": "networking_gala",
    "networking_gala": "networking_gala",
    "networking gala": "networking_gala",
}


EVENT_TYPE_DESCRIPTIONS: dict[str, str] = {
    "conference": "Multi-session professional conference.",
    "summit_forum": "Policy, diplomatic, investment, or executive forum.",
    "workshop_training": "Training, seminar, bootcamp, or certification event.",
    "expo_trade_fair": "Exhibition, trade fair, or product showcase.",
    "networking_gala": "Formal networking, awards, or hosted business reception.",
}


def normalize_supported_event_type(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower().replace("-", "_")
    if not normalized:
        return None
    return EVENT_TYPE_ALIASES.get(normalized)
