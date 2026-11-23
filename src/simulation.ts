import type { Inputs, Kind } from './lessons';

export interface Reading { label: string; value: number; unit: string }
export interface Result {
  current: number;
  output: number;
  power: number;
  active: boolean;
  status: string;
  formula: string;
  readings: Reading[];
}
export interface Control {
  key: keyof Inputs;
  label: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}
const voltage: Control = { key: 'voltage', label: 'Supply voltage', unit: 'V', min: 0, max: 12, step: 0.1 };
const resistance: Control = { key: 'resistance', label: 'Resistance R1', unit: 'ohm', min: 100, max: 20000, step: 100 };
const secondary: Control = { ...resistance, key: 'secondary', label: 'Resistance R2' };
const capacitor: Control = { key: 'capacitance', label: 'Capacitance', unit: 'uF', min: 1, max: 1000, step: 1 };
const frequency: Control = { key: 'frequency', label: 'Frequency', unit: 'Hz', min: 1, max: 1000, step: 1 };
const signal: Control = { key: 'signal', label: 'Input voltage', unit: 'V', min: 0, max: 5, step: 0.05 };
const time: Control = { key: 'time', label: 'Elapsed time', unit: 's', min: 0, max: 10, step: 0.05 };
const closed: Control = { key: 'closed', label: 'Circuit switch' };
const reverse: Control = { key: 'reverse', label: 'Reverse polarity' };
const mode = (options: string[], label = 'Mode'): Control => ({ key: 'gate', label, options });

export function controls(kind: Kind): Control[] {
  switch (kind) {
    case 'switch': return [closed, voltage, { ...resistance, label: 'Lamp resistance', min: 10, max: 1000, step: 10 }];
    case 'conductor': return [closed, voltage, mode(['copper', 'graphite', 'rubber'], 'Material')];
    case 'ohm': return [voltage, resistance, closed];
    case 'series': case 'parallel': case 'kirchhoff': case 'divider': return [voltage, resistance, secondary, closed];
    case 'cells': return [{ ...voltage, label: 'Voltage per cell', max: 3 }, { key: 'secondary', label: 'Number of cells', min: 1, max: 4, step: 1 }, mode(['series', 'parallel']), resistance];
    case 'pot': return [voltage, { ...signal, label: 'Wiper position', unit: '%', max: 100, step: 1 }, resistance];
    case 'ac': return [{ ...voltage, label: 'Peak voltage' }, frequency, resistance];
    case 'breadboard': return [voltage, resistance, closed];
    case 'meter': return [mode(['voltage', 'current', 'resistance'], 'Meter setting'), voltage, resistance, closed];
    case 'led': case 'diode': return [closed, reverse, voltage, resistance];
    case 'zener': return [voltage, resistance];
    case 'rectifier': return [mode(['half-wave', 'full-wave']), { ...voltage, label: 'AC peak voltage' }, frequency, resistance];
    case 'capacitor': return [voltage, capacitor, { ...capacitor, key: 'secondary', label: 'Second capacitance' }, mode(['single', 'parallel', 'series'])];
    case 'rc': return [mode(['charge', 'discharge']), voltage, resistance, capacitor, time];
    case 'filter': return [mode(['low-pass', 'high-pass']), { ...voltage, label: 'Input amplitude' }, resistance, capacitor, frequency];
    case 'button': return [mode(['pull-up', 'pull-down']), { ...closed, label: 'Button pressed' }, voltage, resistance];
    case 'transistor': return [mode(['switch', 'follower']), voltage, { ...signal, label: 'Base drive voltage' }, { ...resistance, label: 'Collector load' }, { ...secondary, label: 'Base resistor' }];
    case 'mosfet': return [voltage, { ...signal, label: 'Gate voltage' }, { ...resistance, label: 'Load resistance' }];
    case 'sensor': return [mode(['light', 'temperature', 'pressure', 'analog', 'adc'], 'Sensor'), voltage, { ...signal, label: 'Sensor level / temperature', unit: '% / C', max: 100, min: 0, step: 1 }, { ...resistance, label: 'Divider resistor' }];
    case 'opamp': return [mode(['non-inverting', 'inverting', 'follower']), voltage, signal, resistance, { ...secondary, label: 'Feedback resistance' }];
    case 'comparator': return [voltage, signal, { key: 'secondary', label: 'Reference voltage', unit: 'V', min: 0, max: 5, step: 0.05 }];
    case 'timer': return [mode(['astable', 'monostable']), voltage, resistance, secondary, capacitor, time];
    case 'logic': return [mode(['BUFFER', 'NOT', 'AND', 'OR', 'XOR', 'NAND', 'NOR'], 'Logic gate'), { ...closed, label: 'Input A' }, { ...reverse, label: 'Input B' }, voltage];
  }
}

export function initialInputs(kind: Kind, inputs: Inputs): Inputs {
  const result = { ...inputs };
  for (const control of controls(kind)) {
    if (control.options && !control.options.includes(String(result[control.key]))) {
      result.gate = control.options[0];
    }
  }
  if (kind === 'comparator') result.secondary = inputs.secondary === 2500 ? 2.5 : inputs.voltage / 2;
  if (kind === 'capacitor' && result.secondary === 1000) result.secondary = result.capacitance;
  if (kind === 'switch') result.resistance = 30;
  if (kind === 'transistor' && result.secondary === 1000) result.secondary = 20000;
  return result;
}

export function logicOutput(gate: string, a: boolean, b: boolean): boolean {
  switch (gate) {
    case 'BUFFER': return a;
    case 'NOT': return !a;
    case 'AND': return a && b;
    case 'OR': return a || b;
    case 'XOR': return a !== b;
    case 'NAND': return !(a && b);
    case 'NOR': return !(a || b);
    default: throw new Error(`Unknown logic gate: ${gate}`);
  }
}

export function simulate(kind: Kind, x: Inputs): Result {
  const values = [x.voltage, x.resistance, x.secondary, x.capacitance, x.frequency, x.signal, x.time];
  if (!values.every(Number.isFinite) || x.voltage < 0 || x.resistance <= 0 || x.secondary < 0 || x.capacitance <= 0 || x.frequency <= 0 || x.time < 0) {
    throw new Error('Simulation inputs must be finite and within physical bounds.');
  }
  const v = x.voltage;
  const r = x.resistance;
  const r2 = Math.max(x.secondary, 0.001);
  const c = x.capacitance * 1e-6;
  let current = x.closed ? v / r : 0;
  let output = x.closed ? v : 0;
  let formula = 'I = V / R; P = V I';
  let status = x.closed ? 'Current is flowing' : 'Open circuit';
  let calculatedPower: number | undefined;
  const readings: Reading[] = [];
  const add = (label: string, value: number, unit: string) => readings.push({ label, value, unit });
  switch (kind) {
    case 'conductor': {
      const material = x.gate === 'copper' ? 0.1 : x.gate === 'graphite' ? 300 : 1e9;
      current = x.closed ? v / (30 + material) : 0;
      output = current * 30;
      status = x.gate === 'rubber' ? 'Insulating link: negligible current' : 'Conducting link';
      formula = 'I = V / (Rlamp + Rmaterial)';
      add('Material resistance', material, 'ohm');
      break;
    }
    case 'series': case 'kirchhoff': case 'divider':
      current = x.closed ? v / (r + r2) : 0;
      output = current * r2;
      formula = 'Req = R1 + R2; Vout = V R2 / Req';
      add('Equivalent resistance', r + r2, 'ohm');
      add('Voltage across R1', current * r, 'V');
      add('Voltage across R2', output, 'V');
      break;
    case 'parallel':
      current = x.closed ? v / r + v / r2 : 0;
      formula = '1 / Req = 1 / R1 + 1 / R2; I = I1 + I2';
      add('Branch 1 current', x.closed ? v / r : 0, 'A');
      add('Branch 2 current', x.closed ? v / r2 : 0, 'A');
      add('Equivalent resistance', r * r2 / (r + r2), 'ohm');
      break;
    case 'cells':
      output = x.gate === 'series' ? v * x.secondary : v;
      current = output / r;
      formula = x.gate === 'series' ? 'Vpack = N Vcell; I = Vpack / R' : 'Vpack = Vcell; Iper cell = Iload / N';
      status = `${x.secondary} cells in ${x.gate}`;
      add('Pack voltage', output, 'V');
      add('Current per cell', x.gate === 'series' ? current : current / r2, 'A');
      break;
    case 'ac':
      output = v / Math.SQRT2;
      current = output / r;
      formula = 'Vrms = Vpeak / sqrt(2); Irms = Vrms / R';
      add('RMS voltage', output, 'V');
      add('Period', 1 / x.frequency, 's');
      status = 'Alternating sine wave';
      break;
    case 'pot':
      output = v * x.signal / 100;
      current = v / r;
      formula = 'Vwiper = V x position / 100';
      status = 'Unloaded potentiometer';
      add('Wiper output', output, 'V');
      break;
    case 'led': case 'diode': case 'breadboard': {
      const drop = kind === 'diode' ? 0.7 : 2;
      current = x.closed && (!x.reverse || kind === 'breadboard') ? Math.max(0, v - drop) / r : 0;
      output = current > 0 ? drop : 0;
      formula = `I = max(0, Vsupply - ${drop} V) / R (forward only)`;
      status = x.reverse && kind !== 'breadboard' ? 'Reverse biased: blocked' : current > 0.02 && kind !== 'diode' ? 'Warning: LED current exceeds 20 mA' : current > 0 ? 'Forward conduction' : 'No forward current';
      add('Resistor voltage', current * r, 'V');
      break;
    }
    case 'zener':
      output = Math.min(v, 3.3);
      current = Math.max(0, v - output) / r;
      formula = 'Vout = min(Vsupply, 3.3 V); Iz = (Vsupply - Vout) / R';
      status = v > 3.3 ? 'Ideal unloaded Zener regulation' : 'Supply below breakdown';
      add('Zener dissipation', output * current, 'W');
      break;
    case 'rectifier': {
      const drop = x.gate === 'full-wave' ? 1.4 : 0.7;
      output = Math.max(0, v - drop);
      const theta = v > drop ? Math.asin(drop / v) : Math.PI / 2;
      const average = v > drop ? (2 * v * Math.cos(theta) - drop * (Math.PI - 2 * theta)) / (x.gate === 'full-wave' ? Math.PI : 2 * Math.PI) : 0;
      current = average / r;
      calculatedPower = v > drop ? (v * v * ((Math.PI - 2 * theta) / 2 + Math.sin(2 * theta) / 2) - 2 * drop * v * Math.cos(theta)) / ((x.gate === 'full-wave' ? Math.PI : 2 * Math.PI) * r) : 0;
      formula = 'Vpeak out = max(0, Vpeak in - diode drops); average integrates conducting portion';
      status = `${x.gate} pulsed output`;
      add('Output peak', output, 'V');
      add('Average output', average, 'V');
      break;
    }
    case 'capacitor': {
      const c2 = r2 * 1e-6;
      const equivalent = x.gate === 'parallel' ? c + c2 : x.gate === 'series' ? c * c2 / (c + c2) : c;
      current = 0;
      output = v;
      formula = 'Q = C V; E = 0.5 C V squared';
      status = 'Charged capacitor: steady DC current is zero';
      add('Equivalent capacitance', equivalent * 1e6, 'uF');
      add('Stored charge', equivalent * v * 1e6, 'uC');
      add('Stored energy', 0.5 * equivalent * v * v, 'J');
      break;
    }
    case 'rc': {
      const decay = Math.exp(-x.time / (r * c));
      output = v * (x.gate === 'discharge' ? decay : 1 - decay);
      current = v * decay / r;
      if (x.gate === 'discharge') calculatedPower = current * current * r;
      formula = x.gate === 'discharge' ? 'Vc = Vinitial exp(-t / RC)' : 'Vc = V (1 - exp(-t / RC))';
      status = `${x.gate === 'discharge' ? 'Discharging' : 'Charging'} at ${x.time.toFixed(2)} s`;
      add('Time constant', r * c, 's');
      add('Capacitor voltage', output, 'V');
      add('Half-voltage time', Math.LN2 * r * c, 's');
      break;
    }
    case 'filter': {
      const factor = 2 * Math.PI * x.frequency * r * c;
      const gain = (x.gate === 'high-pass' ? factor : 1) / Math.sqrt(1 + factor * factor);
      output = v * gain;
      // Magnitude of current in the series RC path, not output voltage divided by R.
      current = v / Math.hypot(r, 1 / (2 * Math.PI * x.frequency * c));
      calculatedPower = current * current * r / 2;
      formula = x.gate === 'high-pass' ? '|H| = wRC / sqrt(1 + (wRC) squared)' : '|H| = 1 / sqrt(1 + (wRC) squared)';
      status = `${x.gate} amplitude response`;
      add('Cutoff frequency', 1 / (2 * Math.PI * r * c), 'Hz');
      add('Amplitude gain', gain, 'x');
      break;
    }
    case 'button':
      output = (x.gate === 'pull-up' ? !x.closed : x.closed) ? v : 0;
      current = x.closed ? v / r : 0;
      formula = 'Vinput = defined high or low; Ipressed = V / Rpull';
      status = `Input ${output > 0 ? 'HIGH' : 'LOW'}; button ${x.closed ? 'pressed' : 'released'}`;
      add('Input level', output, 'V');
      break;
    case 'transistor': {
      const ib = Math.max(0, x.signal - 0.7) / r2;
      current = x.gate === 'follower' ? Math.min(v, Math.max(0, x.signal - 0.7)) / r : Math.min(ib * 100, Math.max(0, v - 0.2) / r);
      output = x.gate === 'follower' ? Math.min(v, Math.max(0, x.signal - 0.7)) : current * r;
      formula = x.gate === 'follower' ? 'Ve = max(0, Vbase - 0.7 V), limited by supply' : 'Ib = (Vdrive - 0.7) / Rbase; Ic = min(100 Ib, (Vs - 0.2) / Rload)';
      status = current === 0 ? 'Cut off' : x.gate === 'follower' ? 'Emitter following base' : ib * 100 >= Math.max(0, v - 0.2) / r ? 'Transistor saturated' : 'Active region';
      add('Base current', ib, 'A');
      break;
    }
    case 'mosfet':
      current = x.signal >= 2 ? v / (r + 0.5) : 0;
      output = current * r;
      formula = 'Above ideal threshold: I = V / (Rload + Ron), Ron = 0.5 ohm';
      status = x.signal >= 2 ? 'Channel ON (ideal threshold model)' : 'Channel OFF';
      add('Channel dissipation', current * current * 0.5, 'W');
      break;
    case 'sensor': {
      const sensingResistance = x.gate === 'temperature' ? 10000 * Math.exp(3950 * (1 / (x.signal + 273.15) - 1 / 298.15)) : 100000 / (1 + x.signal * (x.gate === 'pressure' ? 0.5 : 0.9));
      const analog = ['analog', 'adc'].includes(x.gate);
      output = analog ? v * x.signal / 100 : v * r / (sensingResistance + r);
      current = analog ? 0 : v / (sensingResistance + r);
      formula = analog ? 'Vout = Vreference x level / 100; code = round(255 x level / 100)' : 'Vout = V Rfixed / (Rsensor + Rfixed)';
      status = analog ? 'Ideal unloaded sensor output' : 'Sensor divider';
      if (!analog) add('Sensor resistance', sensingResistance, 'ohm');
      if (x.gate === 'adc') add('8-bit code', Math.round(255 * x.signal / 100), 'count');
      break;
    }
    case 'opamp': {
      const gain = x.gate === 'follower' ? 1 : x.gate === 'inverting' ? -r2 / r : 1 + r2 / r;
      const ideal = x.signal * gain;
      output = Math.max(x.gate === 'inverting' ? -v : 0, Math.min(v, ideal));
      current = 0;
      formula = x.gate === 'follower' ? 'Vout = Vin, limited by rails' : x.gate === 'inverting' ? 'Vout = -Vin Rfeedback / Rinput, limited by +/- supply' : 'Vout = Vin (1 + Rfeedback / Rground), limited by rails';
      status = output !== ideal ? 'Output clipped at supply rail' : 'Ideal negative feedback';
      add('Closed-loop gain', gain, 'x');
      break;
    }
    case 'comparator':
      output = x.signal > x.secondary ? v : 0;
      current = 0;
      formula = 'Vout = Vsupply if Vinput > Vreference, otherwise 0';
      status = output > 0 ? 'Output HIGH' : 'Output LOW';
      add('Reference', x.secondary, 'V');
      break;
    case 'timer': {
      const f = 1.44 / ((r + 2 * r2) * c);
      const duty = (r + r2) / (r + 2 * r2);
      const duration = 1.1 * r * c;
      output = (x.gate === 'monostable' ? x.time < duration : (x.time * f) % 1 < duty) ? v : 0;
      current = output / 1000;
      formula = x.gate === 'monostable' ? 'Pulse width = 1.1 R C' : 'f = 1.44 / ((R1 + 2 R2) C); duty = (R1 + R2) / (R1 + 2 R2)';
      status = x.gate === 'monostable' ? x.time < duration ? 'Timed pulse HIGH' : 'Pulse finished' : 'Astable oscillator';
      if (x.gate === 'monostable') add('Pulse duration', duration, 's');
      else { add('Oscillation frequency', f, 'Hz'); add('Duty cycle', duty * 100, '%'); }
      break;
    }
    case 'logic':
      output = logicOutput(x.gate, x.closed, x.reverse) ? v : 0;
      current = output / 1000;
      formula = `${x.gate}(${Number(x.closed)}, ${Number(x.reverse)}) = ${Number(output > 0)}`;
      status = `Output ${output > 0 ? 'HIGH' : 'LOW'}`;
      break;
    case 'meter':
      formula = 'Voltmeter in parallel; ammeter in series; resistance measured unpowered';
      add('Meter reading', x.gate === 'current' ? current : x.gate === 'resistance' ? r : v, x.gate === 'current' ? 'A' : x.gate === 'resistance' ? 'ohm' : 'V');
      status = x.gate === 'resistance' ? 'Ideal resistance reading (disconnect real power first)' : 'Ideal meter reading';
      break;
    case 'switch': case 'ohm': break;
  }
  const power = calculatedPower ?? (kind === 'ac' || kind === 'cells' ? output * current : v * current);
  if (kind === 'ohm' && power > 0.25) status = 'Warning: exceeds a 0.25 W resistor rating';
  return { current, output, power, active: current > 1e-7 || Math.abs(output) > 1e-7, status, formula, readings };
}

export function format(value: number, unit: string): string {
  if (unit === 'count') return `${Math.round(value)}`;
  const magnitude = Math.abs(value);
  if (value !== 0 && magnitude < 0.001 && ['A', 'W', 'J', 's'].includes(unit)) return `${(value * 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })} u${unit}`;
  if (value !== 0 && magnitude < 1 && ['A', 'W', 'J', 's'].includes(unit)) return `${(value * 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} m${unit}`;
  if (magnitude >= 1000 && ['ohm', 'Hz'].includes(unit)) return `${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} k${unit}`;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 3 })} ${unit}`.trim();
}
