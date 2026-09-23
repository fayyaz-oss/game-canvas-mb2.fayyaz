/**
 * Web Audio API Sound Synthesizer for Super Volley Arena
 * Generates all sound effects procedurally without needing any external audio assets!
 */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.volume = 0.7;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.initialized = true;
        } catch (e) {
            console.warn("Web Audio API not supported", e);
        }
    }

    resume() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    // Suara Pukulan Bola Biasa (Bump / Receive)
    playBump() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);

        gain.gain.setValueAtTime(this.volume * 0.9, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.15);
    }

    // Suara Dentuman Smash / Spike Bertenaga
    playSpike(isSuper = false) {
        if (this.muted || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;

        // Bass thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isSuper ? 380 : 300, t);
        osc.frequency.exponentialRampToValueAtTime(35, t + 0.22);

        gain.gain.setValueAtTime(this.volume * (isSuper ? 1.0 : 0.85), t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.25);

        // Snap impact noise
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(isSuper ? 2400 : 1800, t);
        noiseFilter.Q.setValueAtTime(2, t);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(this.volume * (isSuper ? 0.9 : 0.6), t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noise.start(t);
    }

    // Suara Peluit Wasit (Referee Whistle)
    playWhistle() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Whistle dua nada beresonansi
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(2600, t);
        osc2.frequency.setValueAtTime(2850, t);

        // Modulasi vibrato cepat
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(28, t);
        lfoGain.gain.setValueAtTime(140, t);
        lfo.connect(osc1.frequency);
        lfo.connect(osc2.frequency);
        lfo.start(t);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(this.volume * 0.45, t + 0.03);
        gain.gain.setValueAtTime(this.volume * 0.45, t + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.4);
        osc2.stop(t + 0.4);
        lfo.stop(t + 0.4);
    }

    // Suara Bola Mengenai Net
    playNetBounce() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, t);
        osc.frequency.exponentialRampToValueAtTime(90, t + 0.1);

        gain.gain.setValueAtTime(this.volume * 0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
    }

    // Suara Lompat (Jump Whoosh)
    playJump() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, t);
        osc.frequency.exponentialRampToValueAtTime(320, t + 0.14);

        gain.gain.setValueAtTime(this.volume * 0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
    }

    // Suara Perolehan Poin (Chime / Score)
    playPointScore() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            const t = this.ctx.currentTime + idx * 0.07;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(this.volume * 0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.3);
        });
    }

    // Suara Sorak Penonton (Cheering crowd)
    playCheer() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const duration = 1.2;
        const t = this.ctx.currentTime;
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.4;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.linearRampToValueAtTime(1400, t + 0.4);
        filter.frequency.exponentialRampToValueAtTime(400, t + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(this.volume * 0.35, t + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(t);
    }

    // Fanfare Kemenangan (Victory match win)
    playVictory() {
        if (this.muted || !this.ctx) return;
        this.resume();
        const melody = [
            { f: 523.25, d: 0.15 }, // C5
            { f: 523.25, d: 0.15 }, // C5
            { f: 523.25, d: 0.15 }, // C5
            { f: 659.25, d: 0.4 },  // E5
            { f: 587.33, d: 0.2 },  // D5
            { f: 659.25, d: 0.2 },  // E5
            { f: 783.99, d: 0.7 }   // G5
        ];

        let offset = 0;
        melody.forEach(item => {
            const t = this.ctx.currentTime + offset;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(item.f, t);

            gain.gain.setValueAtTime(this.volume * 0.4, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + item.d);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + item.d);

            offset += item.d * 0.85;
        });
    }

    // Countdown Beep (3, 2, 1, GO)
    playBeep(isGo = false) {
        if (this.muted || !this.ctx) return;
        this.resume();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(isGo ? 880 : 440, t);

        gain.gain.setValueAtTime(this.volume * 0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + (isGo ? 0.4 : 0.18));

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + (isGo ? 0.4 : 0.18));
    }
}

// Global instance
window.soundEngine = new SoundEngine();
