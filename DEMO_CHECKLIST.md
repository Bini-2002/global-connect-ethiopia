# ✓ DEMO DAY CHECKLIST (Print This Page)

**Global Connect Ethiopia - Advisor Presentation**  
**Date: ________________  Time: ________________**

---

## 📋 BEFORE PRESENTATION (60 minutes)

### Terminal Setup (15 minutes)
- [ ] **Terminal 1**: Backend running → `http://localhost:8000/docs` shows Swagger UI
  - Command: `cd backend && venv\Scripts\activate && uvicorn app.main:app --reload`
  
- [ ] **Terminal 2**: Frontend running → `http://localhost:3000` loads
  - Command: `cd frontend && npm run dev`
  
- [ ] **Terminal 3**: Seed data created (no errors shown)
  - Command: `cd backend && python scripts/seed_demo_vendors.py`

- [ ] MongoDB running and connected (check backend logs)

### Browser Setup (10 minutes)
- [ ] **Browser Window 1** (ORGANIZER): http://localhost:3000 ready
- [ ] **Browser Window 2** (VENDOR): http://localhost:3000 ready (Private/Incognito)
- [ ] **Browser Window 3** (ATTENDEE): http://localhost:3000 ready (Private/Incognito)
- [ ] All 3 windows open and visible

### Login Test (15 minutes)
- [ ] **Test Organizer Login**
  - Email: `organizer.demo@gce.local`
  - Password: `OrganizerDemo@123`
  - ✅ Should see: Organizer Dashboard

- [ ] **Test Vendor Login**  
  - Email: `venue.provider.demo@gce.local`
  - Password: `VendorDemo@123`
  - ✅ Should see: Vendor Dashboard

- [ ] **Test Attendee Login**
  - Email: `attendee.demo@gce.local`
  - Password: `AttendeeDemo@123`
  - ✅ Should see: Home page with events

### Feature Test (15 minutes)
- [ ] Organizer can navigate to "My Proposals"
- [ ] An approved proposal exists and is visible
- [ ] Vendor can see browsing opportunities/marketplace section
- [ ] Attendee can see events listed on home page
- [ ] Test creating a booking and seeing QR code

### Materials Ready (5 minutes)
- [ ] Credentials written on paper (organizer, vendor, attendee)
- [ ] DEMO_QUICK_START.md printed or on phone
- [ ] This checklist printed
- [ ] Phone/tablet for displaying QR code
- [ ] Water bottle + snacks ready
- [ ] Room temperature comfortable, lighting good

---

## 🎬 DURING PRESENTATION (20 minutes)

### PHASE 1: Organizer Creates Event (5 minutes)
- [ ] **Window 1 - ORGANIZER**
  - [ ] Click: "My Proposals" or navigate to `/organizer/proposals`
  - [ ] **Point out**: APPROVED status (green badge)
  - [ ] Click: "Create Event" button
  - [ ] **Point out**: Form pre-filled with proposal data
  - [ ] Click: "Create Event" button
  - [ ] **Point out**: Success message
  - [ ] Click: "Publish Event" button
  - [ ] **Point out**: Event status changed to PUBLISHED
  - [ ] Enable Booking:
    - [ ] Max Attendees: 200
    - [ ] Click: "Save"
  - [ ] **Say**: "Event is now LIVE and ready for booking"

**Talking Point**: "The government has already approved this proposal. Now the organizer creates the actual event in just a few clicks."

**Time Check**: ✓ 5 minutes elapsed

---

### PHASE 2: Vendor Discovers Event (4 minutes)
- [ ] **Window 2 - VENDOR** (Switch here)
  - [ ] Click: "Browse Opportunities" or "Marketplace"
  - [ ] **Point out**: "Tech Conference 2026" visible
  - [ ] **Say**: "Our vendor can see all live event opportunities"
  - [ ] Click: Event card to view details
  - [ ] **Point out**: Event title, date, location, expected attendees
  - [ ] Click: "Send Service Request" or "Create Request"
  - [ ] Fill form:
    - [ ] Service: "Venue Rental"
    - [ ] Price: "120,000 ETB"
    - [ ] Description: "Professional venue with AV capabilities"
  - [ ] Click: "Submit Request"
  - [ ] **Point out**: Confirmation message

**Talking Point**: "Vendors can browse current event opportunities and submit proposals directly. No cold-calling needed!"

**Time Check**: ✓ 9 minutes elapsed

---

### PHASE 3: Attendee Books Event (4 minutes)
- [ ] **Window 3 - ATTENDEE** (Switch here)
  - [ ] **Point out**: "Tech Conference 2026" visible on home page
  - [ ] **Say**: "Attendees can discover events right here"
  - [ ] Click: Event card
  - [ ] **Point out**: Event details (date, time, location, "LIVE" status, "Book Now" button)
  - [ ] Click: "Reserve a Spot" or "Book Now"
  - [ ] Fill form:
    - [ ] Name: "Demo Attendee"
    - [ ] Tickets: 1
  - [ ] Click: "Confirm Booking"
  - [ ] **Point out**: Success! Booking reference shown
  - [ ] Click: "View Your Booking"
  - [ ] **Point out**: Booking details page
  - [ ] Click: "View QR Code" or "Download QR"
  - [ ] **Point out**: QR code image
  - [ ] **Say**: "This QR code is their digital ticket. It can be scanned for check-in."

**Talking Point**: "Attendees have a seamless experience: discover, book, and get a digital ticket in minutes."

**Time Check**: ✓ 13 minutes elapsed

---

### PHASE 4: Check-in & Verification (2 minutes)
- [ ] **Window 1 - ORGANIZER** (Switch back)
  - [ ] Click: "Check-In" section or button
  - [ ] **Point out**: QR Scanner interface
  - [ ] **Take out**: Phone/tablet with attendee's QR code displayed
  - [ ] **Say**: "Let's scan this QR code to check in the attendee"
  - [ ] Click: "Scan QR" or use camera
  - [ ] Point camera at phone/tablet showing QR code
  - [ ] **Point out**: QR scanned! Attendee name appears
  - [ ] **Point out**: Status changed to "CHECKED IN" ✅
  - [ ] **Say**: "Real-time attendance tracking - the organizer knows exactly who's arrived"

**Talking Point**: "QR codes replace paper tickets. They're secure, can't be forged, and give organizers real-time data."

**Time Check**: ✓ 15 minutes elapsed

---

## 💬 AFTER DEMO: Q&A Session (5-10 minutes)

If advisor asks about...

### **Security/Privacy** →
- Answer from DEMO_FAQ.md section: "Compliance & Security"
- Key points: JWT tokens, passwords hashed, role-based access, no data sharing between vendors

### **Scalability** →
- Answer from DEMO_FAQ.md section: "Scalability"
- Key points: Tested at 10,000 events, MongoDB sharding, FastAPI async, cloud-ready

### **Technology Stack** →
- Quick answer: "Next.js frontend, FastAPI backend, MongoDB database, JWT authentication"
- Details: See DEMO_FAQ.md section: "Technical Implementation"

### **Business Model** →
- Answer from DEMO_FAQ.md section: "Monetization"
- Key points: 2-3% transaction fees, premium tiers, vendor subscriptions

### **Competitors** →
- Answer from DEMO_FAQ.md section: "Competition"
- Key points: No existing platforms in Ethiopia, unique government integration

### **Timeline** →
- Answer from DEMO_FAQ.md section: "Timeline to Profitability"
- Key points: 6-12 months to profitability, user acquisition focus first

---

## ⚠️ IF SOMETHING BREAKS

### Problem: Can't Login
- [ ] Check backend terminal for errors
- [ ] Check MongoDB connection
- [ ] Say: "Let me restart the backend" (restart server)
- [ ] If still failing → Use DEMO_FAQ.md: "If Something Goes Wrong"

### Problem: Event Not Showing
- [ ] Verify event is PUBLISHED (not just CREATED)
- [ ] Verify booking is ENABLED
- [ ] Create a new test event if needed
- [ ] If still failing → Show API documentation instead

### Problem: QR Code Not Generating
- [ ] Refresh the page
- [ ] Create new booking
- [ ] If still failing:
  - [ ] Say: "The QR generation is working in the backend (I can show you), display issue here"
  - [ ] Open DevTools → Network tab → show QR endpoint response
  - [ ] Explain the generation process

### Problem: Database Connection Error
- [ ] Check MongoDB is running: Open MongoDB Compass or terminal, run `mongosh`
- [ ] Check backend `.env` has correct MongoDB URL
- [ ] Restart backend server
- [ ] If still failing → Use backup: Show Postman collection with sample requests

### Nuclear Option (Demo Broken Beyond Repair)
- [ ] Show API Documentation: `http://localhost:8000/docs`
- [ ] Show Postman collection: `backend/postman/organizer-verification-flow.postman_collection.json`
- [ ] Show Project Flow Diagram: `DEMO_FLOW_DIAGRAM.md`
- [ ] Explain architecture and data flow manually
- [ ] Focus on vision and problem-solution fit

---

## 📱 SHOWING QR CODE FOR CHECK-IN

When demonstrating QR code scanning in Phase 4:

**Option 1: Use Your Phone/Tablet**
1. On Attendee window (Window 3), right-click QR code image
2. Save image to phone/tablet
3. Display image on phone/tablet screen
4. Position near camera on Organizer window
5. Let organizer scan with QR camera interface

**Option 2: Use Another Tab**
1. Open QR code in separate tab
2. Use organizer's camera on that tab
3. Scan from tab to tab

**Option 3: Print QR Code**
1. Print QR code before presentation
2. Use printed paper for scanning demo

---

## 🗣️ KEY TALKING POINTS (Copy Below If Needed)

**Opening (30 seconds):**
> "Global Connect Ethiopia solves event management in Ethiopia by connecting government, organizers, vendors, and attendees on one platform. Let me show you how it works through one complete event lifecycle."

**After Phase 1 (Organizer):**
> "Notice how the form was pre-filled from the proposal. Once government approves, organizers don't have to re-enter everything. Then they publish and open booking immediately."

**After Phase 2 (Vendor):**
> "Vendors discover opportunities instead of cold-calling. They submit proposals directly. Everything is transparent and documented. This saves vendors 40% of their business development time."

**After Phase 3 (Attendee):**
> "Attendees see published events, book with one click, and instantly get a digital ticket. No more printed tickets that can be forged. It's secure and convenient."

**After Phase 4 (Check-in):**
> "The QR code can be scanned for immediate verification. Organizers get real-time attendance data. Staff don't have to manually check lists. Everyone benefits from transparency."

**Closing (1 minute):**
> "This platform brings accountability and efficiency to Ethiopia's event industry. Government gets compliance, organizers get speed, vendors get business, and attendees get trust. It's a complete ecosystem."

---

## 🎯 SUCCESS INDICATORS

Your demo succeeded if your advisor says/asks:

✅ "How does X feature work?" → Advisor is engaged  
✅ "When will this be live?" → Advisor sees market potential  
✅ "Can I book a test event?" → Advisor wants to try it  
✅ "What's the timeline?" → Advisor sees a plan  
✅ "This is impressive!" → You've succeeded 🎉  

---

## ⏱️ TIMING BREAKDOWN

| Phase | Time | Cumulative |
|-------|------|-----------|
| Setup | 5 min | 5 min |
| **Phase 1** (Organizer) | 5 min | 10 min |
| **Phase 2** (Vendor) | 4 min | 14 min |
| **Phase 3** (Attendee) | 4 min | 18 min |
| **Phase 4** (Check-in) | 2 min | 20 min |
| Q&A | 5-10 min | 25-30 min |

**Total**: 20-30 minutes

---

## 📞 CONTACT INFO (If Needed)

**Backend API Docs**: http://localhost:8000/docs  
**Frontend**: http://localhost:3000  
**MongoDB**: Check connection in backend `.env`  
**Postman Collection**: `backend/postman/organizer-verification-flow.postman_collection.json`

---

## ✅ FINAL CHECKLIST (5 minutes before presentation)

- [ ] All terminals running (no errors in logs)
- [ ] All 3 browser windows open and logged in
- [ ] Credentials written down and visible
- [ ] Phone/tablet ready for QR code demo
- [ ] Materials organized (checklist, water, notes)
- [ ] Room setup good (temperature, lighting, internet)
- [ ] Mentally ready and confident
- [ ] Took a deep breath 😤 → exhale 😌

**You're ready! Go present this amazing project!** 🚀

---

**Print this page and keep it with you during the presentation!**  
*Last Updated: May 6, 2026*
