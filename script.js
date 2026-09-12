/**
 * NER-LIS — Interactive Full-Page Scroll Background Engine
 *
 * FEATURES:
 *  - #bg-canvas: fixed background, 100% natural brightness (zero dimming)
 *  - Interactive Click & Drag Scrubber Bar with live phase tooltip
 *  - Web Audio Synthesizer (Haptic sound FX toggleable)
 *  - Interactive One-Click Simulator Presets
 *  - Interactive 8-State Risk Matrix with Risk Filters
 *  - Real-Time Live Waveform Sparklines on all 6 sensor cards
 *  - Interactive 3D Parallax on Hero Title
 *  - Keyboard scrub & shortcuts (Arrows, Space, D, M)
 */
(function () {
    'use strict';

    const START_FRAME = 2;
    const END_FRAME   = 75;
    const TOTAL       = END_FRAME - START_FRAME + 1; // 74 frames starting from frame 02

    /* ------------------------------------------------------------------
       CANVAS (fixed background, 100% bright, zero dimming)
    ------------------------------------------------------------------ */
    const cv  = document.getElementById('bg-canvas');
    const ctx = cv ? cv.getContext('2d', { alpha: false }) : null;
    if (!cv || !ctx) return;

    let W = 0, H = 0;

    function sizeCanvas() {
        W = window.innerWidth;
        H = window.innerHeight;
        cv.width  = W;
        cv.height = H;
        paint(curIdx);
    }
    window.addEventListener('resize', sizeCanvas, { passive: true });

    /* ------------------------------------------------------------------
       FRAME STORE & PRELOAD (Starting from frame 02)
    ------------------------------------------------------------------ */
    const store = [];
    let firstReady = false;

    for (let i = 0; i < TOTAL; i++) {
        const frameNum = START_FRAME + i;
        const img = new Image();
        img.src = `frames_jpg/${String(frameNum).padStart(2, '0')}.jpg`;
        img.onload = () => {
            if (i === 0 && !firstReady) { firstReady = true; sizeCanvas(); }
            if (Math.round(curIdx) === i) { paint(curIdx); }
        };
        if (img.complete && img.naturalWidth) {
            if (i === 0 && !firstReady) { firstReady = true; sizeCanvas(); }
        }
        store.push(img);
    }

    /* ------------------------------------------------------------------
       DRAW — cover-fit, native image brightness, optional shake
    ------------------------------------------------------------------ */
    let shakeX = 0, shakeY = 0, shaking = false;

    function paint(idx) {
        if (!W || !H) return;
        idx = Math.max(0, Math.min(TOTAL - 1, Math.round(idx)));

        // find nearest loaded frame
        let img = store[idx];
        if (!img || !img.complete || !img.naturalWidth) {
            for (let d = 1; d < TOTAL; d++) {
                const a = store[Math.max(0, idx - d)];
                const b = store[Math.min(TOTAL - 1, idx + d)];
                if (a?.complete && a.naturalWidth) { img = a; break; }
                if (b?.complete && b.naturalWidth) { img = b; break; }
            }
        }
        if (!img?.complete || !img.naturalWidth) return;

        const ir = img.naturalWidth / img.naturalHeight;
        const sr = W / H;
        let rw, rh, ox, oy;
        if (sr > ir) { rw = W; rh = W / ir; ox = 0; oy = (H - rh) / 2; }
        else         { rh = H; rw = H * ir; ox = (W - rw) / 2; oy = 0; }

        ctx.clearRect(0, 0, W, H);
        if (shaking) {
            ctx.save();
            ctx.translate(shakeX, shakeY);
            ctx.drawImage(img, ox, oy, rw, rh);
            ctx.restore();
        } else {
            ctx.drawImage(img, ox, oy, rw, rh);
        }
    }

    /* ------------------------------------------------------------------
       SCROLL PROGRESS & SCRUBBER
    ------------------------------------------------------------------ */
    let targetProg = 0;
    let smoothProg = 0;
    let smoothIdx  = 0;
    let curIdx     = 0;

    function getScrollProgress() {
        const docEl = document.documentElement;
        const body  = document.body;
        const scrollTop = window.scrollY || window.pageYOffset || docEl.scrollTop || body.scrollTop || 0;
        const scrollHeight = Math.max(
            body.scrollHeight, docEl.scrollHeight,
            body.offsetHeight, docEl.offsetHeight,
            body.clientHeight, docEl.clientHeight
        );
        const winHeight = window.innerHeight || docEl.clientHeight || 1;
        const maxScroll = scrollHeight - winHeight;
        if (maxScroll <= 0) return 0;
        return Math.max(0, Math.min(1, scrollTop / maxScroll));
    }

    /* ------------------------------------------------------------------
       WEB AUDIO HAPTIC VIBRATION SYNTHESIZER
    ------------------------------------------------------------------ */
    let audioCtx = null;
    let soundEnabled = true; // Enabled so downward scrolling vibrates immediately
    const btnSound = document.getElementById('btn-sound');
    const soundIcon = document.getElementById('sound-icon');

    function initAudio() {
        try {
            if (!audioCtx) {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (AC) audioCtx = new AC();
            }
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => {});
            }
        } catch (_) {}
    }

    // Auto-unlock audio on any first user gesture (pointerdown, keydown, wheel, touch, scroll)
    function unlockAudio() {
        initAudio();
        if (btnSound && soundEnabled) {
            btnSound.classList.add('active');
            if (soundIcon) soundIcon.textContent = '🔊';
        }
        ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(evt => {
            window.removeEventListener(evt, unlockAudio);
        });
    }
    ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(evt => {
        window.addEventListener(evt, unlockAudio, { passive: true, once: true });
    });

    let lastVibrateTime = 0;

    /**
     * Synthesizes an authentic mechanical vibration motor rumble ("brrr-t")
     * with low-frequency carrier (68-52Hz), sub-bass (36Hz), and 32Hz AM tremolo modulation.
     */
    function playVibrateSound(intensity = 0.5) {
        if (!soundEnabled) return;
        initAudio();
        if (!audioCtx || audioCtx.state !== 'running') return;

        try {
            const t = audioCtx.currentTime;
            const dur = 0.075 + Math.min(0.06, intensity * 0.04); // 75ms - 115ms pulse

            // Hardware vibration motor on supported mobile/touch devices
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try { navigator.vibrate(Math.min(25, Math.round(14 + intensity * 16))); } catch (_) {}
            }

            // Master Gain Envelope with quick attack and logarithmic decay
            const masterGain = audioCtx.createGain();
            const vol = Math.min(0.28, 0.12 + intensity * 0.15);
            masterGain.gain.setValueAtTime(0.0001, t);
            masterGain.gain.linearRampToValueAtTime(vol, t + 0.012);
            masterGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

            // Resonant low-pass filter for heavy mechanical body feel
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(155 + intensity * 50, t);
            filter.Q.setValueAtTime(2.2, t);

            // Carrier Oscillator (triangle wave: 70Hz down to 52Hz)
            const carrier = audioCtx.createOscillator();
            carrier.type = 'triangle';
            carrier.frequency.setValueAtTime(70 + intensity * 10, t);
            carrier.frequency.exponentialRampToValueAtTime(52, t + dur);

            // Sub-Bass Oscillator (sine wave: 36Hz) for physical chest/desk resonance
            const sub = audioCtx.createOscillator();
            sub.type = 'sine';
            sub.frequency.setValueAtTime(36, t);

            // 32Hz Tremolo Modulator (creates the characteristic rapid vibration buzz)
            const tremolo = audioCtx.createOscillator();
            tremolo.type = 'sawtooth';
            tremolo.frequency.setValueAtTime(32, t);

            const tremoloGain = audioCtx.createGain();
            tremoloGain.gain.setValueAtTime(0.65, t); // 65% depth

            const carrierGain = audioCtx.createGain();
            carrierGain.gain.setValueAtTime(0.7, t);

            // Connect AM modulation
            tremolo.connect(tremoloGain);
            tremoloGain.connect(carrierGain.gain);

            // Routing
            carrier.connect(carrierGain);
            carrierGain.connect(masterGain);
            sub.connect(masterGain);
            masterGain.connect(filter);
            filter.connect(audioCtx.destination);

            carrier.start(t);
            sub.start(t);
            tremolo.start(t);

            carrier.stop(t + dur);
            sub.stop(t + dur);
            tremolo.stop(t + dur);
        } catch (_) {}
    }

    function playTickSound(freq = 600, duration = 0.04) {
        if (!soundEnabled) return;
        initAudio();
        if (!audioCtx || audioCtx.state !== 'running') return;
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.4, audioCtx.currentTime + duration);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (_) {}
    }

    let lastLandslideTime = 0;

    /**
     * Ultra-Realistic Procedural Landslide Sound Synthesizer:
     * - ZERO electronic synth oscillators (100% organic acoustic physics)
     * - Layer 1: Infrasonic Tectonic Earthquake Rumble (Cascaded brownian earth churn)
     * - Layer 2: Debris Avalanche & Scree Cascade (Granular bandpass friction sweep)
     * - Layer 3: High-Frequency Gravel Shatter & Falling Shale Spray
     * - Layer 4: Boulder Bedrock Detonations ("K-THUUUM" explosive ground impacts)
     * - Layer 5: Himalayan Gorge Valley Delay & Echo Diffusion (Deep spatial canyon resonance)
     */
    function playLandslideSound(duration = 3.2, intensity = 0.95) {
        if (!soundEnabled) return;
        initAudio();
        if (!audioCtx || audioCtx.state !== 'running') return;

        const now = audioCtx.currentTime;
        if (now - lastLandslideTime < 0.5) return;
        lastLandslideTime = now;

        try {
            const dur = Math.max(1.8, duration);

            // Hardware vibration feedback on supported mobile devices
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try { navigator.vibrate([80, 40, 140, 50, 220, 60, 360]); } catch (_) {}
            }

            // Master Output Bus
            const masterGain = audioCtx.createGain();
            const peakVol = Math.min(0.55, 0.26 + intensity * 0.25);
            masterGain.gain.setValueAtTime(0.0001, now);
            masterGain.gain.linearRampToValueAtTime(peakVol, now + 0.4);
            masterGain.gain.setValueAtTime(peakVol * 0.9, now + dur * 0.6);
            masterGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

            // Mountain Valley Echo / Canyon Spatial Network
            const delayL = audioCtx.createDelay();
            const delayR = audioCtx.createDelay();
            delayL.delayTime.value = 0.055; // 55ms valley echo left
            delayR.delayTime.value = 0.088; // 88ms valley echo right

            const delayFeedback = audioCtx.createGain();
            delayFeedback.gain.value = 0.32;

            const delayDamping = audioCtx.createBiquadFilter();
            delayDamping.type = 'lowpass';
            delayDamping.frequency.value = 350; // valley wall absorption

            delayL.connect(delayDamping);
            delayR.connect(delayDamping);
            delayDamping.connect(delayFeedback);
            delayFeedback.connect(delayL);
            delayFeedback.connect(delayR);

            masterGain.connect(audioCtx.destination);
            masterGain.connect(delayL);
            masterGain.connect(delayR);
            delayDamping.connect(audioCtx.destination);

            // Generate multi-channel organic brownian noise buffers
            const sampleCount = Math.floor(audioCtx.sampleRate * dur);
            const noiseBuf = audioCtx.createBuffer(1, sampleCount, audioCtx.sampleRate);
            const data = noiseBuf.getChannelData(0);

            let b0 = 0, b1 = 0, b2 = 0;
            for (let i = 0; i < sampleCount; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.992 * b0 + white * 0.055;
                b1 = 0.985 * b1 + white * 0.040;
                b2 = 0.950 * b2 + white * 0.025;
                data[i] = (b0 + b1 + b2) * 1.8;
            }

            // ==========================================================
            // LAYER 1: Infrasonic Tectonic Rumble (Underground Earth Groan)
            // ==========================================================
            const subSource = audioCtx.createBufferSource();
            subSource.buffer = noiseBuf;

            const subLP1 = audioCtx.createBiquadFilter();
            subLP1.type = 'lowpass';
            subLP1.frequency.setValueAtTime(55, now);
            subLP1.frequency.linearRampToValueAtTime(75, now + dur * 0.4);
            subLP1.frequency.exponentialRampToValueAtTime(35, now + dur);
            subLP1.Q.setValueAtTime(4.0, now); // heavy resonance for deep bass pressure

            const subLP2 = audioCtx.createBiquadFilter();
            subLP2.type = 'lowpass';
            subLP2.frequency.setValueAtTime(70, now);

            const subGain = audioCtx.createGain();
            subGain.gain.setValueAtTime(0.001, now);
            subGain.gain.linearRampToValueAtTime(1.1, now + 0.35);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

            subSource.connect(subLP1);
            subLP1.connect(subLP2);
            subLP2.connect(subGain);
            subGain.connect(masterGain);

            subSource.start(now);
            subSource.stop(now + dur);

            // ==========================================================
            // LAYER 2: Scree Avalanche & Granite Grinding (Mid-Frequency Debris)
            // ==========================================================
            const midSource = audioCtx.createBufferSource();
            midSource.buffer = noiseBuf;

            const midBP = audioCtx.createBiquadFilter();
            midBP.type = 'bandpass';
            midBP.frequency.setValueAtTime(180, now);
            midBP.frequency.linearRampToValueAtTime(420, now + dur * 0.45);
            midBP.frequency.exponentialRampToValueAtTime(140, now + dur);
            midBP.Q.setValueAtTime(1.8, now);

            const midGain = audioCtx.createGain();
            midGain.gain.setValueAtTime(0.001, now);
            midGain.gain.linearRampToValueAtTime(0.75, now + 0.4);
            midGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

            midSource.connect(midBP);
            midBP.connect(midGain);
            midGain.connect(masterGain);

            midSource.start(now);
            midSource.stop(now + dur);

            // ==========================================================
            // LAYER 3: Splintering Shale & Falling Gravel Spray (High-Freq Dust)
            // ==========================================================
            const highSource = audioCtx.createBufferSource();
            highSource.buffer = noiseBuf;

            const highBP = audioCtx.createBiquadFilter();
            highBP.type = 'bandpass';
            highBP.frequency.setValueAtTime(950, now);
            highBP.frequency.linearRampToValueAtTime(1600, now + dur * 0.5);
            highBP.frequency.exponentialRampToValueAtTime(600, now + dur);
            highBP.Q.setValueAtTime(1.4, now);

            const highGain = audioCtx.createGain();
            highGain.gain.setValueAtTime(0.001, now);
            highGain.gain.linearRampToValueAtTime(0.28, now + 0.5);
            highGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

            highSource.connect(highBP);
            highBP.connect(highGain);
            highGain.connect(masterGain);

            highSource.start(now);
            highSource.stop(now + dur);

            // ==========================================================
            // LAYER 4: Boulder Bedrock Detonations (Explosive Ground Impacts)
            // ==========================================================
            const impactTimings = [0.25, 0.72, 1.25, 1.95, 2.50];
            impactTimings.forEach((offset, idx) => {
                if (offset >= dur) return;
                const hitTime = now + offset;
                const impactDur = 0.28;

                const impSource = audioCtx.createBufferSource();
                impSource.buffer = noiseBuf;

                const impFilter = audioCtx.createBiquadFilter();
                impFilter.type = 'lowpass';
                impFilter.frequency.setValueAtTime(240 - idx * 25, hitTime);
                impFilter.frequency.exponentialRampToValueAtTime(32, hitTime + impactDur);
                impFilter.Q.setValueAtTime(6.0, hitTime); // resonant hollow boulder thud

                const impGain = audioCtx.createGain();
                const hitVol = 0.65 - idx * 0.08;
                impGain.gain.setValueAtTime(0.001, hitTime);
                impGain.gain.linearRampToValueAtTime(hitVol, hitTime + 0.012);
                impGain.gain.exponentialRampToValueAtTime(0.0001, hitTime + impactDur);

                impSource.connect(impFilter);
                impFilter.connect(impGain);
                impGain.connect(masterGain);

                impSource.start(hitTime, Math.random() * (dur * 0.5));
                impSource.stop(hitTime + impactDur);
            });

        } catch (_) {}
    }

    const playRumbleSound = playLandslideSound;

    if (btnSound) {
        btnSound.classList.toggle('active', soundEnabled);
        if (soundIcon) soundIcon.textContent = soundEnabled ? '🔊' : '🔇';

        btnSound.addEventListener('click', (e) => {
            e.stopPropagation();
            soundEnabled = !soundEnabled;
            initAudio();
            btnSound.classList.toggle('active', soundEnabled);
            if (soundIcon) soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
            if (soundEnabled) playVibrateSound(0.7);
        });
    }

    /* ------------------------------------------------------------------
       SCROLL PROGRESS & DOWNWARD VIBRATION ENGINE
    ------------------------------------------------------------------ */
    let lastScrollY = window.scrollY || window.pageYOffset || 0;
    let scrollDownAccumulator = 0;

    // Trigger on mouse wheel scrolling down
    window.addEventListener('wheel', (e) => {
        if (e.deltaY > 0) { // Scrolling DOWN
            const now = performance.now();
            if (now - lastVibrateTime > 55) {
                playVibrateSound(Math.min(1.0, Math.abs(e.deltaY) / 80));
                lastVibrateTime = now;
            }
        }
    }, { passive: true });

    // Track scroll down and trigger vibration pulses
    window.addEventListener('scroll', () => {
        targetProg = getScrollProgress();
        const currentY = window.scrollY || window.pageYOffset || 0;
        document.getElementById('navbar')?.classList.toggle('scrolled', currentY > 50);
        const delta = currentY - lastScrollY;
        lastScrollY = currentY;

        if (delta > 0) { // Scrolling DOWN
            scrollDownAccumulator += delta;
            const now = performance.now();
            if (scrollDownAccumulator >= 28 && (now - lastVibrateTime > 55)) {
                playVibrateSound(Math.min(1.0, delta / 70));
                lastVibrateTime = now;
                scrollDownAccumulator = 0;
            }
        } else {
            scrollDownAccumulator = 0;
        }
    }, { passive: true });

    /* ------------------------------------------------------------------
       TIMELINE PHASES & TOOLTIP
    ------------------------------------------------------------------ */
    const scrollBar   = document.getElementById('scroll-progress');
    const scrubber    = document.getElementById('scrubber-track');
    const tooltip     = document.getElementById('scrubber-tooltip');

    const phases = [
        { max: 0.20, label: 'STABLE BASELINE (FoS 1.74)' },
        { max: 0.40, label: 'SHEAR STRAIN INCEPTION (FoS 1.25)' },
        { max: 0.60, label: 'CATASTROPHIC ROCKFALL COLLAPSE' },
        { max: 0.80, label: 'VALLEY RUNOUT PROTOCOL' },
        { max: 1.00, label: 'POST-FAILURE RESIDUAL EQUILIBRIUM' }
    ];

    function getPhaseText(p, frame) {
        const ph = phases.find(x => p <= x.max) || phases[phases.length - 1];
        return `FRAME ${String(frame).padStart(2, '0')} • ${ph.label}`;
    }

    function updateProgress(p, idx) {
        if (scrollBar) {
            scrollBar.style.width = (p * 100).toFixed(2) + '%';
        }
    }

    /* ------------------------------------------------------------------
       CLICK & DRAG TO SCRUB ANYWHERE ALONG NAVBAR
    ------------------------------------------------------------------ */
    let isScrubbing = false;
    let lastScrubFrac = 0;

    function scrubToEvent(e) {
        if (!scrubber) return;
        const rect = scrubber.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

        const docEl = document.documentElement;
        const body  = document.body;
        const scrollHeight = Math.max(body.scrollHeight, docEl.scrollHeight);
        const maxScroll = scrollHeight - window.innerHeight;
        window.scrollTo({ top: frac * maxScroll, behavior: 'auto' });

        const frameNum = Math.min(END_FRAME, Math.max(START_FRAME, Math.round(START_FRAME + frac * (TOTAL - 1))));
        if (tooltip) {
            tooltip.style.left = `${frac * 100}%`;
            tooltip.textContent = getPhaseText(frac, frameNum);
        }

        if (frac > lastScrubFrac) {
            playVibrateSound(Math.min(1.0, (frac - lastScrubFrac) * 15 + 0.3));
        } else {
            playTickSound(350 + frac * 300);
        }
        lastScrubFrac = frac;
    }

    if (scrubber) {
        scrubber.addEventListener('mousedown', (e) => {
            isScrubbing = true;
            scrubToEvent(e);
        });
        window.addEventListener('mousemove', (e) => {
            if (isScrubbing) {
                scrubToEvent(e);
            } else if (scrubber.matches(':hover') && tooltip) {
                const rect = scrubber.getBoundingClientRect();
                const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const frameNum = Math.min(END_FRAME, Math.max(START_FRAME, Math.round(START_FRAME + frac * (TOTAL - 1))));
                tooltip.style.left = `${frac * 100}%`;
                tooltip.textContent = getPhaseText(frac, frameNum);
            }
        });
        window.addEventListener('mouseup', () => { isScrubbing = false; });
        scrubber.addEventListener('touchstart', (e) => { isScrubbing = true; scrubToEvent(e); }, { passive: true });
        window.addEventListener('touchmove', (e) => { if (isScrubbing) scrubToEvent(e); }, { passive: true });
        window.addEventListener('touchend', () => { isScrubbing = false; });
    }

    /* ------------------------------------------------------------------
       KEYBOARD SHORTCUTS
    ------------------------------------------------------------------ */
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') {
            window.scrollBy({ top: 130, behavior: 'smooth' });
            playVibrateSound(0.7);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
            window.scrollBy({ top: -130, behavior: 'smooth' });
        } else if (e.key === ' ' && !e.target.matches('button, a')) {
            e.preventDefault();
            window.scrollBy({ top: window.innerHeight * 0.75, behavior: 'smooth' });
            playVibrateSound(0.85);
        } else if (e.key === 'm' || e.key === 'M') {
            btnSound?.click();
        } else if (e.key === 'd' || e.key === 'D') {
            document.getElementById('btn-drill')?.click();
        }
    });

    /* ------------------------------------------------------------------
       HERO 3D MOUSE PARALLAX
    ------------------------------------------------------------------ */
    const heroSec = document.getElementById('section-hero');
    const heroCnt = document.getElementById('hero-content');
    if (heroSec && heroCnt) {
        heroSec.addEventListener('mousemove', (e) => {
            const rect = heroSec.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            heroCnt.style.transform = `rotateX(${-y * 9}deg) rotateY(${x * 12}deg) translateZ(10px)`;
        });
        heroSec.addEventListener('mouseleave', () => {
            heroCnt.style.transform = 'none';
        });
    }

    /* ------------------------------------------------------------------
       RAF ANIMATION LOOP
    ------------------------------------------------------------------ */
    function tick() {
        targetProg = getScrollProgress();
        smoothProg += (targetProg - smoothProg) * 0.14;

        const fi = smoothProg * (TOTAL - 1);
        smoothIdx += (fi - smoothIdx) * 0.22;
        curIdx     = Math.round(smoothIdx);

        paint(curIdx);

        // Camera shake & Landslide audio roar during severe rockfall detachment (frames ~41 to ~56)
        if (smoothProg >= 0.54 && smoothProg <= 0.76) {
            const s = Math.sin(((smoothProg - 0.54) / 0.22) * Math.PI) * 7;
            shakeX = (Math.random() - 0.5) * s;
            shakeY = (Math.random() - 0.5) * s;
            shaking = true;
            if (Math.abs(targetProg - smoothProg) > 0.003) {
                playLandslideSound(1.8, Math.min(1.0, s / 5.5));
            }
        } else {
            shaking = false;
            shakeX = 0;
            shakeY = 0;
        }

        updateProgress(smoothProg, curIdx);
        requestAnimationFrame(tick);
    }

    /* ------------------------------------------------------------------
       8-STATE MATRIX & RISK FILTERS
    ------------------------------------------------------------------ */
    const stateDB = {
        sikkim:    { tag:'SIKKIM HIMALAYA // NH-10 AXIS', title:'North Sikkim & Teesta Basin Corridor', lvl:'⚠ LEVEL 3 ORANGE', lvlC:'high', rain:'184.2 mm', rainSub:'▲ 42% Above Threshold', sensors:'342 Nodes', zones:'14 Active', adv:'EVAC READY', advisory:'Extreme soil saturation across Chungthang-Lachen slopes. Heavy freight restricted on NH-10. Geotechnical crews on standby in Mangan district.' },
        arunachal: { tag:'ARUNACHAL // SIANG CORRIDOR', title:'Upper Siang & Subansiri River Valley', lvl:'⚠ LEVEL 3 ORANGE', lvlC:'high', rain:'212.4 mm', rainSub:'▲ 68% Above Threshold', sensors:'518 Nodes', zones:'22 Active', adv:'EVAC READY', advisory:'Mass movement risk elevated along NH-13. Mudflows in Lower Dibang Valley. Emergency teams mobilized to Roing and Along.' },
        meghalaya: { tag:'MEGHALAYA // KHASI-JAINTIA HILLS', title:'Cherrapunji & Shillong Plateau Escarpment', lvl:'⚡ LEVEL 2 AMBER', lvlC:'med', rain:'156.8 mm', rainSub:'▲ 24% Above Threshold', sensors:'287 Nodes', zones:'11 Active', adv:'STANDBY', advisory:'Elevated susceptibility across Cherrapunji escarpment. Road cuts on NH-40 require monitoring. Advisory Level 2 maintained.' },
        assam:     { tag:'ASSAM // DIMA HASAO HILLS', title:'Barail Range & Barak Valley Slopes', lvl:'⚡ LEVEL 2 AMBER', lvlC:'med', rain:'138.2 mm', rainSub:'▲ 18% Above Threshold', sensors:'201 Nodes', zones:'8 Active', adv:'WATCH', advisory:'Seasonal debris flow in Umrangso sector. NH-27E slope erosion monitored. Elevated precipitation forecast 72 hours.' },
        mizoram:   { tag:'MIZORAM // CHAMPHAI-LUNGLEI', title:'Central Mizo Hills & Tlawng Valley', lvl:'⚠ LEVEL 3 ORANGE', lvlC:'high', rain:'178.6 mm', rainSub:'▲ 55% Above Threshold', sensors:'234 Nodes', zones:'16 Active', adv:'EVAC READY', advisory:'Deep-seated rotational failure near Serchhip. Tension cracks on NH-54. Vulnerable communities advised to evacuate.' },
        manipur:   { tag:'MANIPUR // SENAPATI DISTRICT', title:'Naga Hills & Imphal Valley Rim', lvl:'✓ LEVEL 1 GREEN', lvlC:'safe', rain:'98.4 mm', rainSub:'▲ 8% Above Normal', sensors:'189 Nodes', zones:'5 Active', adv:'NOMINAL', advisory:'All slopes within normal parameters. Routine sensor maintenance underway. No immediate risk in 48 hours.' },
        nagaland:  { tag:'NAGALAND // KOHIMA-DIMAPUR', title:'Naga Hills & Dzükou Valley Complex', lvl:'⚠ LEVEL 3 ORANGE', lvlC:'high', rain:'167.4 mm', rainSub:'▲ 38% Above Threshold', sensors:'198 Nodes', zones:'12 Active', adv:'EVAC READY', advisory:'Slope instability confirmed along Kohima-Pfutsero road. Historical zones reactivating under current monsoon.' },
        tripura:   { tag:'TRIPURA // JAMPUI HILLS', title:'Jampui Hills & Gomati River Valley', lvl:'✓ LEVEL 1 GREEN', lvlC:'safe', rain:'72.3 mm', rainSub:'Within Normal Range', sensors:'124 Nodes', zones:'2 Active', adv:'NOMINAL', advisory:'Low susceptibility across all zones. Full sensor capacity. No anomalous displacement. Conditions stable.' },
    };

    function setStateView(key) {
        const d = stateDB[key]; if (!d) return;
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        const setC = (id, cls, v) => { const el = document.getElementById(id); if (el) { el.textContent = v; el.className = cls; } };

        set('sd-tag', d.tag);
        set('sd-title', d.title);
        setC('sd-level', `sd-level ${d.lvlC}`, d.lvl);
        set('sd-rain', d.rain);

        const rainEl = document.getElementById('sd-rain');
        if (rainEl) rainEl.className = `sm-v ${d.lvlC === 'high' ? 'red' : d.lvlC === 'med' ? 'amber' : 'green'}`;

        set('sd-sensors', d.sensors);
        set('sd-zones', d.zones);
        setC('sd-adv-level', `sm-v ${d.lvlC === 'high' ? 'red' : d.lvlC === 'med' ? 'amber' : 'green'}`, d.adv);
        set('sd-advisory', d.advisory);
    }

    const stateListEl = document.getElementById('state-list');
    if (stateListEl) {
        stateListEl.querySelectorAll('.state-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                stateListEl.querySelectorAll('.state-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                setStateView(btn.dataset.state);
                playTickSound(580);
            });
        });
    }
    setStateView('sikkim');

    // State Filter Buttons
    document.querySelectorAll('.sf-btn').forEach(fbtn => {
        fbtn.addEventListener('click', () => {
            document.querySelectorAll('.sf-btn').forEach(b => b.classList.remove('active'));
            fbtn.classList.add('active');
            const filter = fbtn.dataset.filter;
            playTickSound(520);

            let firstVisible = null;
            stateListEl?.querySelectorAll('.state-btn').forEach(sbtn => {
                const lvl = sbtn.dataset.level;
                const match = (filter === 'all' || lvl === filter);
                sbtn.classList.toggle('hidden', !match);
                if (match && !firstVisible) firstVisible = sbtn;
            });
            if (firstVisible && !firstVisible.classList.contains('active')) {
                firstVisible.click();
            }
        });
    });

    /* ------------------------------------------------------------------
       SLOPE SIMULATOR & PRESETS
    ------------------------------------------------------------------ */
    const rockDB = {
        gneiss:    { c:28, phi:34, gamma:23 },
        schist:    { c:18, phi:26, gamma:20 },
        alluvium:  { c:8,  phi:20, gamma:18 },
        limestone: { c:45, phi:42, gamma:26 },
    };
    const vegBonus  = [0, 4, 8, 12];
    const vegLabels = ['Bare Soil','Sparse Grass','Moderate Shrub','Dense Forest'];

    function calcFoS() {
        const rain  = parseFloat(document.getElementById('s-rain')?.value  || 120);
        const angle = parseFloat(document.getElementById('s-slope')?.value || 48);
        const pga   = parseFloat(document.getElementById('s-pga')?.value   || 0.12);
        const rk    = document.getElementById('s-rock')?.value  || 'gneiss';
        const vi    = parseInt(document.getElementById('s-veg')?.value     || 2);
        const rock  = rockDB[rk] || rockDB.gneiss;
        const beta  = angle * Math.PI / 180, H = 5;
        const c     = rock.c + vegBonus[vi], phi = rock.phi * Math.PI / 180, g = rock.gamma;
        const ru    = Math.min(0.75, (rain/350)*0.80);
        const u     = ru * g * H * Math.cos(beta)**2;
        const norm  = Math.max(0, g*H*Math.cos(beta)**2 - u);
        const fric  = norm * Math.tan(phi);
        const sd    = pga * g * H * Math.cos(beta) * Math.sin(beta);
        const drive = Math.max(0.01, g*H*Math.sin(beta)*Math.cos(beta) + sd);
        const fos   = Math.max(0.1, Math.min(4.0, (c+fric)/drive));
        const cls   = fos>=1.3?'stable':fos>=1.0?'warning':'critical';

        const fn = document.getElementById('sim-fos-num');
        const fs = document.getElementById('sim-fos-state');
        if (fn) { fn.textContent = fos.toFixed(2); fn.className = 'sim-fos-num ' + cls; }
        if (fs) { fs.textContent = fos>=1.3?'STABLE CONDITIONS':fos>=1.0?'⚠ CRITICAL MARGIN':'🚨 FAILURE IMMINENT'; fs.className = 'sim-fos-state ' + cls; }

        const set = (id,v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('sbd-cohesion', c.toFixed(1) + ' kPa');
        set('sbd-friction', fric.toFixed(1) + ' kN/m²');
        set('sbd-pore', u.toFixed(1) + ' kPa');
        set('sbd-seismic', '−' + sd.toFixed(1) + ' kN/m²');
        set('sbd-root', '+' + vegBonus[vi].toFixed(1) + ' kPa');
        drawGauge(fos);
    }

    function drawGauge(fos) {
        const gc = document.getElementById('sim-gauge');
        const gx = gc?.getContext('2d');
        if (!gx || !gc) return;
        const w = gc.width, h = gc.height, cx = w/2, cy = h-10, r = Math.min(w/2, h)-16;
        gx.clearRect(0, 0, w, h);
        gx.beginPath(); gx.arc(cx, cy, r, Math.PI, 0); gx.lineWidth = 10; gx.strokeStyle = 'rgba(255,255,255,0.07)'; gx.stroke();
        const n = Math.min(1, Math.max(0, fos/2));
        const col = fos>=1.3 ? '#22c55e' : fos>=1.0 ? '#f59e0b' : '#ef4444';
        gx.beginPath(); gx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI*n); gx.lineWidth = 10; gx.lineCap = 'round';
        gx.strokeStyle = col; gx.shadowBlur = 18; gx.shadowColor = col; gx.stroke(); gx.shadowBlur = 0;
        const na = Math.PI + Math.PI*n;
        gx.beginPath(); gx.moveTo(cx, cy); gx.lineTo(cx + (r-18)*Math.cos(na), cy + (r-18)*Math.sin(na)); gx.lineWidth = 2; gx.strokeStyle = '#fff'; gx.lineCap = 'round'; gx.stroke();
        gx.beginPath(); gx.arc(cx, cy, 5, 0, Math.PI*2); gx.fillStyle = col; gx.fill();
        gx.fillStyle = 'rgba(255,255,255,0.35)'; gx.font = '9px JetBrains Mono,monospace'; gx.textAlign = 'left'; gx.fillText('0', cx-r-2, cy+4);
        gx.textAlign = 'right'; gx.fillText('2', cx+r+2, cy+4);
        gx.textAlign = 'center'; gx.fillText('FoS', cx, cy-r/2);
    }

    ['s-rain','s-slope','s-pga','s-rock','s-veg'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            const set = (vid, v) => { const el = document.getElementById(vid); if (el) el.textContent = v; };
            set('v-rain', (document.getElementById('s-rain')?.value || 120) + ' mm');
            set('v-slope', (document.getElementById('s-slope')?.value || 48) + '°');
            set('v-pga', parseFloat(document.getElementById('s-pga')?.value || 0).toFixed(2) + ' g');
            set('v-veg', vegLabels[parseInt(document.getElementById('s-veg')?.value || 2)]);
            calcFoS();
            playTickSound(450);
        });
    });

    document.getElementById('sim-reset')?.addEventListener('click', () => {
        applySimPreset({ rain: 120, slope: 48, pga: 0.12, rock: 'gneiss', veg: 2 });
    });

    function applySimPreset(preset) {
        const sRain  = document.getElementById('s-rain');
        const sSlope = document.getElementById('s-slope');
        const sPga   = document.getElementById('s-pga');
        const sRock  = document.getElementById('s-rock');
        const sVeg   = document.getElementById('s-veg');
        if (sRain)  sRain.value = preset.rain;
        if (sSlope) sSlope.value = preset.slope;
        if (sPga)   sPga.value = preset.pga;
        if (sRock)  sRock.value = preset.rock;
        if (sVeg)   sVeg.value = preset.veg;

        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('v-rain', preset.rain + ' mm');
        set('v-slope', preset.slope + '°');
        set('v-pga', parseFloat(preset.pga).toFixed(2) + ' g');
        set('v-veg', vegLabels[preset.veg]);
        calcFoS();
        playTickSound(700, 0.08);
    }

    document.querySelectorAll('.sp-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = btn.dataset.preset;
            if (p === 'monsoon') {
                applySimPreset({ rain: 310, slope: 58, pga: 0.18, rock: 'alluvium', veg: 0 });
                playLandslideSound(2.5, 0.95);
            } else if (p === 'seismic') {
                applySimPreset({ rain: 130, slope: 52, pga: 0.38, rock: 'schist', veg: 1 });
                playLandslideSound(2.8, 1.0);
            } else if (p === 'stable') {
                applySimPreset({ rain: 30, slope: 28, pga: 0.02, rock: 'limestone', veg: 3 });
                playTickSound(700, 0.08);
            }
        });
    });

    calcFoS();

    /* ------------------------------------------------------------------
       LIVE WAVEFORM SPARKLINES (Sensors + AI Core Architecture)
    ------------------------------------------------------------------ */
    const sparklines = {
        // Sensors
        'spark-weather':   { buf: new Float32Array(50), phase: 0,   color: '#38bdf8' },
        'spark-soil':      { buf: new Float32Array(50), phase: 2,   color: '#06b6d4' },
        'spark-satellite': { buf: new Float32Array(50), phase: 4,   color: '#f59e0b' },
        // AI Core Tech Cards
        'spark-tech-1':    { buf: new Float32Array(50), phase: 1.2, color: '#10b981' }, // GNN
        'spark-tech-2':    { buf: new Float32Array(50), phase: 2.5, color: '#38bdf8' }, // PINO
        'spark-tech-3':    { buf: new Float32Array(50), phase: 3.8, color: '#a855f7' }, // Cascade
        'spark-tech-4':    { buf: new Float32Array(50), phase: 5.1, color: '#f59e0b' }, // Edge
        'spark-tech-5':    { buf: new Float32Array(50), phase: 0.7, color: '#06b6d4' }, // PSInSAR
        'spark-tech-6':    { buf: new Float32Array(50), phase: 4.4, color: '#eab308' }  // Digital Twin
    };

    function drawSparkline(id, config) {
        const can = document.getElementById(id);
        if (!can) return;
        const g = can.getContext('2d');
        if (!g) return;
        const w = can.width, h = can.height, mid = h / 2;

        config.phase += 0.085;
        // Shift buffer
        for (let i = 0; i < config.buf.length - 1; i++) {
            config.buf[i] = config.buf[i + 1];
        }

        let nextVal = Math.sin(config.phase) * (h * 0.28) + (Math.random() - 0.5) * 3;
        if (id === 'spark-weather') {
            nextVal += (Math.random() - 0.5) * 7; // Atmospheric rainfall turbulence
        } else if (id === 'spark-soil') {
            nextVal = Math.sin(config.phase * 0.7) * (h * 0.22) + (Math.random() - 0.5) * 3; // Pore pressure drift
        } else if (id === 'spark-tech-1') {
            // GNN Topology: Interconnected graph node oscillations
            nextVal = (Math.sin(config.phase * 1.4) + Math.cos(config.phase * 0.7)) * (h * 0.20) + (Math.random() - 0.5) * 4;
        } else if (id === 'spark-tech-2') {
            // PINO Operator: Physics harmonic shear wave
            nextVal = Math.sin(config.phase) * (h * 0.30) + Math.sin(config.phase * 2.8) * (h * 0.10);
        } else if (id === 'spark-tech-3') {
            // Bayesian Cascade: Quantized probability distribution steps
            nextVal = Math.sin(config.phase * 0.6) * (h * 0.24) + (Math.floor(Math.sin(config.phase * 2) * 3) * 2.5);
        } else if (id === 'spark-tech-4') {
            // Edge AI: Periodic neural inference heartbeat impulse
            const pulse = (Math.sin(config.phase * 2.2) > 0.84) ? (h * 0.36) : 0;
            nextVal = Math.sin(config.phase * 0.8) * 3 + pulse;
        } else if (id === 'spark-tech-5') {
            // PSInSAR: Radar phase coherence interferogram wave
            nextVal = Math.sin(config.phase * 3.2) * (h * 0.22) * Math.cos(config.phase * 0.45);
        } else if (id === 'spark-tech-6') {
            // Digital Twin: Stepped vector routing pathfinder
            nextVal = (Math.sin(config.phase * 1.1) > 0 ? (h * 0.20) : -(h * 0.16)) + Math.sin(config.phase * 3) * 2.5;
        }
        config.buf[config.buf.length - 1] = nextVal;

        g.clearRect(0, 0, w, h);
        g.strokeStyle = 'rgba(255,255,255,0.06)';
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(0, mid); g.lineTo(w, mid); g.stroke();

        g.beginPath();
        g.strokeStyle = config.color;
        g.lineWidth = 1.75;
        g.shadowBlur = 6;
        g.shadowColor = config.color;
        for (let i = 0; i < config.buf.length; i++) {
            const x = (i / (config.buf.length - 1)) * w;
            const y = mid - config.buf[i];
            if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
        g.shadowBlur = 0;
    }

    function loopSparklines() {
        Object.entries(sparklines).forEach(([id, conf]) => {
            drawSparkline(id, conf);
        });
    }
    setInterval(loopSparklines, 70);

    /* ------------------------------------------------------------------
       LIVE TELEMETRY TICKER (Sensors + AI Core Architecture)
    ------------------------------------------------------------------ */
    const tickSensors = () => {
        const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        // Sensor Telemetry
        s('sv-weather',   (20 + Math.random() * 9).toFixed(1) + ' mm/hr');
        s('sv-soil',      (40 + Math.random() * 8).toFixed(1) + ' kPa');
        s('sv-satellite', (0.01 + Math.random() * 0.03).toFixed(3) + ' mm/day');

        // AI Core Platform Telemetry
        s('tv-gnn',     (99.2 + Math.random() * 0.5).toFixed(1) + '% AUC');
        s('tv-pino',    (0.0028 + Math.random() * 0.0006).toFixed(4) + ' Loss');
        s('tv-cascade', '5-Tier Joint');
        s('tv-edge',    '< ' + (7.4 + Math.random() * 0.8).toFixed(1) + 's Broadcast');
        s('tv-insar',   '±' + (1.1 + Math.random() * 0.2).toFixed(1) + ' mm Precision');
        s('tv-twin',    (1.1 + Math.random() * 0.2).toFixed(1) + 's Reroute');
        s('ts-gnn-lat', (3.5 + Math.random() * 0.5).toFixed(1) + ' ms');
    };
    setInterval(tickSensors, 2500);
    tickSensors();

    /* ------------------------------------------------------------------
       REVEAL ON SCROLL
    ------------------------------------------------------------------ */
    const revObs = new IntersectionObserver(entries => {
        entries.forEach((e, i) => {
            if (e.isIntersecting) {
                setTimeout(() => e.target.classList.add('visible'), i * 80);
                revObs.unobserve(e.target);
            }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => revObs.observe(el));

    /* ------------------------------------------------------------------
       EMERGENCY DRILL & LANDSLIDE AUDIO TRIGGER
    ------------------------------------------------------------------ */
    const eb = document.getElementById('emergency-banner');
    document.getElementById('btn-drill')?.addEventListener('click', () => {
        if (!eb) return;
        eb.classList.remove('hidden');
        eb.offsetHeight;
        eb.classList.add('visible');
        playLandslideSound(3.6, 1.0);
    });
    document.getElementById('ft-drill')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (!eb) return;
        eb.classList.remove('hidden');
        eb.offsetHeight;
        eb.classList.add('visible');
        playLandslideSound(3.6, 1.0);
    });
    document.getElementById('ft-sound')?.addEventListener('click', (e) => {
        e.preventDefault();
        btnSound?.click();
    });
    document.getElementById('btn-open-portal')?.addEventListener('click', () => {
        playTickSound(880);
    });
    document.querySelector('.btn-portal-pill')?.addEventListener('click', () => {
        playTickSound(880);
    });
    document.getElementById('btn-dismiss')?.addEventListener('click', () => {
        if (!eb) return;
        eb.classList.remove('visible');
        setTimeout(() => eb.classList.add('hidden'), 500);
        playTickSound(400);
    });

    /* ------------------------------------------------------------------
       FOOTER CLOCK
    ------------------------------------------------------------------ */
    const ft = document.getElementById('footer-time');
    setInterval(() => {
        if (ft) ft.textContent = new Date().toLocaleTimeString('en-IN', { hour12: false });
    }, 1000);
    if (ft) ft.textContent = new Date().toLocaleTimeString('en-IN', { hour12: false });

    /* ------------------------------------------------------------------
       BOOT
    ------------------------------------------------------------------ */
    sizeCanvas();
    requestAnimationFrame(tick);

})();
