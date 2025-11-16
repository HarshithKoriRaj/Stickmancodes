# AI Coding Games - Setup & Troubleshooting Guide

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
cd /Users/harshithkoriraj/Downloads/ai-coding-games
npm install
```

### 2. Configure API Keys

#### For Voice Assistant (Optional but Recommended)
1. Go to: https://aistudio.google.com/app/apikeys
2. Click "Create API Key"
3. Copy the API key
4. Create a `.env.local` file in the root directory:
```bash
VITE_GEMINI_API_KEY=your_api_key_here
```

**Note**: The `.env.example` file shows the required format.

### 3. Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

---

## 🎮 Features & How to Use

### Collaboration Room (Hand Drawing)
1. Navigate to "Collaboration Room"
2. Click **"Create Room"** → Share the 8-character code
3. Friend opens the app → Enter code → Click **"Join Room"**
4. Both should see each other's video feeds
5. Enable **Hand Mode** → Pinch thumb + index finger to draw
6. Drawings sync in real-time

**Hand Tracking Tips:**
- Keep hand in front of camera
- Ensure good lighting
- Pinch = Draw, Release = Stop drawing
- Toggle to **Mouse Mode** if hand tracking fails

### Voice Assistant (Optional)
1. Click the **🎙️ Talk to Stickman** button (bottom right)
2. Allow microphone permission
3. Start speaking
4. The AI responds with voice + text

**Note**: Requires Google Gemini API key (see setup above)

---

## ⚠️ Troubleshooting

### Issue: "Peer error: peer-unavailable"
**Cause**: The room code is invalid, expired, or peer is offline

**Solutions:**
1. Create a NEW room code (refresh the page)
2. Share the code IMMEDIATELY with peer
3. Peer joins within 30 seconds
4. Check both have internet connection
5. Check browser console (F12) for detailed errors

**Technical Details:**
- Peer codes expire after inactivity
- PeerJS server has connection timeout
- Network/Firewall may block P2P
- Multiple STUN servers added for fallback

### Issue: Video not showing up
**Cause**: Camera permission denied or hardware issue

**Solutions:**
1. Check browser permission (Chrome → Settings → Privacy → Camera)
2. Try reloading the page
3. Ensure no other app is using the camera
4. Check that you're on `localhost` or HTTPS

### Issue: Drawing not syncing between peers
**Cause**: Data connection failed or not established

**Solutions:**
1. Wait 15 seconds for data connection to establish
2. Check error message at bottom of screen
3. Try recreating the room
4. Check browser console for `[Data Connection Error]`

### Issue: Voice Assistant not working
**Cause**: API key not configured or microphone denied

**Solutions:**
1. Check `.env.local` file exists with valid API key
2. Allow microphone permission when prompted
3. Check browser console (F12) for error messages
4. Ensure you have internet connection
5. API key must be valid and not rate-limited

**To get API key:**
- Go to: https://aistudio.google.com/app/apikeys
- Create a new API key
- Check that it's enabled and has quota available

---

## 🔧 Technical Details

### Browser Support
- ✅ Chrome/Chromium (recommended)
- ✅ Firefox
- ✅ Safari (some features may be limited)
- ❌ Internet Explorer (not supported)

### Network Requirements
- **Minimum**: 1 Mbps upload/download
- **Recommended**: 3+ Mbps for smooth video
- **Protocol**: WebRTC (P2P), requires UDP ports open
- **STUN Servers**: 5 Google STUN servers configured for fallback

### Environment Variables

**Required for Voice Assistant:**
```
VITE_GEMINI_API_KEY=your_api_key_here
```

**Optional for Debugging:**
```
DEBUG=* (enable verbose logging)
```

---

## 📋 Console Debugging

Open DevTools (F12 → Console) to see detailed logs:

**PeerJS Events:**
- `[PeerJS] Peer opened with ID: ...`
- `[PeerJS Error] ...`
- `[Call Closed]`
- `[Data Connection Closed]`

**Voice Assistant Events:**
- `[Voice Assistant] Connection opened`
- `[Voice Assistant] Session Error: ...`
- `[Voice Assistant] Failed to start session: ...`

**Camera/Video Events:**
- `Local video play() failed (autoplay?)`
- `Remote video play() failed (autoplay?)`
- `getUserMedia Error: ...`

---

## 🔐 Security Notes

- **API Keys**: Never commit `.env.local` to version control (add to `.gitignore`)
- **HTTPS**: In production, ensure HTTPS is enabled (getUserMedia requires secure context)
- **Permissions**: Browser will ask for camera/microphone - this is required for the app
- **PeerJS**: Uses public PeerJS cloud server - be aware data transits through their servers

---

## 📞 Support

If you encounter issues:

1. **Check browser console** (F12) for error messages
2. **Refresh the page** and try again
3. **Create a NEW room code** - old ones may have expired
4. **Check internet connection** - must be stable for P2P
5. **Try different browser** - some have better WebRTC support
6. **Clear browser cache** - may have stale config

---

## 🚀 Performance Tips

- **Hand Tracking**: Enable only when needed (faster app)
- **Video Quality**: Lower resolution if experiencing lag
- **Network**: Close other bandwidth-heavy apps
- **Lighting**: Better lighting = better hand detection
- **Distance**: Stand 1-2 feet from camera for best detection

---

## 🔄 Build & Deploy

**Build for production:**
```bash
npm run build
```

**Preview production build:**
```bash
npm run preview
```

The app is ready to deploy to any static hosting (Vercel, Netlify, etc.)

---

Last Updated: November 16, 2025
