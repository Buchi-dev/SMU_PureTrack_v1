# 🚀 Quick Start: V2 Integration Testing

## Start Servers

```powershell
# Terminal 1: Backend
cd E:\Capstone-Final-Final\server_v2
npm run dev

# Terminal 2: Frontend
cd E:\Capstone-Final-Final\client
npm run dev
```

**Expected Output**:
- ✅ Backend: `🚀 Server is running on port 5000`
- ✅ Frontend: `Local: http://localhost:5173/`

---

## Quick Health Checks

### 1. Backend Health
```powershell
curl http://localhost:5000/health
```
**Expected**: `{ "status": "OK", "database": "connected" }`

### 2. Frontend Connects to Backend
1. Open: `http://localhost:5173`
2. Open DevTools (F12) → Console
3. Look for: `🌐 API Configuration` and `API Base URL: http://localhost:5000`

---

## Test Login Flow (5 minutes)

1. **Go to**: `http://localhost:5173/auth/login`
2. **Click**: "Sign in with Google"
3. **Use**: Your `@smu.edu.ph` email
4. **Check DevTools Network Tab**:
   - ✅ `POST /auth/verify-token` → 200 OK
   - ✅ Authorization header present
5. **Check Backend Terminal**:
   - ✅ `[Auth] Token verified for user: your.email@smu.edu.ph`

**If successful**: You'll be redirected to dashboard

---

## Test Each Entity (30 minutes)

### Alerts (`/admin/alerts`)
- ✅ Alerts list loads
- ✅ Click "Acknowledge" → Works
- ✅ Click "Resolve" → Works
- ✅ Stats card shows counts

### Devices (`/admin/devices`)
- ✅ Device list loads
- ✅ Status badges show (online/offline)
- ✅ Click device → Details page loads

### Readings (`/admin/readings`)
- ✅ Readings table loads
- ✅ pH, Turbidity, TDS columns display
- ✅ Filter by device works

### Users (`/admin/users`)
- ✅ User list loads
- ✅ Change role → Updates
- ✅ Change status → Updates

### Reports (`/admin/reports`)
- ✅ Generate report → Status shows "Generating"
- ✅ Report completes → Download button appears

---

## Common Issues (Quick Fixes)

### "No user available for request"
**Fix**: Wait 2-3 seconds after login, Firebase token needs to sync

### 401 Unauthorized on all requests
**Fix**: Check `.env.development` has `VITE_API_BASE_URL=http://localhost:5000`

### CORS Error
**Fix**: Verify `server_v2/.env` has `CORS_ORIGIN=http://localhost:5173`

### Alerts show "undefined" values
**Fix**: Check Network tab response → Compare with `alerts.schema.ts` field names

---

## DevTools Checklist

### Network Tab (Every Request)
- ✅ Request URL: `http://localhost:5000/api/v1/...`
- ✅ Request Headers: `Authorization: Bearer eyJh...`
- ✅ Status: 200 OK
- ✅ Response: `{ success: true, data: [...] }`

### Console Tab
- ✅ No red errors related to API calls
- ✅ No Zod validation errors
- ✅ `[API] Added token for user: ...` messages present

---

## Success Criteria

### ✅ Authentication Works
- Login successful
- Firebase token sent to backend
- User profile loaded

### ✅ Alerts Integration Works
- List loads
- Acknowledge works
- Resolve works
- Stats accurate

### ✅ Devices Integration Works
- List loads
- Status accurate
- Readings load

### ✅ Real-Time Updates Work
- SWR polling active (check Network tab for repeated requests)
- New data appears without page refresh

---

## Next Steps After Testing

1. **If all tests pass**: Update `.env.production` with production V2 URL
2. **If tests fail**: Check `V2_INTEGRATION_GUIDE.md` for detailed debugging
3. **Deploy**: Both frontend and backend to production

---

**Need Help?** Check the full integration guide: `V2_INTEGRATION_GUIDE.md`
