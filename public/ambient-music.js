// Enhanced Ambient Background Music Generator
// Creates natural, atmospheric soundscapes using Web Audio API

class AmbientMusicPlayer {
    constructor() {
        this.audioContext = null;
        this.isPlaying = false;
        this.volume = 0.12; // Subtle background volume
        this.masterGain = null;
        this.reverbGain = null;
        this.activeNodes = [];
        this.intervalIds = [];
        this.currentProgression = 0;
        
        // Beautiful ambient chord progressions in different keys
        this.progressions = [
            // Peaceful C major progression
            [
                [261.63, 329.63, 392.00, 523.25], // C maj7
                [220.00, 293.66, 349.23, 440.00], // A min7
                [246.94, 329.63, 392.00, 493.88], // F maj7
                [196.00, 261.63, 329.63, 392.00], // G maj6
            ],
            // Dreamy D minor progression
            [
                [293.66, 349.23, 440.00, 554.37], // D min7
                [233.08, 293.66, 369.99, 466.16], // Bb maj7
                [261.63, 329.63, 415.30, 523.25], // F maj7
                [196.00, 246.94, 329.63, 415.30], // G min7
            ],
            // Ethereal A minor progression
            [
                [220.00, 261.63, 329.63, 415.30], // A min7
                [261.63, 329.63, 392.00, 493.88], // C maj7
                [196.00, 246.94, 311.13, 392.00], // G maj7
                [174.61, 220.00, 277.18, 349.23], // F maj7
            ]
        ];
        
        // Ambient pad frequencies for atmospheric layers
        this.padFrequencies = [65.41, 82.41, 98.00, 130.81]; // Low ambient drones
    }
    
    async initialize() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
            
            // Create reverb effect for atmospheric sound
            this.reverbGain = this.audioContext.createGain();
            this.reverbGain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            
            // Create convolver for reverb (simple delay-based reverb)
            const convolver = this.audioContext.createConvolver();
            const impulseBuffer = this.createReverbImpulse(2, 0.5);
            convolver.buffer = impulseBuffer;
            
            // Connect audio chain: reverb -> master -> destination
            this.reverbGain.connect(convolver);
            convolver.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);
            
            return true;
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
            return false;
        }
    }
    
    createReverbImpulse(duration, decay) {
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * duration;
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                const n = length - i;
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(n / length, decay);
            }
        }
        
        return impulse;
    }
    
    createAmbientTone(frequency, duration = 8, waveType = 'sine', volume = 0.15) {
        if (!this.audioContext) return null;
        
        const oscillator = this.audioContext.createOscillator();
        const envelope = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        // Set oscillator properties
        oscillator.type = waveType;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        // Add subtle frequency modulation for organic feel
        const lfo = this.audioContext.createOscillator();
        const lfoGain = this.audioContext.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.1 + Math.random() * 0.3, this.audioContext.currentTime);
        lfoGain.gain.setValueAtTime(frequency * 0.002, this.audioContext.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);
        
        // Low-pass filter for warmth
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(frequency * 3, this.audioContext.currentTime);
        filter.Q.setValueAtTime(0.5, this.audioContext.currentTime);
        
        // Smooth ADSR envelope
        const now = this.audioContext.currentTime;
        envelope.gain.setValueAtTime(0, now);
        envelope.gain.exponentialRampToValueAtTime(volume * 0.01, now + 0.01);
        envelope.gain.exponentialRampToValueAtTime(volume, now + 2); // Attack
        envelope.gain.exponentialRampToValueAtTime(volume * 0.7, now + 3); // Decay
        envelope.gain.setValueAtTime(volume * 0.7, now + duration - 2); // Sustain
        envelope.gain.exponentialRampToValueAtTime(0.01, now + duration); // Release
        
        // Connect audio chain
        oscillator.connect(filter);
        filter.connect(envelope);
        
        // Route to both direct output and reverb
        envelope.connect(this.masterGain);
        envelope.connect(this.reverbGain);
        
        // Start LFO
        lfo.start(now);
        lfo.stop(now + duration);
        
        return { oscillator, envelope, lfo, filter };
    }
    
    createPadLayer(frequency, duration = 16) {
        // Create a warm pad sound using multiple detuned oscillators
        const nodes = [];
        const detunes = [-7, -3, 0, 3, 7]; // Slight detuning for richness
        
        detunes.forEach(detune => {
            const tone = this.createAmbientTone(
                frequency * Math.pow(2, detune / 1200), 
                duration, 
                'sawtooth', 
                0.08 / detunes.length
            );
            if (tone) {
                nodes.push(tone);
            }
        });
        
        return nodes;
    }
    
    playChordProgression(chordFrequencies) {
        const chordNodes = [];
        
        // Play main chord tones
        chordFrequencies.forEach((frequency, index) => {
            const tone = this.createAmbientTone(
                frequency, 
                8, 
                index < 2 ? 'sine' : 'triangle', 
                0.12
            );
            if (tone) {
                const now = this.audioContext.currentTime;
                tone.oscillator.start(now + index * 0.2); // Slight stagger
                tone.oscillator.stop(now + 8);
                chordNodes.push(tone);
                this.activeNodes.push(tone);
            }
        });
        
        // Add subtle pad layer for the root note
        if (chordFrequencies.length > 0) {
            const padNodes = this.createPadLayer(chordFrequencies[0] / 2, 8);
            padNodes.forEach(node => {
                if (node) {
                    const now = this.audioContext.currentTime;
                    node.oscillator.start(now + 1);
                    node.oscillator.stop(now + 8);
                    chordNodes.push(node);
                    this.activeNodes.push(node);
                }
            });
        }
        
        return chordNodes;
    }
    
    async start() {
        if (this.isPlaying) return;
        
        if (!this.audioContext) {
            const initialized = await this.initialize();
            if (!initialized) return;
        }
        
        // Resume audio context if suspended
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        
        this.isPlaying = true;
        this.currentChordIndex = 0;
        
        // Start ambient pad layer
        this.startAmbientPad();
        
        // Start chord progression
        this.playNextChord();
        
        // Schedule chord changes every 8 seconds
        const chordInterval = setInterval(() => {
            if (this.isPlaying) {
                this.playNextChord();
            } else {
                clearInterval(chordInterval);
            }
        }, 8000);
        this.intervalIds.push(chordInterval);
        
        // Change progression every 32 seconds for variety
        const progressionInterval = setInterval(() => {
            if (this.isPlaying) {
                this.currentProgression = (this.currentProgression + 1) % this.progressions.length;
                this.currentChordIndex = 0;
            } else {
                clearInterval(progressionInterval);
            }
        }, 32000);
        this.intervalIds.push(progressionInterval);
    }
    
    startAmbientPad() {
        // Create continuous ambient pad using low frequencies
        this.padFrequencies.forEach((frequency, index) => {
            const padNodes = this.createPadLayer(frequency, 16);
            padNodes.forEach(node => {
                if (node) {
                    const now = this.audioContext.currentTime;
                    node.oscillator.start(now + index * 2);
                    node.oscillator.stop(now + 16);
                    this.activeNodes.push(node);
                }
            });
        });
        
        // Restart pad every 16 seconds
        const padInterval = setInterval(() => {
            if (this.isPlaying) {
                this.startAmbientPad();
            } else {
                clearInterval(padInterval);
            }
        }, 16000);
        this.intervalIds.push(padInterval);
    }
    
    playNextChord() {
        if (!this.isPlaying) return;
        
        const currentProgression = this.progressions[this.currentProgression];
        const chord = currentProgression[this.currentChordIndex];
        
        this.playChordProgression(chord);
        
        // Move to next chord in progression
        this.currentChordIndex = (this.currentChordIndex + 1) % currentProgression.length;
    }
    
    stop() {
        this.isPlaying = false;
        
        // Clear all intervals
        this.intervalIds.forEach(id => clearInterval(id));
        this.intervalIds = [];
        
        // Stop all active audio nodes
        this.activeNodes.forEach(node => {
            try {
                if (node.oscillator) node.oscillator.stop();
                if (node.lfo) node.lfo.stop();
            } catch (e) {
                // Node might already be stopped
            }
        });
        this.activeNodes = [];
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
        }
    }
    
    getVolume() {
        return this.volume;
    }
    
    isCurrentlyPlaying() {
        return this.isPlaying;
    }
    
    // Fade in/out for smooth transitions
    fadeIn(duration = 2) {
        if (this.masterGain && this.audioContext) {
            const now = this.audioContext.currentTime;
            this.masterGain.gain.setValueAtTime(0, now);
            this.masterGain.gain.exponentialRampToValueAtTime(this.volume, now + duration);
        }
    }
    
    fadeOut(duration = 2) {
        if (this.masterGain && this.audioContext) {
            const now = this.audioContext.currentTime;
            this.masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
            setTimeout(() => this.stop(), duration * 1000);
        }
    }
}

// Global instance
window.ambientMusicPlayer = new AmbientMusicPlayer();