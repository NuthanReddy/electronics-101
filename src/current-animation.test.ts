import { describe, expect, it } from 'vitest';
import { acPlaybackHz, markerPosition, waveformPoint } from './current-animation';

describe('illustrative current motion', () => {
  it('reverses AC direction with the waveform and has no net displacement per cycle', () => {
    const period = 1 / acPlaybackHz;
    const at = (time: number) => markerPosition(0.5, time, 0.003, true);
    for (const time of [0, 0.15, 0.8, 1.5, 6.25]) expect(at(time + period)).toBeCloseTo(at(time), 12);
    expect(at(period / 4 + 0.01)).toBeGreaterThan(at(period / 4));
    expect(at(3 * period / 4 + 0.01)).toBeLessThan(at(3 * period / 4));
    expect(waveformPoint(period / 4, 3, true).y).toBeLessThan(65);
    expect(waveformPoint(3 * period / 4, 3, true).y).toBeGreaterThan(65);
    for (const offset of [0.1, 0.3, 0.5, 0.7, 0.9]) for (let time = 0; time <= period; time += 0.1) {
      expect(markerPosition(offset, time, 0.003, true)).toBeGreaterThan(0);
      expect(markerPosition(offset, time, 0.003, true)).toBeLessThan(1);
    }
  });
  it('keeps DC moving forward and zero current fixed', () => {
    const at = (time: number) => markerPosition(0.1, time, 0.003, false);
    expect(at(0.5)).toBeGreaterThan(at(0));
    expect(at(1)).toBeGreaterThan(at(0.5));
    for (const alternating of [false, true]) {
      expect(markerPosition(0.5, 0, 0, alternating)).toBe(0.5);
      expect(markerPosition(0.5, 10, 0, alternating)).toBe(0.5);
    }
    expect(waveformPoint(0.5, 3, false).y).toBe(30);
    expect(waveformPoint(1.5, 3, false).y).toBe(30);
    expect(waveformPoint(1.5, 0, true).y).toBe(65);
  });
});
