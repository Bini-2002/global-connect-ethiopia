from enum import Enum


class EventStatus(str, Enum):
    DRAFT = "draft"
    READY_TO_PUBLISH = "ready_to_publish"
    PUBLISHED = "published"
    PRIVATE_PUBLISHED = "private_published"
    LIVE = "live"
    COMPLETED = "completed"
    ARCHIVED = "archived"
    CANCELLED = "cancelled"


class VenueReservationStatus(str, Enum):
    PENDING = "pending"
    OFFERED_ALTERNATIVE = "offered_alternative"
    CONFIRMED = "confirmed"
    DECLINED = "declined"
    CANCELLED = "cancelled"


class BookingStatus(str, Enum):
    DISABLED = "disabled"
    OPEN = "open"
    CLOSED = "closed"
    FULL = "full"


class SurveyStatus(str, Enum):
    NOT_SENT = "not_sent"
    SCHEDULED = "scheduled"
    SENT = "sent"
    CLOSED = "closed"


class FinalReportStatus(str, Enum):
    NOT_STARTED = "not_started"
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
