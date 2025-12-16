# 📱 PWA Installation Guide - FINARA

## ✅ PWA Setup Checklist

### Current Status:

- ✅ Manifest.json configured
- ✅ Icons (72x72 to 512x512) available
- ✅ Service Worker enabled (via @ducanh2912/next-pwa)
- ✅ Meta tags configured
- ✅ HTTPS ready (required for production)
- ✅ Offline support configured
- ✅ Shortcuts configured (Kasir, Dashboard, Inventaris)

---

## 🖥️ Install PWA di Desktop

### **Google Chrome / Edge (Windows/Mac/Linux)**

1. **Buka aplikasi di browser:**

   ```
   http://localhost:3000
   ```

   atau

   ```
   https://yourdomain.com
   ```

2. **Cara Install:**

   **Metode 1 - Address Bar:**
   - Lihat icon **⊕ Install** atau **💻** di address bar (sebelah kanan)
   - Klik icon tersebut
   - Klik "Install" di dialog popup

   **Metode 2 - Menu Browser:**
   - Chrome: ⋮ (3 dots) → "Install FINARA..."
   - Edge: ⋯ (3 dots) → "Apps" → "Install FINARA"

   **Metode 3 - Keyboard Shortcut:**
   - Windows/Linux: `Ctrl + Shift + A`
   - Mac: `Cmd + Shift + A`

3. **Setelah Install:**
   - Aplikasi akan terbuka di window terpisah (seperti native app)
   - Icon akan muncul di:
     - Windows: Start Menu & Desktop
     - Mac: Applications folder & Dock
     - Linux: App launcher

---

### **Firefox (Windows/Mac/Linux)**

Firefox tidak support PWA installation secara native. Alternatives:

- Use Chrome/Edge untuk install
- Use browser extension: "PWA for Firefox"

---

### **Safari (Mac)**

1. Buka aplikasi di Safari
2. Menu → "File" → "Add to Dock"
3. Aplikasi akan muncul di Dock sebagai web app

---

## 📱 Install PWA di Mobile

### **Android (Chrome/Samsung Internet)**

1. Buka `https://yourdomain.com` di browser
2. Menu (⋮) → "Add to Home screen" atau "Install app"
3. Confirm installation
4. Icon akan muncul di home screen

**Auto-prompt:**

- Setelah beberapa kali visit, browser akan auto-prompt untuk install

---

### **iOS (Safari)**

1. Buka `https://yourdomain.com` di Safari
2. Tap tombol **Share** (icon kotak dengan panah ke atas)
3. Scroll down, tap **"Add to Home Screen"**
4. Tap "Add"
5. Icon akan muncul di home screen

**Note:** iOS hanya support PWA via Safari, bukan Chrome/Firefox

---

## 🧪 Testing PWA Installation

### **1. Check Manifest**

```bash
# Open browser DevTools (F12)
# Navigate to: Application → Manifest
# Verify all fields are correct
```

**Expected Values:**

- Name: "FINARA - Sistem Manajemen Ritel & Gudang"
- Short Name: "FINARA"
- Start URL: "/"
- Display: "standalone"
- Icons: 72x72 to 512x512 (8 icons)

---

### **2. Check Service Worker**

```bash
# Open browser DevTools (F12)
# Navigate to: Application → Service Workers
# Status should be: "activated and running"
```

**Expected:**

- Service Worker URL: `/sw.js`
- Status: ✅ Activated and running
- Scope: `/`

---

### **3. Lighthouse PWA Audit**

```bash
# Open browser DevTools (F12)
# Navigate to: Lighthouse
# Select "Progressive Web App"
# Click "Generate report"
```

**Target Score:** > 90/100

**Key Metrics:**

- ✅ Registers a service worker
- ✅ Responds with 200 when offline
- ✅ Has a web app manifest
- ✅ Has icons for installation
- ✅ Uses HTTPS
- ✅ Configured for custom splash screen

---

### **4. Manual Installation Test**

**Desktop (Chrome):**

```
1. Open http://localhost:3000 (development)
   OR https://yourdomain.com (production)
2. Look for install icon in address bar (right side)
3. Click install
4. Verify app opens in standalone window
5. Check: No browser UI (address bar, tabs)
6. Verify: App icon in Start Menu/Applications
```

**Mobile (Android):**

```
1. Visit site 2-3 times
2. Wait for install prompt (or use menu → "Add to Home screen")
3. Install app
4. Open from home screen
5. Verify: Standalone mode (no browser UI)
6. Test: Offline functionality
```

---

## 🚀 Development Testing

### **Start Dev Server with PWA Enabled:**

```bash
npm run dev
```

**Console Output Should Show:**

```
○ (pwa) PWA support is enabled
✓ Ready in 3.6s
```

### **Build for Production:**

```bash
npm run build
npm start
```

Service worker will be generated at: `public/sw.js`

---

## 🔧 Troubleshooting

### **Issue: Install button tidak muncul**

**Solutions:**

1. **Check HTTPS:** PWA requires HTTPS (except localhost)

   ```
   ❌ http://192.168.1.x:3000 → Won't show install
   ✅ http://localhost:3000 → Will show install
   ✅ https://domain.com → Will show install
   ```

2. **Clear Cache:**

   ```
   Chrome: Settings → Privacy → Clear browsing data
   Select: Cached images and files
   ```

3. **Check Console for Errors:**

   ```
   F12 → Console tab
   Look for manifest or service worker errors
   ```

4. **Verify manifest.json loads:**
   ```
   Open: http://localhost:3000/manifest.json
   Should return JSON (not 404)
   ```

---

### **Issue: Service Worker tidak register**

**Solutions:**

1. **Check next.config.ts:**

   ```typescript
   disable: false, // Must be false to enable PWA
   ```

2. **Rebuild:**

   ```bash
   rm -rf .next
   npm run build
   npm start
   ```

3. **Check Service Worker in DevTools:**
   ```
   F12 → Application → Service Workers
   If "No service workers", check console for errors
   ```

---

### **Issue: Icon tidak muncul di desktop**

**Solutions:**

1. **Verify icons exist:**

   ```bash
   ls public/icons/
   # Should show: icon-192x192.png, icon-512x512.png, etc.
   ```

2. **Check icon paths in manifest:**

   ```json
   "icons": [
     {
       "src": "/icons/icon-192x192.png",  // Must start with /
       "sizes": "192x192"
     }
   ]
   ```

3. **Clear app cache and reinstall:**
   ```
   Uninstall app → Clear browser cache → Reinstall
   ```

---

### **Issue: Offline mode tidak bekerja**

**Solutions:**

1. **Check Service Worker active:**

   ```
   F12 → Application → Service Workers
   Status should be "activated and running"
   ```

2. **Test offline mode:**

   ```
   F12 → Network tab → Set "Offline"
   Refresh page → Should still load (cached)
   ```

3. **Check workbox caching strategy:**
   ```typescript
   // In next.config.ts
   runtimeCaching: [
     {
       urlPattern: /^https?:\/\/.*/i,
       handler: "NetworkFirst", // Try network first, fallback to cache
     },
   ];
   ```

---

## 📊 PWA Requirements Checklist

### **Minimum Requirements:**

- ✅ HTTPS (or localhost for testing)
- ✅ manifest.json with required fields
- ✅ Service worker registered
- ✅ Icons (192x192 and 512x512 minimum)
- ✅ start_url and scope defined
- ✅ display: "standalone" or "fullscreen"

### **Recommended:**

- ✅ Theme color configured
- ✅ Background color configured
- ✅ Shortcuts defined
- ✅ Offline support
- ✅ Meta tags for mobile browsers
- ✅ Apple touch icon

### **Optional (Nice to have):**

- ⬜ Screenshots (for app stores)
- ⬜ Categories defined
- ⬜ Related applications
- ⬜ Push notifications
- ⬜ Background sync

---

## 🎯 Next Steps After Installation

### **1. Verify Installed App:**

```
Windows: Start Menu → Search "FINARA"
Mac: Spotlight → Search "FINARA"
Linux: App launcher → Search "FINARA"
```

### **2. Test Standalone Mode:**

- App should open without browser UI
- No address bar, tabs, or bookmarks
- Full screen experience

### **3. Test Offline:**

- Open app
- Disconnect internet
- Navigate between pages
- Should still work (cached pages)

### **4. Test Shortcuts:**

Right-click app icon → Should show:

- Kasir (POS)
- Dashboard
- Inventaris

---

## 📱 User Experience

### **Desktop App Behavior:**

- Opens in standalone window (no browser UI)
- Can pin to taskbar
- Appears in Alt+Tab / Cmd+Tab
- Can set as default app for URLs (advanced)

### **Mobile App Behavior:**

- Full screen (hides status bar in iOS)
- Splash screen on launch
- Native-like animations
- Can receive push notifications
- Background sync support

---

## 🔍 Verification Commands

### **Check if PWA is Installable:**

```javascript
// Open DevTools Console (F12)
window.addEventListener("beforeinstallprompt", (e) => {
  console.log("PWA is installable!");
});

// If message appears, PWA meets installation criteria
```

### **Check Service Worker Status:**

```javascript
// Open DevTools Console (F12)
navigator.serviceWorker.getRegistrations().then((registrations) => {
  console.log("Service Workers:", registrations.length);
  registrations.forEach((reg) => {
    console.log("SW Scope:", reg.scope);
    console.log("SW Active:", reg.active?.state);
  });
});
```

---

## 📚 Additional Resources

- [Next PWA Documentation](https://github.com/DuCanhGH/next-pwa)
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [MDN Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [PWA Builder](https://www.pwabuilder.com/)

---

**Last Updated:** December 16, 2025  
**PWA Status:** ✅ Configured and Ready for Installation  
**Tested Browsers:** Chrome, Edge, Safari, Samsung Internet
