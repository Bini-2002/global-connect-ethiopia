# ⚡ QUICK DEMO START GUIDE

**Use this checklist 30 minutes before your presentation**

---

## 🚀 QUICK START (5 minutes)

### Terminal 1: Start Backend
```bash
cd backend
# Windows CMD:
venv\Scripts\activate.bat
# OR Windows PowerShell:
.\venv\Scripts\Activate.ps1

# Start backend
uvicorn app.main:app --reload
```
✅ Should show: `Uvicorn running on http://127.0.0.1:8000`

### Terminal 2: Start Frontend
```bash
cd frontend
npm run dev
```
✅ Should show: `ready - started server on 0.0.0.0:3000`

### Terminal 3: Seed Demo Data
```bash
cd backend
# Make sure venv is activated
python scripts/seed_demo_vendors.py
```
✅ Should complete without errors

---

## 📝 DEMO CREDENTIALS (Copy-Paste Ready)

**Browser 1 - ORGANIZER:**
- Email: `organizer.demo@gce.local`
- Password: `OrganizerDemo@123`

**Browser 2 - VENDOR:**
- Email: `venue.provider.demo@gce.local`
- Password: `VendorDemo@123`

**Browser 3 - ATTENDEE:**
- Email: `attendee.demo@gce.local`
- Password: `AttendeeDemo@123`

---

## 🎯 THE 5-STEP DEMO (15 minutes)

| Step | Role | Action | Success ✅ |
|------|------|--------|-----------|
| 1 | Organizer | Login → View Approved Proposal → Create Event | Event created |
| 2 | Organizer | Publish Event → Enable Booking | Event shows as LIVE |
| 3 | Vendor | Login → Browse Opportunities → Send Service Request | Request submitted |
| 4 | Attendee | Login → Discover Event → Book Spot → View QR Code | QR code visible |
| 5 | Organizer | View Check-In → Scan QR Code → Verify Attendee | Attendee checked in |

---

## 🔗 IMPORTANT LINKS

- **Frontend**: `http://localhost:3000`
- **Backend API Docs**: `http://localhost:8000/docs`
- **Swagger UI**: `http://localhost:8000/docs`
- **Admin Panel**: `http://localhost:3000/admin` (if setup)

---

## ⚠️ IF SOMETHING BREAKS

| Issue | Quick Fix |
|-------|-----------|
| Can't login | Restart backend, check MongoDB is running |
| Event not showing | Publish event, enable booking, check future date |
| QR not generating | Refresh page, confirm booking is CONFIRMED |
| Backend won't start | Check `.env` file has MongoDB URL |
| Frontend won't load | Run `npm install` in frontend folder |

---

## 💡 DEMO TALKING POINTS (Copy these down!)

### Opening (30 seconds)
> "Global Connect Ethiopia solves the event management problem in Ethiopia by connecting government, organizers, vendors, and attendees on one platform."

### When showing Organizer (2 min)
> "Organizers submit proposals to government offices. Once approved, they create the actual event with just a few clicks—no re-entering data."

### When showing Vendor (1.5 min)
> "Vendors browse current event opportunities on our marketplace and submit proposals directly. No cold-calling—everything is transparent."

### When showing Attendee (2 min)
> "Attendees see published events, book with one click, and get a digital QR code ticket. It's seamless and secure."

### When showing QR Code (1.5 min)
> "The QR code replaces paper tickets. Staff scan it at check-in. We get real-time attendance data, and everyone knows who's verified."

### Closing (30 seconds)
> "This platform brings accountability and efficiency to Ethiopia's event industry. Three key problems solved: government verification, vendor coordination, and attendee trust."

---

## 📱 DISPLAY SETUP

**Arrange your screens like this:**

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   ORGANIZER     │  │     VENDOR      │  │    ATTENDEE     │
│  Browser 1      │  │   Browser 2     │  │   Browser 3     │
│  (Incognito)    │  │  (Incognito)    │  │  (Incognito)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
     Role 1              Role 2               Role 3
     Create              Discover             Book
     Publish             Negotiate            Check-in
```

**OR** use one browser with tabs + Private Windows for role switching

---

## 🎬 EXACT STEPS FOR DEMO DAY

### Before Advisors Arrive (15 min before)
- [ ] All 3 terminals running (Backend, Frontend, Seeding done)
- [ ] Tested each role login works
- [ ] Tested creating event through all phases
- [ ] Tested QR code generates
- [ ] Closed unnecessary windows
- [ ] Phone/tablet ready to show QR code (if presenting check-in)

### During Demo
- [ ] Keep this sheet visible for reference
- [ ] Have credentials copypaste-ready
- [ ] Speak slowly—let them see the flow
- [ ] Point out key features as you go
- [ ] Be ready to answer questions from "advisor questions" section above

### After Demo
- [ ] Invite questions
- [ ] Offer to show specific features in detail
- [ ] Have backend API docs (`/docs`) ready to show technical details

---

## 🎓 IF ADVISOR ASKS TECHNICAL QUESTIONS

**Q: "How do you handle authentication?"**  
A: "JWT tokens. Each role gets specific permissions. We store user role in token."

**Q: "Why separate organizer and vendor?"**  
A: "Different workflows. Organizers create events, vendors provide services. Roles prevent confusion."

**Q: "How's the database structured?"**  
A: "MongoDB for flexibility. Collections for Users, Events, Vendors, Bookings, etc."

**Q: "Can this scale?"**  
A: "Yes. We use FastAPI (async), MongoDB (sharding), and stateless design. Ready for production."

---

## 📊 EXPECTED RESULTS

If everything works, you should see:

**Phase 1 (Organizer)**: ✅  
→ Event created from proposal → Event published → Booking enabled

**Phase 2 (Vendor)**: ✅  
→ Event visible in opportunities → Vendor request sent

**Phase 3 (Attendee)**: ✅  
→ Event discoverable → Booking created → QR code generated

**Phase 4 (Check-In)**: ✅  
→ QR scanned → Attendee verified → Status changes to CHECKED_IN

---

## 🆘 NUCLEAR OPTION (If Everything Breaks)

If the demo breaks and you need to show it quickly:

1. **Show API Docs**: `http://localhost:8000/docs`
   - Explain backend endpoints
   - Show data models
   - Walk through API flow

2. **Show Postman Collection**: `backend/postman/organizer-verification-flow.postman_collection.json`
   - Import into Postman
   - Show live API responses
   - Demonstrate backend capability

3. **Show Code**: Pull up key files in VS Code
   - `frontend/app/organizer/create-event/page.tsx`
   - `backend/app/api/v1/endpoints/events.py`
   - Explain architecture

4. **Show Architecture Diagram**: Reference the planning docs
   - `FINAL_DEVELOPMENT_PLAN_AND_PROMPTS.md`
   - Show project structure

---

## 🎉 YOU GOT THIS!

- ✅ You've built a real product
- ✅ All the pieces work together
- ✅ You have a clear story to tell
- ✅ Your advisor will be impressed

**Remember**: The demo is about showing the VALUE, not perfection. Focus on the user flow, not technical details.

**Time**: 15-20 minutes  
**Confidence Level**: HIGH 💪  
**Expected Outcome**: Your advisor understands the project and is impressed by what you've built

---

**Good Luck!** 🚀

*Print this page or keep it on your phone for reference during the demo.*
