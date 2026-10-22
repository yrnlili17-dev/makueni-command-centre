# Install Makueni Command Centre

Open the deployed HTTPS site online, then choose **Install app** on the landing page or inside the workspace. Android Chrome and supported desktop browsers may show an install prompt. On iPhone/iPad, use Safari → Share → Add to Home Screen. Browser support and device settings determine whether the prompt is available; this is a PWA, not an APK or App Store package.

The app saves its versioned, public HTML/JavaScript/CSS/icons on the device. Subsequent launches reuse these files rather than downloading the whole interface again. The current build precaches only explicitly listed static assets. API responses, authentication, uploads, contacts and report submissions are never put into the service-worker cache.

An already-open workspace shows an offline indicator if the device loses connectivity. A new navigation without connectivity opens a dedicated offline screen rather than presenting stale private records or a failed login as a working dashboard. Sign-in, live records and submitting reports still need connectivity. There is no offline report queue or background submission in this change. Confirm that a report saved before leaving its form. Browser storage can be cleared/evicted by the user or operating system.

Updates are downloaded separately. When **Update app** appears, save unfinished work, then reload to activate the new version. Installation never resets or migrates database records.

Small-screen changes include touch targets, safe-area spacing, zoom support, wrapped module headers, reduced grid columns, scrollable wide tables and a viewport-bounded AI drawer. The layout remains adaptable to tablet, desktop, portrait and landscape rather than locking orientation.

## Validation

Automated worker tests check static cache reuse, API/write/upload exclusions, offline navigation, cache cleanup, controlled updates, base paths, manifest icons and preserved zoom. Production build output must contain `sw.js`, `offline.html`, the manifest and both install icons, with its current hashed JS/CSS files in the precache list. Physical-device installation and field connectivity testing remain acceptance checks after deployment.
