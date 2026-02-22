from enum import Enum

class UserRole(str, Enum):
    ADMIN = 'admin'
    ORGANIZER = 'organizer'
    VENDOR = 'vendor'
    MINISTRY_GOV = 'ministry_gov'
    MUNICIPAL_GOV = 'municipal_gov'
    ATTENDEE = 'attendee'