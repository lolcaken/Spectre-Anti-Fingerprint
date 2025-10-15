// ==UserScript==
// @name         Spectre: Final Edition
// @namespace    http://tampermonkey.net/
// @version      16.1
// @description  The ultimate anti-fingerprinting script. Features advanced timing fuzzing and request wrapping.
// @author       You & Z.ai
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// ==/UserScript==

/* WARNING: This is a powerful tool designed to maximize privacy. It may break website functionality. */

(function() {
    'use strict';

    const DEBUG = false;
    const persona = getOrCreatePersona();
    const sessionSeed = Math.floor(Math.random() * 4294967296);

    function log(...args) { if (DEBUG) console.debug("[Spectre DEBUG]", ...args); }

    // --- PERSONA & PROFILE MANAGEMENT ---
    function getOrCreatePersona() {
        let p = GM_getValue('spectrePersona');
        if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { p = null; } }
        if (!p) {
            const cohorts = [
                { id: 0, ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.5845.96 Safari/537.36', version: 116, lang: 'en-US' },
                { id: 1, ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.5790.170 Safari/537.36', version: 115, lang: 'en-US' },
            ];
            p = cohorts[Math.floor(Math.random() * cohorts.length)];
            p.masterSeed = Math.floor(Math.random() * 4294967296);
            GM_setValue('spectrePersona', JSON.stringify(p));
        }
        return p;
    }

    // --- CRYPTOGRAPHIC PRNG SYSTEM ---
    async function deriveSeed(masterSeed, domain, label) {
        const enc = new TextEncoder();
        const data = enc.encode(`${masterSeed}|${domain}|${label}|${sessionSeed}`);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return new DataView(digest).getUint32(0, false);
    }

    function createPRNG(seed) {
        return function mulberry32() {
            let t = seed += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    // --- CORE SPOOFING HELPERS ---
    function overrideProperty(obj, propName, getter) {
        try {
            const desc = Object.getOwnPropertyDescriptor(obj, propName);
            if (desc && !desc.configurable) { log(`Cannot override non-configurable: ${propName}`); return; }
            Object.defineProperty(obj, propName, { get: getter, configurable: true });
        } catch (e) { log(`Could not override ${propName}:`, e); }
    }

    // --- SPOOFING IMPLEMENTATIONS ---
    function spoofNavigator() {
        overrideProperty(window.navigator, 'userAgent', () => persona.ua);
        overrideProperty(window.navigator, 'platform', () => 'Win32');
        overrideProperty(window.navigator, 'product', () => 'Gecko');
        overrideProperty(window.navigator, 'productSub', () => '20030107');
        overrideProperty(window.navigator, 'vendor', () => 'Google Inc.');
        overrideProperty(window.navigator, 'vendorSub', () => '');
        overrideProperty(window.navigator, 'hardwareConcurrency', () => 8);
        overrideProperty(window.navigator, 'deviceMemory', () => 8);
        overrideProperty(window.navigator, 'language', () => persona.lang);
        overrideProperty(window.navigator, 'languages', () => [persona.lang, 'en']);
        overrideProperty(window.navigator, 'maxTouchPoints', () => 0);
        overrideProperty(window.navigator, 'webdriver', () => undefined);
        overrideProperty(navigator, 'appName', () => 'Netscape');
        overrideProperty(navigator, 'appCodeName', () => 'Mozilla');
        overrideProperty(navigator, 'appVersion', () => `5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${persona.version}.0.0.0 Safari/537.36`);
        overrideProperty(navigator, 'mimeTypes', () => []);
        overrideProperty(navigator, 'doNotTrack', () => '1');
    }

    function spoofScreen() {
        overrideProperty(window.screen, 'width', () => 1920);
        overrideProperty(window.screen, 'height', () => 1080);
        overrideProperty(window.screen, 'availWidth', () => 1920);
        overrideProperty(window.screen, 'availHeight', () => 1040);
        overrideProperty(window.screen, 'colorDepth', () => 24);
        overrideProperty(window.screen, 'pixelDepth', () => 24);
    }

    function spoofTimezone() {
        Date.prototype.getTimezoneOffset = () => 0;
        const origResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
        Intl.DateTimeFormat.prototype.resolvedOptions = function() {
            const ro = origResolvedOptions.call(this);
            ro.timeZone = 'UTC';
            return ro;
        };
    }

    function spoofPlugins() {
        const pluginList = [
            { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
        ];
        const plugins = {};
        Object.defineProperty(plugins, 'length', { value: pluginList.length, configurable: true });
        pluginList.forEach((p, i) => {
            Object.defineProperty(plugins, i, { value: p, configurable: true });
            Object.defineProperty(plugins, p.name, { value: p, configurable: true });
        });
        plugins.item = function(i){ return this[i] || null; };
        plugins.namedItem = function(name){ return Object.values(this).find(p => p && p.name === name) || null; };
        overrideProperty(navigator, 'plugins', () => plugins);
    }

    function spoofFonts() {
        const fontFaceMock = { family: 'Arial', load: () => Promise.resolve() };
        const fontsMock = {
            values: () => [fontFaceMock], then: resolve => resolve([fontFaceMock]),
            addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => {},
            load: (font) => Promise.resolve(fontFaceMock)
        };
        overrideProperty(navigator, 'fonts', () => fontsMock);
    }

    async function spoofCanvas() {
        const seed = await deriveSeed(persona.masterSeed, window.location.hostname, 'canvas');
        const canvasPRNG = createPRNG(seed);
        const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
        const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
        CanvasRenderingContext2D.prototype.getImageData = function(...args) {
            const image = origGetImageData.apply(this, args);
            try {
                const data = image.data;
                for (let i=0; i<data.length; i+=4) {
                    if (canvasPRNG() < 0.0005) {
                        const n = (canvasPRNG()-0.5)*4;
                        data[i] = clamp(data[i]+n,0,255);
                        data[i+1] = clamp(data[i+1]+n,0,255);
                        data[i+2] = clamp(data[i+2]+n,0,255);
                    }
                }
            } catch(e){/*tainted*/ }
            return image;
        };
    }

    function spoofWebGL() {
        const UNMASKED_VENDOR_WEBGL = 37445;
        const UNMASKED_RENDERER_WEBGL = 37446;
        const webglVendor = 'Google Inc. (Google)';
        const webglRenderer = 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)';
        const commonExtensions = ['ANGLE_instanced_arrays', 'EXT_blend_minmax', 'EXT_texture_filter_anisotropic', 'OES_element_index_uint', 'OES_standard_derivatives', 'OES_texture_float', 'OES_texture_float_linear', 'OES_vertex_array_object', 'WEBGL_compressed_texture_s3tc', 'WEBGL_depth_texture', 'WEBGL_draw_buffers', 'WEBGL_lose_context'];
        const commonShaderPrecision = { rangeMin: 0, rangeMax: 0, precision: 0 };
        [WebGLRenderingContext, WebGL2RenderingContext].forEach(context => {
            if (!context) return;
            overrideProperty(context.prototype, 'getParameter', function(p) {
                if (p === UNMASKED_VENDOR_WEBGL) return webglVendor;
                if (p === UNMASKED_RENDERER_WEBGL) return webglRenderer;
                const originalGetParameter = Object.getPrototypeOf(context.prototype).getParameter;
                return originalGetParameter.call(this, p);
            });
            overrideProperty(context.prototype, 'getShaderPrecisionFormat', () => commonShaderPrecision);
            overrideProperty(context.prototype, 'getSupportedExtensions', () => commonExtensions);
        });
    }

    async function spoofAudio() {
        const seed = await deriveSeed(persona.masterSeed, window.location.hostname, 'audio');
        const audioPRNG = createPRNG(seed);
        const originalGetChannelData = AudioBuffer.prototype.getChannelData;
        AudioBuffer.prototype.getChannelData = function(...args) {
            const channelData = originalGetChannelData.apply(this, args);
            for (let i = 0; i < channelData.length; i++) {
                if (audioPRNG() < 0.001) {
                    channelData[i] += (audioPRNG() - 0.5) * 1e-6;
                }
            }
            return channelData;
        };
        overrideProperty(AudioContext.prototype, 'sampleRate', () => 48000);
        const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
        AudioContext.prototype.createAnalyser = function() {
            const analyser = originalCreateAnalyser.call(this);
            Object.defineProperty(analyser, 'fftSize', { value: 2048, configurable: true });
            Object.defineProperty(analyser, 'frequencyBinCount', { value: 1024, configurable: true });
            Object.defineProperty(analyser, 'minDecibels', { value: -100, configurable: true });
            Object.defineProperty(analyser, 'maxDecibels', { value: -30, configurable: true });
            Object.defineProperty(analyser, 'smoothingTimeConstant', { value: 0.8, configurable: true });
            return analyser;
        };
    }

    function spoofAudioFormats() {
        const origCanPlay = HTMLAudioElement.prototype.canPlayType;
        HTMLAudioElement.prototype.canPlayType = function(type) {
            if (!type) return '';
            switch (type) {
                case 'audio/aac':
                case 'audio/flac':
                case 'audio/mpeg':
                    return 'maybe';
                case 'audio/ogg; codecs="flac"':
                case 'audio/ogg; codecs="vorbis"':
                case 'audio/ogg; codecs="opus"':
                case 'audio/wav; codecs="1"':
                case 'audio/webm; codecs="vorbis"':
                case 'audio/webm; codecs="opus"':
                case 'audio/mp4; codecs="mp4a_40_2"':
                    return 'probably';
                default:
                    return '';
            }
        };
    }

    function spoofNukedAPIs() {
        overrideProperty(navigator, 'keyboard', () => undefined);
        overrideProperty(navigator, 'getBattery', () => undefined);
        overrideProperty(navigator, 'connection', () => undefined);
    }

    async function spoofMediaDevices() {
        const mediaMock = {
            enumerateDevices: () => Promise.resolve([]),
            getUserMedia: (constraints) => Promise.reject(new DOMException('Permission denied','NotAllowedError'))
        };
        overrideProperty(navigator, 'mediaDevices', () => mediaMock);
    }

    async function spoofBehavior() {
        const seed = await deriveSeed(persona.masterSeed, window.location.hostname, 'behavior');
        const behaviorPRNG = createPRNG(seed);
        function tinyMouseJitter() {
            if (behaviorPRNG() > 0.002) return;
            const rect = document.body.getBoundingClientRect();
            const e = new MouseEvent('mousemove', { clientX: rect.left + 100 + behaviorPRNG() * 10, clientY: rect.top + 100 + behaviorPRNG() * 10, bubbles: true });
            document.dispatchEvent(e);
        }
        setInterval(tinyMouseJitter, 5000);
    }

    // --- NEW HIGH-PRIORITY SPOOFING FUNCTIONS ---

    // 1. High-res timer fuzzing
    async function spoofTimers() {
        const seed = await deriveSeed(persona.masterSeed, window.location.hostname, 'timers');
        const prng = createPRNG(seed);
        const origNow = performance.now.bind(performance);
        performance.now = function() {
            const raw = origNow();
            const jitter = (prng() - 0.5) * 0.5;
            return Math.round((raw + jitter) * 1) / 1;
        };
        const origTimeOrigin = performance.timeOrigin;
        Object.defineProperty(performance, 'timeOrigin', {
            get: () => Math.round(origTimeOrigin)
        });
    }

    // 3. Fetch/XHR wrapper
    function spoofRequests() {
        const origFetch = window.fetch.bind(window);
        window.fetch = function(input, init = {}) {
            init = Object.assign({}, init);
            init.cache = init.cache || 'no-store';
            if (init.headers) {
                if (init.headers['X-Custom-Header']) {
                    delete init.headers['X-Custom-Header'];
                }
            }
            return origFetch(input, init);
        };

        const OriginalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new OriginalXHR();
            const originalOpen = xhr.open;
            xhr.open = function(method, url, ...args) {
                if (method.toUpperCase() === 'GET') {
                    const separator = url.includes('?') ? '&' : '?';
                    url += `${separator}_spectre=${Date.now()}`;
                }
                return originalOpen.call(this, method, url, ...args);
            };
            return xhr;
        };
    }

    // --- ADVANCED WEBRTC FILTER (from v15.0) ---
    function spoofWebRTCStealthily() {
        const OriginalRTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
        if (!OriginalRTCPeerConnection) return;
        const PrivateIPRegex = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])|169\.254\.|::1$|fe80:)/i;
        const WrappedRTCPeerConnection = function(pcConfig, pcConstraints) {
            const config = { ...pcConfig, iceTransportPolicy: "relay" };
            const pc = new OriginalRTCPeerConnection(config, pcConstraints);
            const originalOnIceCandidate = pc.onicecandidate;
            pc.onicecandidate = (event) => {
                if (event.candidate && event.candidate.candidate) {
                    const candidate = event.candidate.candidate;
                    if (PrivateIPRegex.test(candidate.split(' ')[4])) {
                        log(`Filtered private ICE candidate: ${candidate}`);
                        return;
                    }
                }
                if (typeof originalOnIceCandidate === 'function') {
                    originalOnIceCandidate.call(pc, event);
                }
            };
            return pc;
        };
        Object.setPrototypeOf(WrappedRTCPeerConnection, OriginalRTCPeerConnection);
        Object.defineProperty(WrappedRTCPeerConnection, 'name', { value: 'RTCPeerConnection' });
        ['RTCPeerConnection', 'webkitRTCPeerConnection', 'mozRTCPeerConnection'].forEach(name => {
            if (window[name]) {
                Object.defineProperty(window, name, {
                    value: WrappedRTCPeerConnection,
                    configurable: true, writable: true, enumerable: false
                });
            }
        });
    }

    // --- INITIALIZATION ---
    async function init() {
        spoofNavigator(); spoofScreen(); spoofTimezone(); spoofPlugins(); spoofFonts();
        await spoofCanvas(); spoofWebGL(); await spoofAudio(); spoofAudioFormats();
        spoofNukedAPIs();
        spoofWebRTCStealthily();
        await spoofMediaDevices();
        // Add the remaining high-priority spoofing functions
        await spoofTimers();
        spoofRequests();
        if (document.readyState === 'complete') await spoofBehavior();
        else window.addEventListener('load', () => spoofBehavior());
        console.log("[Spectre: Final Edition v16.1] Engaged. Advanced stealth features are active.");
    }

    init();
})();