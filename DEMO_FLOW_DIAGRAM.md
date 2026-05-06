# 🎪 Global Connect Ethiopia - Demo Flow Diagram

## Complete Event Lifecycle Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 0: GOVERNMENT APPROVAL                 │
│                         (Pre-Demo Setup)                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                   Government Approves
                   Proposal for Tech
                   Conference 2026
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: ORGANIZER CREATES EVENT             │
│                         (5 minutes)                              │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │  ORGANIZER   │
    │  LOGIN       │
    └──────┬───────┘
           │
           ├─→ organizer.demo@gce.local
           ├─→ OrganizerDemo@123
           │
    ┌──────▼──────────┐
    │ ORGANIZER SEES  │
    │  DASHBOARD      │
    └──────┬──────────┘
           │
    ┌──────▼──────────────────┐
    │  CLICK: MY PROPOSALS     │
    │  (/organizer/proposals)  │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ SELECT APPROVED          │
    │ PROPOSAL: Tech           │
    │ Conference 2026          │
    │ Status: ✅ APPROVED      │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ CLICK: CREATE EVENT      │
    │ (/create-event)          │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ FORM PRE-FILLED:         │
    │ • Title                  │
    │ • Description            │
    │ • Dates                  │
    │ • Category: conference   │
    │ • Expected: 150-200      │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ CLICK: CREATE EVENT      │
    │ [Button]                 │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ ✅ EVENT CREATED         │
    │ Status: DRAFT            │
    │ Event ID: tech-conf-001  │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ CLICK: PUBLISH EVENT     │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ ✅ EVENT PUBLISHED       │
    │ Status: PUBLISHED        │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ ENABLE BOOKING:          │
    │ • Max Attendees: 200     │
    │ • Booking Status: OPEN   │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ ✅ EVENT READY FOR       │
    │    BOOKING               │
    │ Status: LIVE             │
    └──────┬──────────────────┘
           │
           └─────────────────────────────────────┐
                                                  │
                                     PHASE 1 COMPLETE ✅
                                                  │
                    ┌─────────────────────────────┘
                    │
┌───────────────────▼───────────────────────────────────────────────┐
│                    PHASE 2: VENDOR DISCOVERS & NEGOTIATES          │
│                         (4 minutes)                                │
└──────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │  VENDOR      │
    │  LOGIN       │
    │  (NEW WINDOW)│
    └──────┬───────┘
           │
           ├─→ venue.provider.demo@gce.local
           ├─→ VendorDemo@123
           │
    ┌──────▼──────────────────┐
    │ VENDOR DASHBOARD         │
    │ (/vendor/dashboard)      │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ CLICK: BROWSE            │
    │ OPPORTUNITIES            │
    │ (/vendor/opportunities)  │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ 👀 VENDOR SEES:          │
    │ "Tech Conference 2026"   │
    │ • Status: LIVE           │
    │ • Date: [Show date]      │
    │ • Location: Addis Ababa  │
    │ • Expected Guests: 150+  │
    │ • Needs: Venue, Food...  │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ CLICK: EVENT CARD        │
    │ View Details             │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ CLICK: SEND SERVICE      │
    │ REQUEST                  │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ VENDOR PROPOSAL FORM:    │
    │ • Service: Venue Rental  │
    │ • Price: 120,000 ETB     │
    │ • Description: [Details] │
    │ • Timeline: [Event dates]│
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ CLICK: SUBMIT REQUEST    │
    │ [Button]                 │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ ✅ REQUEST SENT          │
    │ Status: PENDING          │
    │ Confirmation shown       │
    └──────┬──────────────────┘
           │
           └─────────────────────────────────────┐
                                                  │
                                     PHASE 2 COMPLETE ✅
                                                  │
                    ┌─────────────────────────────┘
                    │
┌───────────────────▼───────────────────────────────────────────────┐
│                    PHASE 3: ATTENDEE BOOKS EVENT                  │
│                         (4 minutes)                                │
└──────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │  ATTENDEE    │
    │  LOGIN       │
    │ (NEW WINDOW) │
    └──────┬───────┘
           │
           ├─→ attendee.demo@gce.local
           ├─→ AttendeeDemo@123
           │
    ┌──────▼──────────────────┐
    │ HOME PAGE                │
    │ (/)                      │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ 👀 ATTENDEE SEES:        │
    │ Published Events List    │
    │                          │
    │ 🎫 EVENT CARD:           │
    │ "Tech Conference 2026"   │
    │ • Status: LIVE ✅        │
    │ • Booking: OPEN 🔓       │
    │ • Date: [Show date]      │
    │ • "Book Now" Button      │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ CLICK: EVENT CARD        │
    │ View Full Details        │
    │ (/events/tech-conf-001)  │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ 📄 EVENT DETAILS:        │
    │ • Title                  │
    │ • Description            │
    │ • Date & Time            │
    │ • Location               │
    │ • Available Seats: 200   │
    │ • "Reserve Spot" Btn     │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ CLICK: RESERVE A SPOT    │
    │ [Button]                 │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ BOOKING FORM:            │
    │ • Full Name: Demo Att    │
    │ • Email: [Pre-filled]    │
    │ • Tickets: 1             │
    │ • [Other fields]         │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ CLICK: CONFIRM BOOKING   │
    │ [Button]                 │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ ✅ BOOKING SUCCESS!      │
    │                          │
    │ Booking Reference:       │
    │ BK-TCE-2026-001          │
    │                          │
    │ "View Your Booking"      │
    │ [Link/Button]            │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ CLICK: VIEW BOOKING      │
    │ Booking Details Page     │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ 🎫 BOOKING DETAILS:      │
    │ • Ref: BK-TCE-2026-001   │
    │ • Status: CONFIRMED ✅   │
    │ • Attendee Name          │
    │ • Event Details          │
    │                          │
    │ [QR CODE IMAGE] 🔲       │
    │ Download or View QR      │
    │ [Button]                 │
    └──────┬──────────────────┘
           │
           └─────────────────────────────────────┐
                                                  │
                                     PHASE 3 COMPLETE ✅
                                    (QR CODE READY!)
                                                  │
                    ┌─────────────────────────────┘
                    │
┌───────────────────▼───────────────────────────────────────────────┐
│                    PHASE 4: CHECK-IN VERIFICATION                 │
│                         (2 minutes)                                │
└──────────────────────────────────────────────────────────────────┘

    ┌──────────────────────┐
    │  BACK TO ORGANIZER   │
    │  WINDOW              │
    └──────┬───────────────┘
           │
    ┌──────▼──────────────────┐
    │ EVENT DETAIL PAGE        │
    │ (/organizer/events/...)  │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ CLICK: CHECK-IN          │
    │ Section / Button         │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ 📱 QR SCANNER VIEW:      │
    │                          │
    │ "Scan QR Code"           │
    │ Camera/Upload Option     │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ DISPLAY ATTENDEE'S QR    │
    │ CODE FROM PHASE 3        │
    │ (Show on phone/tablet)   │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ CLICK: SCAN / UPLOAD QR  │
    │ (Point camera at screen) │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ 🔍 SYSTEM VERIFIES QR    │
    │ • Decodes booking ref    │
    │ • Validates signature    │
    │ • Checks against DB      │
    └──────┬──────────────────┘
           │
    ┌──────▼──────────────────┐
    │ ✅ CHECK-IN SUCCESS!     │
    │                          │
    │ ATTENDEE VERIFIED:       │
    │ ┌──────────────────┐     │
    │ │ Demo Attendee    │     │
    │ │ Booking: BK-...  │     │
    │ │ Time: 14:32 UTC  │     │
    │ │ Status: CHECKED  │     │
    │ │         IN ✅    │     │
    │ └──────────────────┘     │
    │                          │
    │ [Next Attendee] Button   │
    └──────┬──────────────────┘
           │
           └─────────────────────────────────────┐
                                                  │
                                     PHASE 4 COMPLETE ✅
                                                  │
                                                  │
                                  🎉 DEMO COMPLETE! 🎉
                                                  │
```

---

## Role Comparison Table

```
┌──────────────┬──────────────────┬──────────────────┬─────────────────┐
│ ROLE         │ ORGANIZER        │ VENDOR           │ ATTENDEE        │
├──────────────┼──────────────────┼──────────────────┼─────────────────┤
│ Main Task    │ Create Event     │ Offer Services   │ Book Event      │
│ Can See      │ Own events       │ Opportunities    │ Published Events│
│             │ Vendors offering │ Own requests     │ Own bookings    │
│ Can Do       │ Create/Publish   │ Submit proposals │ Book/Cancel     │
│             │ event            │ Negotiate        │ View QR code    │
│             │ Manage booking   │ Sign contracts   │ Check-in        │
│             │ Check-in users   │                  │                 │
│ Dashboard    │ /organizer/      │ /vendor/         │ / (Home)        │
│             │ dashboard        │ dashboard        │                 │
│ Key Pages    │ proposals        │ opportunities    │ events          │
│             │ events           │ requests         │ bookings        │
│             │ create-event     │ contracts        │                 │
│             │                  │ services         │                 │
└──────────────┴──────────────────┴──────────────────┴─────────────────┘
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                      │
│                       (localhost:3000)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Organizer Dashboard   Vendor Dashboard   Attendee Home   │  │
│  │ Event Creation        Marketplace        Event Discovery │  │
│  │ Event Management      Service Listing    Booking        │  │
│  │ Check-in Portal       Negotiation        QR Display     │  │
│  └────────────┬───────────────────────────┬─────────────────┘  │
│               │                           │                    │
│               └──────────────┬─────────────┘                    │
│                              │                                 │
│                   API Calls with JWT Tokens                    │
│                              │                                 │
└──────────────────────────────┼─────────────────────────────────┘
                               │
┌──────────────────────────────▼─────────────────────────────────┐
│                        API GATEWAY                             │
│                    (localhost:8000)                            │
│                                                                │
│    /api/v1/events        /api/v1/vendors      /api/v1/users   │
│    /api/v1/bookings      /api/v1/requests     /api/v1/auth    │
│    /api/v1/organizers    /api/v1/catalog      /api/v1/...     │
│                                                                │
└──────────────────────────────┬─────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼──────┐     ┌─────────▼──────┐   ┌──────────▼────┐
│  MONGODB     │     │  Email Service │   │ Image Gen     │
│  Database    │     │  (Resend)      │   │ (QR, Pass)    │
│              │     │                │   │               │
│  Collections:│     │ OTP Emails     │   │ • QR Codes    │
│  • Users     │     │ Confirmations  │   │ • Check-in    │
│  • Events    │     │                │   │   Pass        │
│  • Bookings  │     │                │   │               │
│  • Vendors   │     │                │   │               │
│  • Contracts │     │                │   │               │
│  • etc.      │     │                │   │               │
└──────────────┘     └────────────────┘   └───────────────┘
```

---

## Data Flow: Booking to QR Code

```
ATTENDEE CREATES BOOKING
       │
       ▼
┌──────────────────┐
│ POST /bookings   │
│ {                │
│   event_id,      │
│   attendee_id,   │
│   num_tickets    │
│ }                │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│ Backend Creates:         │
│ • Booking Record         │
│ • Booking Reference      │
│ • Generate QR Value      │
│                          │
│ QR Value = hash(        │
│   booking_id +          │
│   event_id +            │
│   timestamp +           │
│   secret_key            │
│ )                       │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Return to Frontend:      │
│ {                        │
│   booking_id: "BK-...",  │
│   qr_value: "abc123",    │
│   reference: "BK-TCE...", │
│   status: "CONFIRMED"    │
│ }                        │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Frontend Calls:          │
│ GET /bookings/{id}/      │
│     qr-code              │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Backend Generates PNG:   │
│ • Creates QR image       │
│ • Embeds reference       │
│ • Returns PNG binary     │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Frontend Displays:       │
│ [QR CODE IMAGE] 🔲       │
│ Ref: BK-TCE-2026-001     │
│ Event: Tech Conf 2026    │
│ Attendee: Demo Attendee  │
└────────┬────────────────┘
         │
         ▼
ATTENDEE HAS DIGITAL TICKET ✅
```

---

## Key Features Highlighted in Demo

```
┌──────────────────────────────────────────────────────────┐
│              KEY SYSTEM FEATURES                         │
├──────────────────────────────────────────────────────────┤
│ ✅ Multi-Role Authentication (Organizer/Vendor/Attendee)│
│ ✅ Proposal to Event Workflow                          │
│ ✅ Event Lifecycle Management (Draft→Live→Completed)   │
│ ✅ Marketplace Discovery                               │
│ ✅ Vendor Negotiation                                  │
│ ✅ Booking System                                      │
│ ✅ Digital QR Tickets                                  │
│ ✅ Real-time Check-in Verification                     │
│ ✅ Role-Based Access Control                           │
│ ✅ Email Notifications                                 │
│ ✅ Contract Management                                 │
│ ✅ Event Team Collaboration                            │
└──────────────────────────────────────────────────────────┘
```

---

## Data Relationships

```
                    ORGANIZER
                       │
                       ├─→ PROPOSALS ──→ APPROVED ──→ EVENT
                       │                               │
                       ├──────────────────────────────►└─ BOOKINGS ◄─── ATTENDEE
                       │
                       └──► REQUESTS ◄─── VENDOR
                            │
                            └──► CONTRACTS
                                 (Signed by both)
```

---

**This diagram shows the complete end-to-end flow. Print it or keep it visible during the demo!**
