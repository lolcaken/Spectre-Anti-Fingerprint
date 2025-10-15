# Spectre: Final Edition v16.1

**The ultimate anti-fingerprinting userscript.**  
Transforms your browser into a highly stealthy digital ghost by spoofing nearly every fingerprintable vector. Warning: this may break websites. 😎

---

## Features

### 1. Persona Management
- Generates a **per-session, per-domain persona**.
- Rotates **User-Agent**, **language**, **hardwareConcurrency**, and more.
- Stores persona in **persistent storage** using `GM_setValue`.

### 2. Navigator & Environment Spoofing
- Overrides `navigator` properties: userAgent, platform, appVersion, deviceMemory, languages, and more.
- Spoofs `screen` dimensions and `colorDepth`.
- Normalizes `timezone` and date-related functions.

### 3. Canvas & WebGL Hardening
- Adds **tiny, per-session noise** to canvas rendering (`getImageData`) to defeat fingerprinting.
- Spoofs **WebGL vendor, renderer**, and shader precision.
- Returns consistent supported extensions.

### 4. Audio Fingerprinting Defense
- Fuzzes **AudioBuffer.getChannelData**.
- Spoofs **sample rate**, FFT size, frequency bins, decibel range, and smoothing constants.
- Mocks supported audio formats (`canPlayType`).

### 5. Media & Peripheral Spoofing
- Stubs `navigator.mediaDevices`, denies all `getUserMedia` requests.
- Nukes `navigator.keyboard`, `getBattery`, and `connection`.

### 6. Behavioral Hardening
- Simulates **tiny, random mouse movements** for behavioral fingerprinting resistance.

### 7. High-Resolution Timer Fuzzing
- Jitters `performance.now()` and `performance.timeOrigin` to prevent timing attacks.
- Intercepts `requestAnimationFrame` (optional tweak possible in future).

### 8. Fetch & XHR Wrappers
- Appends `_spectre` query parameter to GET requests.
- Normalizes headers and disables custom tracking headers.
- Sets default `cache: 'no-store'`.

### 9. WebRTC Stealth
- Forces `iceTransportPolicy: "relay"` to hide local IPs.
- Filters **private IPs** in ICE candidates.

---

## Installation

1. Install a userscript manager like **Tampermonkey** or **Violentmonkey**.  
2. Create a new userscript and paste the code from `Spectre: Final Edition v16.1`.  
3. Save and enable the script.  
4. Visit any website and enjoy your invisible digital persona 🫣.

---

## Warnings

- This is **extremely aggressive**; many websites may break.
- **High CPU usage** possible on sites with heavy canvas/WebGL activity.
- Script is intended for **privacy research** and **testing**.

---

## Changelog

- **v16.1**: Added advanced **timing fuzzing** and **fetch/XHR wrappers**.  
- Previous versions improved **canvas**, **WebGL**, **audio**, and **behavior spoofing**.

---

## Notes

- This script does **not provide VPN** or network encryption. Combine with a VPN for full stealth.  
- Best used in combination with privacy-conscious extensions and hardened browsers.

---

## Author

You & Z.ai 🧙‍♂️  
For total digital ghosting domination.
