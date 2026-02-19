from enum import Enum

class UserRole(str, Enum):
    ADMIN = 'admin'
    ORGANIZER = 'organizer'
    VENDOR = 'vendor'
    GOVERNMENT = 'government'
    ATTENDEE = 'attendee'