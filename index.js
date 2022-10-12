const core = require('elementary-core');
const el = require('@nick-thompson/elementary');
const path = require('path');

let voices = [
  { gate: 0.2, freq: 440, key: 'v1' },
  { gate: 0.2, freq: 440, key: 'v2' },
  { gate: 0.0, freq: 440, key: 'v3' },
  { gate: 0.0, freq: 440, key: 'v4' },
];

let nextVoice = 0;

updateVoiceState = (e) => {
  if (e && e.hasOwnProperty && e.type === 'noteOn') {
    voices[nextVoice].gate = 1.0;
    voices[nextVoice].freq = e.noteFrequency;

    if (++nextVoice >= voices.length) nextVoice -= voices.length;
  }

  if (e && e.hasOwnProperty && e.type === 'noteOff') {
    for (let i = 0; i < voices.length; ++i) {
      if (voices[i].freq === e.noteFrequency) {
        voices[i].gate = 0;
      }
    }
  }
};

synthVoice = (voice) => {
  let gate = el.const({ key: `${voice.key}:gate`, value: 0.2 * voice.gate });
  let env = el.adsr(4.0, 1.0, 0.4, 2.0, gate);

  return el.mul(
    env,
    el.bleptriangle(el.const({ key: `${voice.key}:freq`, value: voice.freq }))
  );
};

modulate = (x, rate, amount) => {
  return el.add(x, el.mul(amount, el.cycle(rate)));
};

core.on('load', () => {
  core.on('midi', (e) => {
    updateVoiceState(e);
    let out = el.add(voices.map(synthVoice));
    let filtered = el.lowpass(modulate(800, 0.1, 400), 1.4, out);
    let delayed = el.delay({ size: 44100 }, el.ms2samps(500), 0.6, filtered);
    let wetDry = el.add(delayed, filtered);
    let reverbed = el.convolve(
      { path: path.resolve(__dirname, './KnightsHall.wav') },
      wetDry
    );
    let wetDry2 = el.add(reverbed, wetDry);
    core.render(wetDry, wetDry2);
  });
});
