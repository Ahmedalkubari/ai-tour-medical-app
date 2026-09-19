# Mobile (Capacitor) — honest status
Ready: `capacitor.config.json`, PWA manifest + service worker (full offline bundle: HTML/CSS/JS + audit + SVG diagrams; DB served via API when online, embedded demo when offline).
Icons: `assets/icon.svg` (source). Generate PNGs with Android Studio Image Asset / `npx @capacitor/assets` (requires npm + network).
Build (needs Android Studio / Xcode — NOT available in this environment):
```
npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap add android; npx cap add ios; npx cap sync; npx cap open android
```
Notifications: local review reminders via Notification API (web) → `@capacitor/local-notifications` on device.
