```mermaid
usecaseDiagram
actor "Government Officials" as GO
actor Police as P
actor Organizer as O
actor Vendor as V
actor Attendee as A
actor Admin as ADM
actor "Team Member" as TM

GO --> (Review and Approve Proposal)
GO --> (Issue Event Permit)
GO --> (Assign Security Plan)
GO --> (Inspect Compliance)
GO --> (Generate Reports and Analytics)

P --> (Assign Security Plan)
P --> (Inspect Compliance)
P --> (Monitor Incident Response)

O --> (Submit Event Proposal)
O --> (Publish Event Listing)
O --> (Manage Event Schedule)
O --> (Check In Attendee)
O --> (Manage Payments)

V --> (Register Vendor)
V --> (Publish Event Listing)
V --> (Submit Offer or Quotation)
V --> (Manage Payments)

A --> (Browse Events)
A --> (Book Ticket or Slot)
A --> (Check In Attendee)

ADM --> (Manage Payments)
ADM --> (Generate Reports and Analytics)

TM --> (Manage Event Schedule)
TM --> (Monitor Incident Response)
TM --> (Generate Reports and Analytics)
```
