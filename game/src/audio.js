// Synthesised sound: no audio files ship with the game. Engine hum, siren,
// gunshots, UI blips and a small bass-and-hats groove are all built from
// WebAudio oscillators and filtered noise.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let engineFilter = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let musicTimer = null;
  let musicStep = 0;
  let muted = false;
  let track = 0;
  const TRACKS = [
    { name: 'SOLMAR FM', tempo: 240, bass: [55, 0, 55, 65.4, 55, 0, 49, 58.3] },
    { name: 'NEON NIGHTS', tempo: 200, bass: [65.4, 0, 65.4, 0, 77.8, 0, 65.4, 58.3] },
    { name: 'COASTAL CRUISE', tempo: 300, bass: [49, 0, 0, 58.3, 0, 65.4, 0, 0] },
  ];

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume();
      return true;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'square';
      engineOsc2.frequency.value = 28;
      engineOsc.connect(engineFilter);
      engineOsc2.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      engineOsc2.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 720;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
    } catch {
      return false;
    }
    return true;
  }

  function noiseBuffer(duration) {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function blip(freq, seconds, type, volume) {
    if (!ensure()) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume || 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + seconds);
  }

  return {
    /** Create/resume the context on a user gesture. */
    ensure,
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = muted ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    /** Engine note follows speed; silent on foot. */
    setEngine(speedNorm, driving) {
      if (!ctx) return;
      const target = driving ? 0.05 + speedNorm * 0.09 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(50 + speedNorm * 130, ctx.currentTime, 0.1);
      engineOsc2.frequency.setTargetAtTime(25 + speedNorm * 65, ctx.currentTime, 0.1);
      engineFilter.frequency.setTargetAtTime(300 + speedNorm * 900, ctx.currentTime, 0.1);
    },
    /** Two-tone siren wail while police are near. */
    setSiren(on, dt) {
      if (!ctx) return;
      sirenGain.gain.setTargetAtTime(on ? 0.05 : 0, ctx.currentTime, 0.2);
      if (!on) return;
      sirenTimer += dt;
      sirenOsc.frequency.value = Math.sin(sirenTimer * 5.2) > 0 ? 720 : 960;
    },
    shot() {
      if (!ensure()) return;
      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer(0.14);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1800;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start();
    },
    thud() {
      blip(90, 0.25, 'sine', 0.4);
    },
    pickup() {
      blip(660, 0.12, 'sine', 0.25);
      setTimeout(() => blip(990, 0.16, 'sine', 0.25), 90);
    },
    denied() {
      blip(180, 0.15, 'square', 0.12);
    },
    click() {
      blip(520, 0.06, 'sine', 0.15);
    },
    jingle() {
      [523, 659, 784, 1047].forEach((freq, i) => {
        setTimeout(() => blip(freq, 0.22, 'triangle', 0.25), i * 110);
      });
    },
    /** Cash-register cha-ching for a garage sale. */
    playChaChing() {
      blip(1318, 0.09, 'triangle', 0.3);
      setTimeout(() => blip(1760, 0.18, 'triangle', 0.3), 90);
      setTimeout(() => blip(2093, 0.22, 'triangle', 0.22), 180);
    },
    /** Short warning beep for a mission timer running low. */
    alarm() {
      blip(880, 0.12, 'square', 0.14);
      setTimeout(() => blip(880, 0.12, 'square', 0.14), 160);
    },
    /** The radio station now playing. */
    trackName() {
      return TRACKS[track].name;
    },
    /** Switch to the next station (T key); restarts the groove. */
    nextTrack() {
      track = (track + 1) % TRACKS.length;
      musicStep = 0;
      if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
        this.startMusic();
      }
      return TRACKS[track].name;
    },
    /** Start the low-key bass-and-hats groove. */
    startMusic() {
      if (!ensure() || musicTimer) return;
      const current = TRACKS[track];
      musicTimer = setInterval(() => {
        if (muted) return;
        const note = current.bass[musicStep % current.bass.length];
        musicStep += 1;
        if (note > 0) blip(note, 0.22, 'triangle', 0.16);
        if (musicStep % 2 === 0) {
          const source = ctx.createBufferSource();
          source.buffer = noiseBuffer(0.03);
          const gain = ctx.createGain();
          gain.gain.value = 0.05;
          source.connect(gain);
          gain.connect(master);
          source.start();
        }
      }, current.tempo);
    },
    stopMusic() {
      if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
      }
    },
  };
}
