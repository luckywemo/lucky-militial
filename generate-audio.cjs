const fs = require('fs');
const path = require('path');

function createWavFile(filename, durationSeconds, synthFunction) {
  const sampleRate = 44100;
  const numChannels = 1;
  const bitsPerSample = 16;
  
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = Math.floor(sampleRate * durationSeconds) * blockAlign;
  const chunkSize = 36 + dataSize;
  
  const buffer = Buffer.alloc(44 + dataSize);
  
  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(chunkSize, 4);
  buffer.write('WAVE', 8);
  
  // fmt sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  
  // data sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  
  // Write audio data
  const numSamples = dataSize / 2;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = synthFunction(t, i, numSamples);
    
    // Convert -1.0..1.0 to 16-bit PCM (-32768..32767)
    const val = Math.max(-1, Math.min(1, sample));
    const intVal = val < 0 ? val * 32768 : val * 32767;
    buffer.writeInt16LE(Math.floor(intVal), 44 + i * 2);
  }
  
  const outPath = path.join(__dirname, 'public', 'assets', 'audio', filename);
  fs.writeFileSync(outPath, buffer);
  console.log('Created: ' + filename);
}

// Track 2: Deep Pulsing Drone
createWavFile('track-2.wav', 30, (t) => {
  const LFO = Math.sin(t * 2 * Math.PI * 0.5); // 0.5 Hz pulse
  const bass = Math.sin(t * 2 * Math.PI * 55); // A1 bass
  return bass * (0.3 + 0.7 * LFO) * 0.4;
});

// Track 3: Digital Scanline Tech
createWavFile('track-3.wav', 30, (t) => {
  const sweep = (t % 2) / 2; // 2 sec sweep
  const freq = 100 + sweep * 800;
  const wave = Math.sign(Math.sin(t * 2 * Math.PI * freq)); // Square wave
  return wave * 0.1 * (1 - sweep); // Fade out each sweep
});

// Track 4: Tension Alarm
createWavFile('track-4.wav', 30, (t) => {
  const beat = (t * 2) % 1; // 120 BPM
  const f = beat < 0.5 ? 440 : 415; // A4 to G#4
  const wave = Math.sin(t * 2 * Math.PI * f) + 0.5 * Math.sin(t * 2 * Math.PI * f * 2.01);
  return wave * 0.15;
});

// Track 5: Low Distorted Rumble
createWavFile('track-5.wav', 30, (t) => {
  const noise = Math.random() * 2 - 1;
  const bass = Math.sin(t * 2 * Math.PI * 40);
  const mix = bass * 0.8 + noise * 0.2;
  return mix * 0.3; // Distorted and quiet
});
