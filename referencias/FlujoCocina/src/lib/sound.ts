// Custom synthesizer using browser Web Audio API to play clean, professional kitchen audio notifications.
// It requires NO external files (.mp3, .wav) and runs flawlessly offline inside sandboxes and iframes.

class KitchenSoundPlayer {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    // Lazy initialize on first interaction to comply with browser autoplay policies
  }

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
  }

  // Beautiful high-pitched crystal "ping" bell when a new order is completed (Listo)
  public playSuccessChime() {
    if (!this.enabled) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.05); // quick glide up
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.3); // E6 harmonizer
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.8);
    } catch (e) {
      console.warn('Audio failed to play', e);
    }
  }

  // Classic kitchen bell "ding" when a new order is received
  public playNewOrderBell() {
    if (!this.enabled) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, now); // B5
      
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1174.66, now); // D6 (making a beautiful minor third)
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start(now);
      osc2.start(now);
      
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
    } catch (e) {
      console.warn('Audio failed to play', e);
    }
  }

  // Whoosh-click sound when starting an order (Advance to En Proceso)
  public playStartChime() {
    if (!this.enabled) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, now); // E4
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.15); // glide up
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      console.warn('Audio failed to play', e);
    }
  }

  // Soft low click when reversing / rewinding states
  public playRewindChime() {
    if (!this.enabled) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(261.63, now + 0.15); // glide down
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      console.warn('Audio failed to play', e);
    }
  }

  // Subtle clock ticking click when adjusting order times
  public playTickChime() {
    if (!this.enabled) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {
      console.warn('Audio failed to play', e);
    }
  }

  // Ambient synth rise on page start or reset
  public playStartupSweep() {
    if (!this.enabled) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.4);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.6);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.7);
    } catch (e) {
      console.warn('Audio failed to play', e);
    }
  }
}

export const soundPlayer = new KitchenSoundPlayer();
