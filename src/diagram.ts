import type { Inputs, Kind } from './lessons';
import { controls, format, logicOutput } from './simulation';
import { acPlaybackHz } from './current-animation';

const inspect = (key: string, label: string) => `data-inspect="${key}" role="button" tabindex="0" aria-label="Adjust ${label}"`;
const resistor = (x: number, y: number, label: string, vertical = false) => {
  const key = label === 'R2' || label === 'FEEDBACK' ? 'secondary' : 'resistance';
  return `<g ${inspect(key, label)}><g transform="translate(${x} ${y}) rotate(${vertical ? 90 : 0})"><path stroke="#f5f5e8" stroke-width="6" d="M-30 0h60"/><path d="M-30 0h10l4 -8 7 16 7 -16 7 16 7 -16 4 8h14"/><path class="part-hit" d="M-30 0h60"/></g><text x="${vertical ? x + 34 : x}" y="${vertical ? y - 7 : y - 22}">${label}</text><text font-size="7" x="${vertical ? x + 34 : x}" y="${vertical ? y + 7 : y - 11}">{{${key}:ohm}}</text></g>`;
};
const capacitor = (x: number, y: number, label: string, vertical = false) => {
  const key = label === 'C2' ? 'secondary' : 'capacitance';
  return `<g ${inspect(key, label)}><g transform="translate(${x} ${y}) rotate(${vertical ? 90 : 0})"><path stroke="#f5f5e8" stroke-width="6" d="M-30 0h60"/><path d="M-30 0h25m0 -13v26m10 -26v26m0 -13h25"/><path class="part-hit" d="M-30 0h60"/></g><text x="${vertical ? x + 34 : x}" y="${vertical ? y - 7 : y - 24}">${label}</text><text font-size="7" x="${vertical ? x + 34 : x}" y="${vertical ? y + 7 : y - 13}">{{${key}:uF}}</text></g>`;
};
const diode = (x: number, y: number, reverse: boolean, label = 'D', vertical = false) => `<g transform="translate(${x} ${y}) rotate(${vertical ? 90 : 0}) scale(${reverse ? -1 : 1} 1)"><path stroke="#f5f5e8" stroke-width="6" d="M-30 0h60"/><path d="M-30 0h17m26 0h17M-13 -12v24L10 0zM12 -13v26"/></g><text x="${vertical ? x + 27 : x}" y="${vertical ? y : y - 20}">${label}</text>`;
const lamp = (x: number, y: number, active: boolean) => `<circle class="${active ? 'lit' : ''}" fill="#f5f5e8" cx="${x}" cy="${y}" r="17"/><path d="m${x - 10} ${y - 10} 20 20m-20 0 20 -20"/>`;
const source = `<g ${inspect('voltage', 'Supply voltage')}><path d="M45 95V55h90m-90 65v50h90M28 95h34m-25 12h16m-25 12h34"/><text x="22" y="82">+</text><text x="23" y="142">-</text><text x="40" y="199">{{voltage:V}}</text></g>`;
const switches = (closed: boolean) => `<g class="schematic-switch" data-toggle="closed" role="button" tabindex="0" aria-label="Toggle circuit switch"><circle cx="135" cy="170" r="3"/><circle cx="185" cy="170" r="3"/><path d="m135 170 50 ${closed ? 0 : -24}"/><path class="hit-area" d="M125 170h70"/></g>`;
export function schematic(kind: Kind, x: Inputs, active: boolean): string {
  let drawing = '';
  const switchable = ['switch', 'conductor', 'ohm', 'series', 'parallel', 'kirchhoff', 'divider', 'led', 'diode', 'breadboard', 'meter', 'button'].includes(kind);
  if (kind === 'logic') {
    drawing = `<path d="M35 80h55m-55 55h55M235 108h55"/><g ${inspect('gate', 'Logic gate')}><rect x="90" y="65" width="145" height="87" rx="15"/><text x="161" y="115">${x.gate}</text></g><g data-toggle="closed" role="button" tabindex="0" aria-pressed="${x.closed}" aria-label="Toggle input A"><text x="25" y="67">A: ${Number(x.closed)}</text></g><g data-toggle="reverse" role="button" tabindex="0" aria-pressed="${x.reverse}" aria-label="Toggle input B"><text x="25" y="154">B: ${Number(x.reverse)}</text></g>${lamp(286, 108, logicOutput(x.gate, x.closed, x.reverse))}<text x="161" y="198">IDEAL LOGIC GATE</text>`;
  } else if (kind === 'cells') {
    const count = Math.max(1, Math.min(4, Math.round(x.secondary)));
    const cells = Array.from({ length: count }, (_, index) => {
      const px = x.gate === 'series' ? 45 : 40 + index * 32;
      const py = x.gate === 'series' ? 55 + (index + 0.5) * 115 / count : 110;
      return `<g ${inspect('voltage', 'Cell voltage')} data-cell="${index}"><path stroke="#f5f5e8" stroke-width="8" d="M${px} ${py - 5}v10"/><path d="M${px - 13} ${py - 5}h26m-20 10h14"/><text font-size="7" x="${x.gate === 'series' ? px + 31 : px}" y="${x.gate === 'series' ? py + 3 : 142}">{{voltage:V}}</text></g>`;
    }).join('');
    const branches = x.gate === 'series' ? '<path data-source-branch d="M45 55v115"/>' : Array.from({ length: count }, (_, index) => `<path data-source-branch d="M${40 + index * 32} 55v115"/>`).join('');
    drawing = `<g data-cycle="gate" role="button" tabindex="0" aria-label="Switch cell arrangement"><text x="165" y="20">${x.gate.toUpperCase()} (click to change)</text></g><g ${inspect('secondary', 'Number of cells')}><text x="165" y="38">${count} CELLS</text></g><g data-topology="${x.gate}">${branches}${cells}<path d="M${x.gate === 'series' ? 45 : 40} 55H265V170H${x.gate === 'series' ? 45 : 40}"/>${resistor(265, 113, 'LOAD', true)}</g><text x="45" y="48">+</text><text x="45" y="185">-</text><text x="205" y="201">PACK: ${format(x.gate === 'series' ? x.voltage * count : x.voltage, 'V')}</text>`;
  } else if (kind === 'ac') {
    const supply = x.gate === 'AC' ? `<g ${inspect('voltage', 'AC peak voltage')} data-source="AC"><circle cx="45" cy="111" r="20"/><path d="M32 111q6 -13 13 0t13 0M45 91V55h90m-90 76v39h90"/><text x="45" y="199">{{voltage:V}} peak</text></g>` : `<g data-source="DC">${source}</g>`;
    drawing = `<g data-cycle="gate" role="button" tabindex="0" aria-label="Switch AC or DC source"><text x="165" y="23">${x.gate} SOURCE (click to change)</text></g>${supply}<path d="M135 55h130v115H135"/>${resistor(265, 113, 'LOAD', true)}`;
  } else if (kind === 'rectifier' && x.gate === 'full-wave') {
    const bridgeDiode = (px: number, py: number, angle: number) => `<g transform="translate(${px} ${py}) rotate(${angle})"><path stroke="#f5f5e8" stroke-width="6" d="M-21 0h42"/><path d="M-21 0h10M11 0h10M-11 -10v20L9 0zM11 -11v22"/></g>`;
    drawing = `<circle cx="40" cy="110" r="18"/><path d="M28 110q6 -12 12 0t12 0M40 92V50h120m-120 78v42h120M160 50l60 60-60 60-60-60zM220 110h60v80H100v-80"/>${bridgeDiode(130, 80, -45)}${bridgeDiode(190, 80, 45)}${bridgeDiode(130, 140, 45)}${bridgeDiode(190, 140, -45)}${resistor(280, 150, 'LOAD', true)}<text x="40" y="205">AC</text><text x="280" y="99">+</text><text x="96" y="99">-</text>`;
  } else if (kind === 'rc' && x.gate === 'discharge') {
    drawing = `<path d="M75 60h180v105H75z"/>${resistor(170, 60, 'R')}${capacitor(75, 112, 'C', true)}<text x="165" y="198">SOURCE DISCONNECTED</text>`;
  } else if (kind === 'opamp' || kind === 'comparator') {
    drawing = `<path d="M100 65v96l105 -48zM35 85h65m-65 55h65m105 -27h89"/><text x="111" y="91">+</text><text x="111" y="147">-</text><text x="33" y="67">INPUT</text><text x="44" y="162">REF</text><text x="268" y="97">OUT</text>`;
    if (kind === 'opamp') drawing += `<path d="M260 113v-78H79v105"/>${resistor(170, 35, 'FEEDBACK')}`;
  } else if (kind === 'timer') {
    drawing = `<rect x="105" y="55" width="110" height="102" rx="5"/><text x="160" y="98">555</text><text x="160" y="121">TIMER</text><path d="M40 70h65m110 10h72m-72 50h35v55H50v-37"/><text x="40" y="57">VCC</text><text x="269" y="66">OUT</text>${resistor(60, 148, 'R')}${capacitor(250, 185, 'C')}`;
  } else if (kind === 'transistor' || kind === 'mosfet') {
    drawing = `${source}<path d="M135 55h110v30m0 64v21H135M115 112h72M215 80v65m0 -32 30 -28m-30 28 30 35"/>${resistor(147, 112, kind === 'mosfet' ? 'GATE' : 'BASE')}${lamp(245, 65, active)}<text x="266" y="128">${kind === 'mosfet' ? 'FET' : 'NPN'}</text>`;
  } else if (kind === 'sensor') {
    drawing = `${source}<path d="M135 55h110v115H135M245 111h55"/>${resistor(245, 81, 'SENSOR', true)}${resistor(245, 143, 'FIXED', true)}<text x="290" y="102">OUT</text>`;
  } else if (kind === 'button') {
    drawing = `${source}<path d="M135 55h110v55h55m-55 0v60h-60"/>${resistor(190, x.gate === 'pull-down' ? 170 : 55, 'PULL')}${switches(x.closed)}<text x="280" y="96">INPUT</text>`;
  } else {
    drawing = `${source}<path d="M135 55h130v115h-80"/>`;
    if (switchable) drawing += switches(x.closed);
    else drawing += '<path d="M135 170h50"/>';
    if (kind === 'parallel') drawing += `<path d="M95 55v58h170"/>${resistor(180, 55, 'R1')}${resistor(180, 113, 'R2')}`;
    else if (kind === 'capacitor') {
      drawing += capacitor(265, 112, 'C1', true);
      if (x.gate === 'series') drawing += capacitor(180, 55, 'C2');
      if (x.gate === 'parallel') drawing += `<path d="M160 55v115"/>${capacitor(160, 112, 'C2', true)}`;
    }
    else if (kind === 'filter' && x.gate === 'high-pass') drawing += `${capacitor(180, 55, 'C')}${resistor(265, 112, 'R', true)}<path d="M265 82h32"/><text x="290" y="72">OUT</text>`;
    else if (kind === 'rc' || kind === 'filter') drawing += `${resistor(180, 55, 'R')}${capacitor(265, 112, 'C', true)}<path d="M265 82h32"/><text x="290" y="72">OUT</text>`;
    else if (['diode', 'led', 'rectifier', 'zener', 'breadboard'].includes(kind)) drawing += `${resistor(180, 55, 'R')}${diode(265, 112, x.reverse, kind === 'led' || kind === 'breadboard' ? 'LED' : kind === 'zener' ? 'ZENER' : 'D', true)}`;
    else if (['series', 'divider', 'kirchhoff', 'pot'].includes(kind)) drawing += `${resistor(180, 55, 'R1')}${resistor(265, 113, 'R2', true)}<path d="M265 86h32"/><text x="290" y="76">OUT</text>`;
    else drawing += `${resistor(180, 55, kind === 'conductor' ? 'LINK' : 'R')}${lamp(265, 113, active)}`;
  }
  const keys = new Set(controls(kind, x).map(control => control.key));
  drawing = drawing.replace(/\{\{(\w+):(\w+)\}\}/g, (_, key: keyof Inputs, unit: string) => format(Number(x[key]), unit));
  drawing = drawing.replace(/data-inspect="([^"]+)" role="button" tabindex="0" aria-label="[^"]*"/g, (attributes, key: keyof Inputs) => keys.has(key) ? attributes : '');
  return `<svg class="schematic ${active ? 'energized' : ''}" viewBox="0 0 330 220" role="group" aria-label="Interactive ${kind} circuit schematic"><g>${drawing}</g></svg>`;
}

export function waveform(kind: Kind, x: Inputs): string {
  const points: string[] = [];
  const output: string[] = [];
  for (let step = 0; step <= 120; step++) {
    const t = step / 120;
    const sine = Math.sin(t * 2 * Math.PI * 2);
    const input = kind === 'ac' && x.gate === 'DC' ? x.voltage > 0 ? 1 : 0 : kind === 'ac' && x.voltage === 0 ? 0 : sine;
    points.push(`${20 + t * 290},${65 - input * 35}`);
    let y = input;
    if (kind === 'rectifier') {
      const drop = x.gate === 'full-wave' ? 1.4 : 0.7;
      y = x.voltage > 0 ? Math.max(0, (x.gate === 'full-wave' ? Math.abs(sine) : sine) - drop / x.voltage) : 0;
    } else if (kind === 'rc') {
      const decay = Math.exp(-t * 5);
      y = x.gate === 'discharge' ? decay : 1 - decay;
    } else if (kind === 'timer') {
      const duty = (x.resistance + x.secondary) / (x.resistance + 2 * x.secondary);
      y = x.gate === 'monostable' ? t < 0.55 ? 1 : 0 : (t * 2) % 1 < duty ? 1 : 0;
    }
    output.push(`${20 + t * 290},${65 - y * 35}`);
  }
  const dc = kind === 'ac' && x.gate === 'DC';
  return `<svg class="waveform" viewBox="0 0 330 115" role="img" aria-label="${dc ? 'Constant DC voltage' : kind === 'rc' ? 'Normalized capacitor voltage over five time constants' : kind === 'timer' && x.gate === 'monostable' ? 'Illustrative one-shot pulse, not elapsed-time scale' : 'Two-cycle normalized waveform'}"><path class="axis" d="M20 15v85m0 -35h290"/><polyline class="wave-input" points="${points.join(' ')}" opacity="${dc || kind === 'rc' || kind === 'timer' ? 0 : 0.45}"/><polyline points="${output.join(' ')}"/>${kind === 'ac' ? '<circle class="wave-cursor" r="4" cx="20" cy="65"/>' : ''}<text x="20" y="113">${dc ? 'Steady DC; amplitude normalized' : kind === 'rc' ? '0 to 5 time constants' : kind === 'timer' ? 'Illustrative pulse shape' : kind === 'ac' ? `Two cycles (${format(2 / x.frequency, 's')}); normalized` : 'Two cycles; amplitude normalized'}</text></svg>${kind === 'ac' && !dc ? `<p class="playback-note">Illustrative playback: ${acPlaybackHz} cycles/s (time-scaled). Markers reverse with the waveform; electrical values use the selected frequency.</p>` : ''}`;
}
