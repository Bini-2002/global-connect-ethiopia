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


class TicketingStatus(str, Enum):
    DISABLED = "disabled"
    CONFIGURED = "configured"
    SALES_LIVE = "sales_live"
    SALES_CLOSED = "sales_closed"


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
