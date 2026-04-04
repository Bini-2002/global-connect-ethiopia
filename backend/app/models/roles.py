from enum import Enum

class UserRole(str, Enum):
    SUPER_ADMIN = 'super_admin'
    ADMIN = 'admin'
    ORGANIZER = 'organizer'
    VENDOR = 'vendor'
    MINISTRY_GOV = 'ministry_gov'
    MUNICIPAL_GOV = 'municipal_gov'
    POLICE = 'police'
    ATTENDEE = 'attendee'


ROLE_ALIASES: dict[str, UserRole] = {
    "super_admin": UserRole.SUPER_ADMIN,
    "superadmin": UserRole.SUPER_ADMIN,
    "super admin": UserRole.SUPER_ADMIN,
    "admin": UserRole.ADMIN,
    "administrator": UserRole.ADMIN,
    "organizer": UserRole.ORGANIZER,
    "vendor": UserRole.VENDOR,
    "ministry_gov": UserRole.MINISTRY_GOV,
    "ministry": UserRole.MINISTRY_GOV,
    "ministry gov": UserRole.MINISTRY_GOV,
    "municipal_gov": UserRole.MUNICIPAL_GOV,
    "municipal": UserRole.MUNICIPAL_GOV,
    "municipality": UserRole.MUNICIPAL_GOV,
    "municipal gov": UserRole.MUNICIPAL_GOV,
    "police": UserRole.POLICE,
    "attendee": UserRole.ATTENDEE,
}


def normalize_role(role: str | UserRole | None) -> str | None:
    if role is None:
        return None
    if isinstance(role, UserRole):
        return role.value

    normalized = role.strip().lower().replace("-", "_")
    if not normalized:
        return None

    aliased = ROLE_ALIASES.get(normalized)
    return aliased.value if aliased else normalized


def to_user_role(role: str | UserRole | None) -> UserRole | None:
    normalized = normalize_role(role)
    if not normalized:
        return None
    try:
        return UserRole(normalized)
    except ValueError:
        return None
