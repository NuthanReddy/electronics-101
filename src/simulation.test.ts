import { describe, expect, it } from 'vitest';
import { adjacentLesson, categories, categoryLessons, lessons } from './lessons';
import { controls, initialInputs, logicOutput, simulate } from './simulation';
import { completeLesson, decodeState, emptyState } from './state';

const input = () => ({ ...lessons[0].defaults });
describe('electrical experiments', () => {
  it('opens the circuit without current or power', () => {
    expect(simulate('switch', { ...input(), closed: false })).toMatchObject({ current: 0, power: 0, output: 0, active: false });
    expect(simulate('switch', { ...input(), resistance: 30 }).current).toBeCloseTo(0.1);
  });
  it('conserves voltage in series and current in parallel', () => {
    const x = { ...input(), voltage: 6, resistance: 1000, secondary: 2000 };
    const series = simulate('series', x);
    expect(series.current).toBeCloseTo(0.002);
    expect(series.readings[1].value + series.readings[2].value).toBeCloseTo(6);
    const parallel = simulate('parallel', x);
    expect(parallel.current).toBeCloseTo(0.009);
    expect(parallel.readings[0].value + parallel.readings[1].value).toBeCloseTo(parallel.current);
  });
  it('accounts for the summed supply voltage of series cells in power', () => {
    const result = simulate('cells', { ...input(), voltage: 1.5, secondary: 4, resistance: 1000, gate: 'series' });
    expect(result.output).toBe(6);
    expect(result.power).toBeCloseTo(0.036);
  });
  it('limits LED current and blocks reversed and low-voltage junctions', () => {
    const x = { ...input(), voltage: 5, resistance: 300 };
    expect(simulate('led', x).current).toBeCloseTo(0.01);
    expect(simulate('led', { ...x, reverse: true }).current).toBe(0);
    expect(simulate('diode', { ...x, voltage: 0.5 }).current).toBe(0);
  });
  it('handles RC charging, discharging and frequency cutoff', () => {
    const x = { ...input(), voltage: 5, resistance: 10000, capacitance: 100, time: 1, gate: 'charge' };
    expect(simulate('rc', x).output).toBeCloseTo(5 * (1 - Math.exp(-1)));
    expect(simulate('rc', { ...x, gate: 'discharge' }).output).toBeCloseTo(5 * Math.exp(-1));
    const cutoff = 1 / (2 * Math.PI * 10000 * 100e-6);
    expect(simulate('filter', { ...x, gate: 'low-pass', frequency: cutoff }).output).toBeCloseTo(5 / Math.SQRT2);
    expect(simulate('filter', { ...x, gate: 'high-pass', frequency: cutoff }).output).toBeCloseTo(5 / Math.SQRT2);
    const discharge = simulate('rc', { ...x, gate: 'discharge' });
    expect(discharge.power).toBeCloseTo(discharge.current ** 2 * x.resistance);
    const filter = simulate('filter', { ...x, gate: 'low-pass', frequency: cutoff });
    expect(filter.power).toBeCloseTo(filter.current ** 2 * x.resistance / 2);
  });
  it('calculates capacitor networks in SI units', () => {
    const x = { ...input(), voltage: 5, capacitance: 100, secondary: 100, gate: 'series' };
    expect(simulate('capacitor', x).readings[0].value).toBeCloseTo(50);
    expect(simulate('capacitor', { ...x, gate: 'parallel' }).readings[2].value).toBeCloseTo(0.0025);
  });
  it('clips amplifiers and compares against exact reference voltage', () => {
    expect(simulate('opamp', { ...input(), gate: 'non-inverting', voltage: 5, signal: 4 }).output).toBe(5);
    expect(simulate('opamp', { ...input(), gate: 'inverting', voltage: 5, signal: 1 }).output).toBe(-1);
    expect(simulate('comparator', { ...input(), voltage: 5, signal: 2.5, secondary: 2.5 }).output).toBe(0);
  });
  it('produces correct truth tables', () => {
    for (const a of [false, true]) for (const b of [false, true]) {
      expect(logicOutput('AND', a, b)).toBe(a && b);
      expect(logicOutput('NAND', a, b)).toBe(!(a && b));
      expect(logicOutput('XOR', a, b)).toBe(a !== b);
    }
    expect(logicOutput('NOT', true, false)).toBe(false);
  });
  it('ends a monostable pulse at its duration', () => {
    const x = { ...input(), gate: 'monostable', resistance: 10000, capacitance: 100, voltage: 5 };
    expect(simulate('timer', { ...x, time: 1 }).output).toBe(5);
    expect(simulate('timer', { ...x, time: 1.2 }).output).toBe(0);
  });
  it('rejects invalid electrical inputs', () => {
    expect(() => simulate('ohm', { ...input(), resistance: 0 })).toThrow();
    expect(() => simulate('ohm', { ...input(), voltage: NaN })).toThrow();
  });
  it('every lesson has compatible controls and finite model outputs', () => {
    for (const lesson of lessons) {
      const x = initialInputs(lesson.kind, lesson.defaults);
      const result = simulate(lesson.kind, x);
      expect([result.current, result.output, result.power, ...result.readings.map(reading => reading.value)].every(Number.isFinite), lesson.title).toBe(true);
      for (const control of controls(lesson.kind)) {
        if (control.options) expect(control.options, lesson.title).toContain(x[control.key]);
      }
    }
  });
});
describe('lesson navigation and persistence', () => {
  it('covers 68 lessons with the requested category sizes', () => {
    expect(lessons).toHaveLength(68);
    expect(categories.map((_, index) => categoryLessons(index).length)).toEqual([9, 10, 8, 9, 4, 6, 7, 5, 4, 6]);
    expect(new Set(lessons.map(lesson => lesson.id)).size).toBe(68);
  });
  it('clamps navigation and crosses category boundaries', () => {
    expect(adjacentLesson('1-1', -1).id).toBe('1-1');
    expect(adjacentLesson('1-9', 1).id).toBe('2-1');
    expect(adjacentLesson('10-6', 1).id).toBe('10-6');
  });
  it('deduplicates completion and discards obsolete saved lesson ids', () => {
    const state = completeLesson(completeLesson(emptyState(), '1-1'), '1-1');
    expect(state.completed).toEqual(['1-1']);
    expect(decodeState(JSON.stringify({ lessonId: 'missing', completed: ['1-1', '1-1', 'bad', 9] }))).toMatchObject({ lessonId: '1-1', completed: ['1-1'] });
    expect(() => decodeState('{bad')).toThrow();
  });
});
