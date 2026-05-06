# 🎯 Global Connect Ethiopia - Live Demonstration Guide

**Project**: Global Connect Ethiopia Event Management Platform  
**Date**: May 6, 2026  
**Demo Duration**: 15-20 minutes  
**Target Audience**: Advisors, Stakeholders

---

## 📋 Pre-Demo Setup (Do This BEFORE the Presentation)

### Step 1: Prepare Your Environment

**Backend:**
```bash
# Navigate to backend folder
cd backend

# Activate Python environment
# Windows CMD:
venv\Scripts\activate.bat
# OR Windows PowerShell:
.\venv\Scripts\Activate.ps1

# Start the backend server
uvicorn app.main:app --reload
```
✅ Backend should run at: `http://localhost:8000`  
📚 API Docs: `http://localhost:8000/docs`

**Frontend:**
```bash
# In a NEW terminal, navigate to frontend folder
cd frontend

# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```
✅ Frontend should run at: `http://localhost:3000`

**MongoDB:**
- Ensure MongoDB is running locally OR your Atlas connection string is configured
- Backend `.env` should have: `MONGODB_URL=mongodb://localhost:27017` (or your Atlas URL)
- Database name: `global_connect_ethiopia`

### Step 2: Seed Demo Data (IMPORTANT!)

Run the vendor seeding script to create demo vendors:
```bash
# From backend folder, with virtual environment activated
python scripts/seed_demo_vendors.py
```

This creates:
- ✅ **Venue Provider Demo** - venue.provider.demo@gce.local
- ✅ **Catering Provider Demo** - catering.provider.demo@gce.local  
- ✅ **Decor Provider Demo** - decor.provider.demo@gce.local

### Step 3: Create Approved Proposal (Admin Setup)

You'll need an **approved proposal** to demonstrate the organizer flow. Here's how to set it up:

**Option A: Via Frontend Admin Panel**
1. Go to `http://localhost:3000/admin`
2. Log in with admin credentials (check `.env` for admin credentials)
3. Navigate to Proposals section
4. Create a new proposal and mark it as APPROVED

**Option B: Via API (Postman/Thunder Client)**
Use the Postman collection at: `backend/postman/organizer-verification-flow.postman_collection.json`

---

## 🎬 THE MAIN DEMO FLOW: "Tech Conference 2026"

### 📌 Demo Scenario Overview

We're demonstrating the **complete lifecycle** of organizing a tech conference:

```
Government Approves Proposal 
    ↓
Organizer Creates Event from Proposal
    ↓
Organizer Publishes Event
    ↓
Vendors Review Event & Offer Services
    ↓
Attendee Discovers & Books Event
    ↓
QR Code Generated for Check-in
    ↓
Staff Scans QR for Check-in
```

---

## 🔑 DEMO CREDENTIALS

Have these ready in a notepad during presentation:

### Organizer
```
Email: organizer.demo@gce.local
Password: OrganizerDemo@123
Role: Organizer
```

### Vendors (Pre-seeded)
```
Venue Provider:
  Email: venue.provider.demo@gce.local
  Password: VendorDemo@123

Catering Provider:
  Email: catering.provider.demo@gce.local
  Password: VendorDemo@123
```

### Attendee
```
Email: attendee.demo@gce.local
Password: AttendeeDemo@123
Role: Attendee
```

---

## 🎯 STEP-BY-STEP DEMONSTRATION

### **PHASE 1: Organizer Creates Event (5 minutes)**

#### Step 1.1: Login as Organizer

1. Open `http://localhost:3000`
2. Click **"Login"** (or go to `/login`)
3. Enter:
   - Email: `organizer.demo@gce.local`
   - Password: `OrganizerDemo@123`
4. Click **"Sign In"**

**Expected Result**: ✅ Redirected to organizer dashboard at `/organizer/dashboard`

---

#### Step 1.2: View Approved Proposal

1. From organizer dashboard, click **"My Proposals"** or navigate to `/organizer/proposals`
2. You should see a list of proposals
3. Find the **APPROVED** proposal (look for green "Approved" badge)
4. Click on it to view details

**What to Point Out**:
- ✅ Proposal Status: **APPROVED** (Government has reviewed and signed off)
- ✅ Event Title: Tech Conference 2026
- ✅ Proposed Date: [Shows date]
- ✅ Event Description: Complete proposal details

**Demo Note**: "The government offices (Ministry, Municipal, Police) have already reviewed and approved this proposal. Now the organizer can create the actual event."

---

#### Step 1.3: Create Event from Approved Proposal

1. On the approved proposal detail page, click **"Create Event"** button
2. You'll be taken to `/organizer/create-event` page
3. Form will be pre-filled with proposal data:
   - Event Title
   - Description
   - Proposed Dates
   - Event Category
   - Expected Attendees

**Key Fields to Show**:
- Event Category: `conference` ✅
- Expected Attendees: 150-200 people
- Event Location: Addis Ababa

4. Scroll down and click **"Create Event"** button

**Expected Result**: ✅ Event created successfully. You'll see confirmation message.

---

#### Step 1.4: Publish Event

1. You're now on the newly created event detail page
2. Look for the **"Publish Event"** button (usually in top-right or event actions)
3. Click it to publish the event
4. Confirm the action

**Expected Result**: ✅ Event status changes to **PUBLISHED**

---

#### Step 1.5: Enable Booking

1. On the event detail page, find **"Booking Settings"** section
2. Click **"Enable Booking"** or similar button
3. Set booking details:
   - Max Attendees: 200
   - Booking Deadline: [Select a future date]
4. Click **"Save"**

**Expected Result**: ✅ Event is now LIVE and accepting bookings

---

### **PHASE 2: Vendor Discovers Event & Offers Services (4 minutes)**

#### Step 2.1: Vendor Login

1. Open a **NEW PRIVATE/INCOGNITO** browser window (to keep organizer session)
2. Go to `http://localhost:3000`
3. Click **"Login"**
4. Enter vendor credentials:
   - Email: `venue.provider.demo@gce.local`
   - Password: `VendorDemo@123`
5. Click **"Sign In"**

**Expected Result**: ✅ Logged in as Vendor. Redirected to vendor dashboard at `/vendor/dashboard`

---

#### Step 2.2: Browse Marketplace

1. From vendor dashboard, click **"Browse Opportunities"** or **"Marketplace"**
2. Navigate to `/vendor/opportunities` or equivalent
3. You should see the **"Tech Conference 2026"** event listed

**What to Show**:
- ✅ Event Title: Tech Conference 2026
- ✅ Expected Attendees: 150-200
- ✅ Event Date: [Shows date]
- ✅ Budget Range: [If visible]
- ✅ Organizer looking for: Venue, Catering, Decor, etc.

---

#### Step 2.3: Submit Vendor Request

1. Click on the **"Tech Conference 2026"** event
2. On event details, you'll see **"Send Service Request"** or **"Create Request"** button
3. Click it
4. Fill in vendor proposal:
   - Service Type: Venue Rental
   - Proposed Price: 120,000 ETB
   - Description: Professional venue with full AV capabilities, seating for 200+
   - Timeline: [Select event dates]

5. Click **"Submit Request"**

**Expected Result**: ✅ Request sent to organizer. Vendor receives confirmation.

---

### **PHASE 3: Attendee Books Event (4 minutes)**

#### Step 3.1: Attendee Login

1. Open **ANOTHER NEW PRIVATE/INCOGNITO** window (keep vendor session too)
2. Go to `http://localhost:3000`
3. Click **"Login"**
4. Enter attendee credentials:
   - Email: `attendee.demo@gce.local`
   - Password: `AttendeeDemo@123`
5. Click **"Sign In"**

**Expected Result**: ✅ Logged in as Attendee. Redirected to home page.

---

#### Step 3.2: Discover Published Event

1. From home page, you should see **"Tech Conference 2026"** in the events list
2. Alternatively, navigate to `/events`
3. You should see the published event

**What to Show**:
- ✅ Event Title: Tech Conference 2026
- ✅ Status Badge: **LIVE** (accepting bookings)
- ✅ Event Date & Time
- ✅ Event Description
- ✅ **"Book Now"** button

---

#### Step 3.3: View Event Details

1. Click on the **"Tech Conference 2026"** event card
2. You're taken to event detail page: `/events/[event-id]`
3. Show attendee what they see:
   - Full event description
   - Date and time
   - Location: Addis Ababa
   - Expected attendees
   - Booking status: **OPEN**
   - Available seats: 200

**Demo Note**: "Attendees can see all published events and book directly from here."

---

#### Step 3.4: Book Event (Reserve a Spot)

1. Click **"Reserve a Spot"** or **"Book Now"** button
2. Fill in booking information:
   - Full Name: Demo Attendee
   - Email: [Should be pre-filled]
   - Number of tickets: 1
   - [Any other required fields]

3. Click **"Confirm Booking"**

**Expected Result**: ✅ Booking successful! You see confirmation with:
- ✅ Booking Reference Number (e.g., `BK-TCE-2026-001`)
- ✅ Confirmation message
- ✅ "View Your Booking" link

---

#### Step 3.5: Generate & View QR Code

1. Click **"View Your Booking"** or navigate to booking details
2. On the booking confirmation page, you should see:
   - Booking details
   - Event information
   - **"Download QR Code"** or **"View QR Code"** button

3. Click the button to view/download the QR code

**What to Show**:
- ✅ QR Code Image (contains booking reference)
- ✅ Booking Reference Number below QR code
- ✅ Event details (date, time, location)
- ✅ Attendee name and email

**Demo Note**: "This QR code is used for check-in at the event. Staff will scan it to verify the attendee."

---

### **PHASE 4: Event Check-In (2 minutes)**

#### Step 4.1: Simulate Check-In

1. Go back to **ORGANIZER** window
2. Navigate to event details
3. Find **"Check-In"** section or **"Event Staff Portal"**
4. Click **"Start Check-In"** or similar

---

#### Step 4.2: Scan QR Code

1. You should see a QR code scanner interface
2. Display the attendee's QR code from Phase 3, Step 3.5
3. Use your device's camera or click **"Upload QR"** to scan the code

**Expected Result**: ✅ QR code scanned successfully:
- ✅ Attendee name appears: "Demo Attendee"
- ✅ Booking reference verified: "BK-TCE-2026-001"
- ✅ Status changes to: **CHECKED IN**
- ✅ Check-in time recorded

**Demo Note**: "The organizer can track who's arrived at the event in real-time."

---

## 📊 KEY FEATURES DEMONSTRATED

By completing the flow above, you've shown:

| Feature | Where Demonstrated | Impact |
|---------|-------------------|--------|
| **Government Approval** | Phase 1 - Approved Proposal | Enterprises trust government review |
| **Event Creation** | Phase 1.3 | Organizers can create events from proposals |
| **Event Lifecycle** | Phase 1.4-1.5 | Clear event states (Draft → Published → Live → Completed) |
| **Role-Based Access** | All phases | Each role sees only their relevant data |
| **Vendor Discovery** | Phase 2.2 | Vendors can find opportunities |
| **Vendor Negotiation** | Phase 2.3 | Vendors submit proposals with pricing |
| **Event Publishing** | Phase 3.2 | Attendees discover published events |
| **Booking System** | Phase 3.4 | Easy reservation flow |
| **QR Code Generation** | Phase 3.5 | Digital tickets with verification |
| **Check-In Verification** | Phase 4 | Real-time event attendance tracking |

---

## 🔍 ADDITIONAL FEATURES TO HIGHLIGHT (If Time Permits)

### A. Vendor Negotiation (Back in Organizer Window)

1. Go to event details → **"Vendors"** or **"Requests"** section
2. Show the vendor request that was submitted in Phase 2.3
3. You can:
   - **Accept** the vendor proposal
   - **Counter Offer** with different pricing
   - **Reject** if not suitable

**Demo Note**: "Organizers and vendors can negotiate directly within the platform."

### B. Event Management Features

In the organizer dashboard, show:
- Event Schedule/Timeline
- Team Members (Event staff)
- Tasks & Announcements
- Booking Statistics
- Event Status History

### C. Vendor Portal Features

Show what a vendor sees:
- Portal Summary (Active requests, contracts)
- Service Listings (What they offer)
- Received Requests (From organizers)
- Active Contracts (Signed agreements)

---

## ⚠️ TROUBLESHOOTING

### Problem: "Cannot connect to backend"
**Solution**: 
- Check backend is running: `http://localhost:8000/docs` should show Swagger UI
- Verify MongoDB connection in backend logs
- Check `.env` file has correct `MONGODB_URL`

### Problem: "Login fails"
**Solution**:
- Ensure demo data is seeded (run `seed_demo_vendors.py`)
- Clear browser cookies/cache
- Check backend `/api/v1/docs` to manually verify user exists via API

### Problem: "Event not showing in attendee view"
**Solution**:
- Ensure event is PUBLISHED (not just created)
- Event must have booking ENABLED
- Check current date vs event date (event should be in future)

### Problem: "QR Code not generating"
**Solution**:
- Ensure booking is CONFIRMED (not pending)
- Check backend logs for image generation errors
- Try refreshing the page
- Check browser console for any JavaScript errors

### Problem: "Vendor can't see event"
**Solution**:
- Event must be PUBLISHED
- Vendor must be VERIFIED and APPROVED by admin
- Check vendor status in admin panel

---

## 🚀 DEMO TALKING POINTS

Use these to enhance your presentation:

### Opening
> "Global Connect Ethiopia is a comprehensive event management platform that brings together three key stakeholders: **Organizers**, **Vendors**, and **Attendees**. Today, I'll walk you through a complete event lifecycle—from government approval to attendee check-in."

### After Phase 1
> "Once the government approves a proposal, organizers can immediately create their event. The proposal data is automatically populated, so organizers don't have to re-enter information. They can then publish the event and open it to attendees and vendors."

### After Phase 2
> "Our vendor marketplace is unique. Instead of vendors cold-calling organizers, vendors can browse current opportunities on the platform and submit proposals directly. This creates a streamlined negotiation channel within our system."

### After Phase 3
> "Attendees have a seamless booking experience. They see published events, select one, reserve their spot, and immediately get a QR code. This digital ticket replaces traditional paper ticketing."

### After Phase 4
> "At the event, staff use our check-in system to scan QR codes. This gives organizers real-time attendance data and attendee verification. No more manually checking lists!"

### Closing
> "This platform solves a critical problem in Ethiopia's event space: **lack of coordination between organizers, vendors, and government**. We've built a system that makes event management transparent, efficient, and trustworthy."

---

## 📱 MOBILE VIEW (If Demonstrating Responsive Design)

The platform is mobile-responsive. To show mobile view:
1. Press `F12` in browser to open Developer Tools
2. Click responsive design mode icon (or `Ctrl+Shift+M`)
3. Select a mobile device (e.g., iPhone 12)
4. Show that:
   - Navigation works well on mobile
   - Booking flow is mobile-optimized
   - QR code is easily scannable on mobile devices

---

## 💾 EXPORTING DEMO DATA (For Reference)

If you need to show data to your advisor:

**API Endpoints for Demo Data:**
```
GET http://localhost:8000/api/v1/events
  → Shows all events (attendee perspective)

GET http://localhost:8000/api/v1/users/me
  → Shows current logged-in user details

GET http://localhost:8000/api/v1/bookings
  → Shows all bookings for current user

GET http://localhost:8000/api/v1/vendors/services/me
  → Shows vendor's service listings
```

**Postman Collection**: Use the included collection at `backend/postman/organizer-verification-flow.postman_collection.json` to:
- Test API endpoints
- Show backend capabilities
- Export data in JSON format

---

## 📋 PRE-DEMO CHECKLIST

- [ ] Backend is running (`http://localhost:8000`)
- [ ] Frontend is running (`http://localhost:3000`)
- [ ] MongoDB is running or Atlas connected
- [ ] Demo vendors are seeded
- [ ] At least one approved proposal exists
- [ ] All demo credentials are ready (organizer, vendor, attendee)
- [ ] Test all 3 roles can login
- [ ] Test organizer can create event
- [ ] Test attendee can see published event
- [ ] Test booking and QR code generation
- [ ] Internet connection is stable
- [ ] Have backup phone/tablet ready to show QR code in Phase 4

---

## ⏱️ TIMING GUIDE

| Phase | Task | Duration |
|-------|------|----------|
| Setup | Backend/Frontend startup | 2-3 min |
| 1 | Organizer event creation | 5 min |
| 2 | Vendor discovery & negotiation | 4 min |
| 3 | Attendee booking & QR code | 4 min |
| 4 | Check-in verification | 2 min |
| Q&A | Questions & discussion | 5 min |
| **Total** | | **20-22 min** |

---

## 🎓 ADVISOR QUESTIONS TO PREPARE FOR

### Technical Questions
- **Q**: "How does authentication work across roles?"  
  **A**: "We use JWT tokens with role-based access control. Each user role (organizer, vendor, attendee, admin) has specific endpoints and permissions."

- **Q**: "How does vendor verification work?"  
  **A**: "Vendors submit documents (business license, ID, etc.). Admins review and approve. Only approved vendors can list services."

- **Q**: "How is payment handled?"  
  **A**: "Payment between organizers and vendors is deferred in this MVP. We have the contract framework ready for payment integration."

### Business Questions
- **Q**: "What's the value proposition for each stakeholder?"
  - **Organizers**: Streamlined event creation from government-approved proposals
  - **Vendors**: Direct access to event opportunities without cold-calling
  - **Attendees**: Easy event discovery and secure booking

- **Q**: "How do you handle disputes?"  
  **A**: "We have a contract system where both parties sign digitally. Disputes would be logged and escalated to admin."

- **Q**: "What's the next phase after MVP?"  
  **A**: "Payment integration, advanced analytics, AI-powered recommendations, and mobile app development."

---

## 📞 SUPPORT

If you encounter issues during the demo:
1. Check the Troubleshooting section above
2. Review backend logs: `terminal where uvicorn is running`
3. Check frontend console: Open DevTools (`F12`) → Console tab
4. Check MongoDB connection: Try to connect via MongoDB Compass

---

## 🎉 YOU'RE READY!

Your Global Connect Ethiopia platform demonstrates a real-world solution to event management challenges in Ethiopia. 

**Key Takeaways for Your Advisor:**
- ✅ Full-stack modern architecture (Next.js + FastAPI)
- ✅ Real-world role-based system
- ✅ Complete business flow (government → organizer → vendor → attendee)
- ✅ Integration with external services (email, QR code, document storage)
- ✅ Production-ready code with comprehensive error handling

**Good luck with your presentation!** 🚀

---

*Last Updated: May 6, 2026*  
*Prepared for: Project Advisor Review*
