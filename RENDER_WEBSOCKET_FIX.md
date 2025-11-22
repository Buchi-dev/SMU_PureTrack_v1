# Render.com WebSocket Configuration Fix

## Problem
Socket.IO WebSocket connections are timing out in production on Render.com with the error:
```
[Socket.IO] ⚠️ Connection error: timeout
WebSocket connection failed: WebSocket is closed before the connection is established
```

## Root Causes

1. **Render.com Free/Starter Tier Limitations**
   - WebSocket support requires persistent connections
   - Free tier may have connection timeout issues
   - Load balancers may not properly handle WebSocket upgrades

2. **Transport Priority**
   - Client was trying WebSocket first, which times out on Render
   - Should start with polling (HTTP long-polling) which is more reliable

3. **Timeout Mismatches**
   - Client timeout was 10s, server was 60s
   - Connection establishment needs more time on cloud platforms

## Solutions Implemented

### 1. Client-Side Changes (`client/src/utils/socket.ts`)

✅ **Changed transport priority for production:**
```typescript
// Production: Start with polling (more reliable on Render.com)
transports: isProd ? ['polling', 'websocket'] : ['websocket', 'polling']
```

✅ **Increased timeouts:**
- Connection timeout: 10s → 20s
- Wait for connection: 10s → 20s

✅ **Added transport upgrade settings:**
```typescript
upgrade: isProd,        // Allow transport upgrade in production
rememberUpgrade: true,  // Remember successful upgrades
```

✅ **Enhanced error logging for production debugging**

### 2. Server-Side Changes (`server/src/utils/socketConfig.js`)

✅ **Changed transport priority:**
```javascript
transports: ['polling', 'websocket']  // Polling first
```

✅ **Increased timeout values:**
- `upgradeTimeout`: 10s → 30s
- `connectTimeout`: Added 45s

✅ **Added explicit configuration:**
```javascript
allowUpgrades: true,    // Allow transport upgrades
path: '/socket.io/',    // Explicit Socket.IO path
```

## Additional Render.com Configuration Required

### Option 1: Verify Render Service Type (Recommended)

1. Go to your Render.com dashboard
2. Select your API service (`puretrack-api`)
3. Navigate to **Settings**
4. Verify **Service Type** is set to **Web Service** (not Background Worker)
5. Ensure the **Start Command** is correct: `npm start` or `node src/index.js`

### Option 2: Add Health Check Route

Render may be killing connections. Verify health check is working:

```bash
curl https://puretrack-api.onrender.com/health
```

Should return 200 OK with service status.

### Option 3: Check Render Logs

1. Go to **Logs** tab in Render dashboard
2. Look for Socket.IO connection attempts
3. Check for any errors related to WebSocket upgrade failures

Expected log output:
```
[Socket.IO] Client authenticated
[Socket.IO] Client connected
```

### Option 4: Environment Variables

Ensure these are set in Render.com dashboard under **Environment**:

```env
NODE_ENV=production
PORT=10000
CLIENT_URL=https://smupuretrack.web.app
```

### Option 5: Add Socket.IO Specific Headers (If needed)

If the above doesn't work, you may need to add these to your server CORS config:

```javascript
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://smupuretrack.web.app');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
```

## Testing the Fix

### 1. Rebuild and Deploy Client
```powershell
cd client
npm run build
firebase deploy
```

### 2. Deploy Server to Render
```bash
# Render will auto-deploy from GitHub on push, or manually trigger:
git add .
git commit -m "fix: Socket.IO timeout issues on Render.com"
git push origin main
```

### 3. Monitor Browser Console

After deployment, open browser console (F12) and look for:

**✅ Success indicators:**
```
[Socket.IO] Initializing connection to: https://puretrack-api.onrender.com
[Socket.IO] ✅ Connected successfully
```

**Using polling (expected initially):**
```
transport: polling
```

**Upgrade to WebSocket (may happen later):**
```
transport: websocket
```

### 4. Verify in Production

Open your deployed app:
```
https://smupuretrack.web.app
```

1. Login as a user
2. Open DevTools Console (F12)
3. Check for Socket.IO connection messages
4. Navigate to different pages
5. Ensure no timeout errors appear

## Fallback: Disable Real-time Features (If All Else Fails)

If Socket.IO continues to have issues on Render's free tier, the app will still work with HTTP polling:

- ✅ All core features work (REST API)
- ✅ Data fetching via SWR hooks
- ✅ Manual refresh gets latest data
- ❌ Real-time alerts won't push automatically
- ❌ Live device readings won't update without refresh

To completely disable Socket.IO (last resort):

**In `client/src/contexts/AuthContext.tsx`:**
```typescript
// Comment out socket initialization
// await initializeSocket();
```

## Expected Behavior After Fix

1. **Initial Connection**: Client connects via HTTP long-polling (reliable)
2. **Transport Upgrade**: If WebSocket is available, Socket.IO upgrades automatically
3. **Graceful Fallback**: If WebSocket fails, stays on polling
4. **No Timeout Errors**: Connection establishes within 20 seconds
5. **Real-time Updates**: Alerts and device updates push to client

## Monitoring

Watch for these metrics:
- Connection time: Should be < 5 seconds on polling
- Transport type: `polling` initially, may upgrade to `websocket`
- Reconnection attempts: Should be 0-1 (stable connection)
- Error rate: Should be 0%

## Render.com Upgrade Consideration

If issues persist, consider upgrading to Render's **Starter** tier ($7/month):
- Better WebSocket support
- No connection timeouts
- Faster performance
- More reliable for production apps

## Support

If issues continue after implementing these fixes:

1. Check Render.com logs for specific errors
2. Verify CLIENT_URL matches Firebase hosting URL exactly
3. Test with Render's preview environments
4. Consider Railway.app or Fly.io as alternatives (better WebSocket support)
