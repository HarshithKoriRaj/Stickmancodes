# Intermittent Peer Connection Issues - Analysis & Fixes

## Problem: "Works Once, Then Doesn't Work"

This is a common WebRTC/PeerJS issue caused by:

1. **Stale Peer Connections** - Previous connection not fully cleaned up
2. **PeerJS Server Timeouts** - Cloud server connection drops
3. **Resource Leaks** - Unclosed connections holding resources
4. **ICE Negotiation Failures** - NAT/Firewall blocking on retry
5. **Browser Cache** - Old peer IDs cached

---

## Solutions Implemented

### 1. **Auto-Reconnection Logic**
- Automatically attempts reconnect up to 3 times
- Exponential backoff: 2s → 3s → 4s delays
- Shows "Reconnecting... (Attempt X/3)" status
- Prevents infinite retry loops

### 2. **Proper Cleanup**
- Clears all pending timeouts on unmount
- Properly closes peer connections
- Releases camera/audio tracks
- Nulls out video srcObjects
- Clears animation frames

### 3. **Shorter Connection Timeouts**
- Video call: 8 seconds (was 10s)
- Data connection: 12 seconds (was 15s)
- Faster detection = faster retry

### 4. **Better Error Logging**
- Console shows detailed error progression
- `[Reconnect]` tags in console
- Shows attempt numbers and delays

### 5. **Connection State Tracking**
- Tracks connection attempts
- Prevents retry loops
- Resets on successful connection

---

## How to Use

### First Connection (Should Work)
1. Create room → copy code
2. Friend joins with code
3. Both see video + "✅ Connected!"

### If Connection Drops
1. **Automatic Retry**: App automatically retries up to 3 times
2. **Check Console (F12)**: Look for `[Reconnect]` messages
3. **Wait 2-4 seconds**: Between auto-retry attempts
4. **If Still Fails**: 
   - Ask peer to create a NEW room
   - Copy NEW code and join fresh

### Recovery Steps
```
Attempt 1: Immediate (should fail)
  ↓ (wait 2 seconds)
Attempt 2: Shows "Reconnecting... (Attempt 2/3)"
  ↓ (wait 3 seconds)
Attempt 3: Shows "Reconnecting... (Attempt 3/3)"
  ↓ (wait 4 seconds)
If still fails: Try new room code
```

---

## Debugging Tips

### Check Console (F12 → Console)
```
[joinRoom] Attempting to connect...
[Call] Received remote stream
[Data Connection] Opened successfully
✅ Connected! Use your hands to draw!
```

### If Seeing Reconnect Messages
```
[joinRoom] Call timeout - attempting reconnect
[Reconnect] Attempting reconnection in 2000ms (attempt 1/3)
[joinRoom] Data connection timeout - attempting reconnect
[Reconnect] Attempting reconnection in 3000ms (attempt 2/3)
```

### If Connection Fails After 3 Attempts
```
Connection failed after 3 attempts. 
Try creating a new room and having your peer create a new code.
```

---

## Why This Happens

### Root Cause: PeerJS Server Flakiness
- PeerJS cloud signaling server can be slow/unreliable
- First connection often works (clean state)
- Second connection sometimes fails (server still processing first)
- Reconnect logic helps bridge these gaps

### Network Conditions
- Weak WiFi/mobile networks trigger timeouts
- Firewall/NAT blocking certain connections
- ISP throttling or packet loss
- Geographic distance from STUN servers

### Browser Issues
- Background tabs get deprioritized
- Memory pressure kills connections
- Cache conflicts with old peer IDs
- Autoplay policy restrictions

---

## Recommended Workflow

### For Reliable Connections:
1. **Both peers refresh page** first
2. **Create new room** (don't reuse old code)
3. **Join immediately** (within 30 seconds)
4. **Both allow permissions** (camera + microphone)
5. **Wait for "✅ Connected!"** message
6. **Check console** for any errors

### If Keep Failing:
1. Refresh page (clear state)
2. Close other tabs (free memory)
3. Check internet connection
4. Try different WiFi/network
5. Try different browser (Chrome is most reliable)

---

## Technical Details

### Connection Lifecycle
```
1. Create Peer (get unique ID)
2. Join Room (enter remote peer ID)
3. Call Remote (establish media stream)
4. Receive Stream (video appears)
5. Connect Data Channel (drawing sync)
6. Open Data Channel (ready to draw)
```

### Timeout Values
- **Call Timeout**: 8 seconds (video call establishment)
- **Data Connection Timeout**: 12 seconds (data channel opening)
- **Retry Delays**: 2s, 3s, 4s (exponential backoff)
- **Max Attempts**: 3 (prevents infinite loops)

### What Gets Cleaned Up
```javascript
- Peer instance (destroy)
- Media streams (stop all tracks)
- Video elements (pause + srcObject = null)
- Audio contexts (close if open)
- Animation frames (cancel)
- Pending timeouts (clear)
- Connection references (clear)
```

---

## Known Limitations

### Cannot Fix (PeerJS Server Issues)
- PeerJS cloud server downtime
- Rate limiting from PeerJS
- Geographic routing delays
- Extreme NAT/Firewall restrictions

### Requires TURN Server (Advanced)
For very restrictive networks, you'd need:
- Self-hosted TURN server
- Or paid TURN service
- This ensures 100% connectivity but costs money

### Browser Specific
- Safari has limited WebRTC support
- Internet Explorer not supported
- Chrome is most reliable
- Firefox works but slightly slower

---

## Next Steps If Still Issues

If the auto-reconnect doesn't solve it:

1. **Switch to self-hosted PeerJS server**
   - More control and reliability
   - Requires backend setup
   
2. **Add TURN server**
   - Fallback for NAT-restrictive networks
   - Increases success rate significantly

3. **Implement heartbeat/keep-alive**
   - Detect dropped connections sooner
   - Proactively reconnect

4. **Use different signaling server**
   - Switch from PeerJS to raw WebRTC
   - More complex but more control

---

## Files Modified
- `CollaborationRoom.tsx`: Added auto-reconnect logic

## Changes Summary
✅ Auto-reconnection (up to 3 attempts)
✅ Exponential backoff (2s, 3s, 4s delays)
✅ Better cleanup on unmount
✅ Shorter timeouts (trigger faster)
✅ Better error logging
✅ Connection state tracking

---

Last Updated: November 16, 2025
