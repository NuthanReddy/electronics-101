export const acPlaybackHz = 0.5;

export function markerPosition(offset: number, elapsed: number, current: number, alternating: boolean): number {
  if (current <= 1e-7) return offset;
  if (alternating) return offset - 0.07 * Math.cos(2 * Math.PI * acPlaybackHz * elapsed);
  return (elapsed * Math.min(0.7, 0.15 + current * 2) + offset) % 1;
}

export function waveformPoint(elapsed: number, voltage: number, alternating: boolean): { x: number; y: number } {
  const cycles = (elapsed * acPlaybackHz) % 2;
  return {
    x: 20 + cycles * 145,
    y: voltage === 0 ? 65 : 65 - (alternating ? Math.sin(cycles * Math.PI * 2) : 1) * 35,
  };
}
