// Web Audio API Procedural Ambient Sound Generator for high-altitude flight - ATMOS exact
class FlightAudioEngine {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioNode | null = null;
  private gainNode: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private rumbleOsc: OscillatorNode | null = null;
  private rumbleGain: GainNode | null = null;
  private clickOsc: OscillatorNode | null = null;
  private clickGain: GainNode | null = null;
  public isPlaying: boolean = false;

  public init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Create pink noise buffer for realistic high-altitude slipstream wind
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Atmospheric low-pass filter (warm cabin muffled jet airflow)
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(380, this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(1.5, this.ctx.currentTime);

    // Deep sub-bass jet turbine rumble (55 Hz for cabin hum)
    this.rumbleOsc = this.ctx.createOscillator();
    this.rumbleOsc.type = 'sine';
    this.rumbleOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

    this.rumbleGain = this.ctx.createGain();
    this.rumbleGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);

    // Connect noise path
    whiteNoise.connect(this.filterNode);
    this.filterNode.connect(this.gainNode);

    // Connect rumble path
    this.rumbleOsc.connect(this.rumbleGain);
    this.rumbleGain.connect(this.gainNode);

    this.gainNode.connect(this.ctx.destination);

    whiteNoise.start();
    this.rumbleOsc.start();
    this.noiseNode = whiteNoise;
  }

  public toggle(): boolean {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.isPlaying) {
      this.fadeTo(0, 0.6);
      this.isPlaying = false;
    } else {
      this.fadeTo(0.18, 1.2);
      this.isPlaying = true;
    }
    return this.isPlaying;
  }

  public updateSpeed(speedFactor: number) {
    if (!this.ctx || !this.filterNode || !this.rumbleOsc || !this.isPlaying) return;
    // Dynamic modulation with scroll velocity - ATMOS exact
    const targetFreq = 380 + speedFactor * 420;
    this.filterNode.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
    this.rumbleOsc.frequency.setTargetAtTime(55 + speedFactor * 35, this.ctx.currentTime, 0.08);

    // Modulate gain based on speed for dynamic wind intensity
    if (this.gainNode) {
      const targetGain = 0.12 + speedFactor * 0.15;
      this.gainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.15);
    }
  }

  public playClick() {
    if (!this.ctx) return;
    // Subtle UI click chime
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    clickOsc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.05);
    clickGain.gain.setValueAtTime(0.03, this.ctx.currentTime);
    clickGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
    clickOsc.connect(clickGain);
    clickGain.connect(this.ctx.destination);
    clickOsc.start();
    clickOsc.stop(this.ctx.currentTime + 0.05);
  }

  public playTelemetryConfirm() {
    if (!this.ctx) return;
    // Telemetry confirmation chime
    const confirmOsc = this.ctx.createOscillator();
    const confirmGain = this.ctx.createGain();
    confirmOsc.type = 'sine';
    confirmOsc.frequency.setValueAtTime(880, this.ctx.currentTime);
    confirmOsc.frequency.setValueAtTime(1100, this.ctx.currentTime + 0.05);
    confirmGain.gain.setValueAtTime(0.02, this.ctx.currentTime);
    confirmGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    confirmOsc.connect(confirmGain);
    confirmGain.connect(this.ctx.destination);
    confirmOsc.start();
    confirmOsc.stop(this.ctx.currentTime + 0.1);
  }

  private fadeTo(target: number, duration: number) {
    if (!this.ctx || !this.gainNode) return;
    this.gainNode.gain.linearRampToValueAtTime(target, this.ctx.currentTime + duration);
  }
}

export const flightAudio = new FlightAudioEngine();
