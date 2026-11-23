import './style.css';
import { adjacentLesson, categories, categoryLessons, lessons, type Inputs, type Lesson } from './lessons';
import { controls, format, initialInputs, simulate } from './simulation';
import { completeLesson, decodeState, emptyState, storageKey, type SavedState } from './state';
import { schematic, waveform } from './diagram';
import { Workbench } from './workbench';
import { acPlaybackHz } from './current-animation';

const paths: Record<string, string> = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  home: 'm3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8',
  book: 'M12 5v16M12 5C8 2 3 4 3 4v15s5-2 9 2c4-4 9-2 9-2V4s-5-2-9 1',
  chip: 'M7 7h10v10H7zM9 3v4m6-4v4M9 17v4m6-4v4M3 9h4m-4 6h4m10-6h4m-4 6h4',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M10 2h4l1 3 3 1 3-1 2 4-2 3v2l2 3-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-3v-2L1 9l2-4 3 1 3-1z',
  globe: 'M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0M3 12h18M12 3c-6 6-6 12 0 18 6-6 6-12 0-18',
  left: 'm15 5-7 7 7 7',
  right: 'm9 5 7 7-7 7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  reset: 'M4 9a8 8 0 1 1 1 9M4 3v6h6',
  top: 'm3 7 9-4 9 4-9 4zM3 12l9 4 9-4M3 17l9 4 9-4',
  check: 'm5 12 4 4L19 6',
  close: 'm6 6 12 12M6 18 18 6',
  bolt: 'm13 2-8 12h7l-1 8 8-12h-7z',
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
};
const icon = (name: string, size = 21) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] ?? paths.bolt}"/></svg>`;
const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing interface element: ${selector}`);
  return element;
};
const app = $('#app');
app.innerHTML = `
  <a class="skip-link" href="#lesson-panel">Skip to lesson</a>
  <aside class="sidebar" aria-label="Main navigation">
    <button class="rail-button expand" data-action="expand" aria-label="Expand navigation" aria-expanded="false">${icon('menu')}<span>Menu</span></button>
    <div class="rail-divider"></div>
    <button class="rail-button selected" data-action="home" aria-label="Home workbench" title="Home">${icon('home')}<span>Workbench</span></button>
    <button class="rail-button" data-action="library" aria-label="Browse all lessons" title="Lessons">${icon('book')}<span>Lessons</span></button>
    <button class="rail-button" data-action="components" aria-label="Explore components" title="Components">${icon('chip')}<span>Components</span></button>
    <div class="rail-spacer"></div>
    <button class="rail-button" data-action="settings" aria-label="Open settings" title="Settings">${icon('settings')}<span>Settings</span></button>
    <button class="rail-button" data-action="glossary" aria-label="Open bilingual electronics glossary" title="Glossary">${icon('globe')}<span>Glossary</span></button>
    <span class="rail-mark">E / 101</span>
  </aside>
  <div class="workspace">
    <header class="header">
      <a class="brand" href="#1-1" aria-label="Electronics 101 home"><span class="brand-icon">${icon('bolt', 25)}</span><div><h1>ELECTRONICS <strong>101</strong></h1><p>Small circuits. Big discoveries.</p></div></a>
      <div class="header-right"><div class="progress-area"><div><span id="progress-label">Basics</span><span id="progress-count">0 / 9 complete</span></div><progress id="progress" value="0" max="9" aria-label="Category lesson progress"></progress></div><time id="clock"></time></div>
    </header>
    <main class="main">
      <section class="stage-wrap" aria-label="Interactive experiment">
        <div class="stage-heading"><span class="eyebrow">THE WORKBENCH</span><h2 id="stage-title">Open & closed circuits</h2><div class="stage-note"><span class="live-dot"></span><span id="stage-status">Current is flowing</span></div></div>
        <div id="stage" class="stage" tabindex="0" role="region" aria-label="3D circuit workbench. Click components to inspect them. Drag to pan, right drag to rotate, wheel to zoom. WASD pans, Q and E rotate, Space toggles the circuit."></div>
        <div class="bench-footer"><div class="stage-readings"><span><small id="supply-label">SUPPLY</small><strong id="supply-value">3 V</strong></span><span><small id="current-label">CURRENT</small><strong id="current-value">100 mA</strong></span><span><small id="output-label">OUTPUT</small><strong id="output-value">3 V</strong></span></div>
        <div class="camera-area"><div class="camera-toolbar" role="toolbar" aria-label="Camera controls">
          <button data-camera="left" aria-label="Rotate left" title="Rotate left (Q)">${icon('left')}</button>
          <button data-camera="right" aria-label="Rotate right" title="Rotate right (E)">${icon('right')}</button>
          <span></span><button data-camera="out" aria-label="Zoom out" title="Zoom out">${icon('minus')}</button>
          <button data-camera="in" aria-label="Zoom in" title="Zoom in">${icon('plus')}</button><span></span>
          <button data-camera="reset" aria-label="Reset camera" title="Reset camera (R)">${icon('reset')}</button>
          <button data-camera="top" aria-label="Toggle top view" title="Top view">${icon('top')}</button>
        </div><p><kbd>W A S D</kbd> pan <i></i><kbd>Q E</kbd> rotate <i></i>scroll to zoom</p></div></div>
      </section>
      <aside id="lesson-panel" class="lesson-panel" aria-label="Lesson information">
        <div class="tabs" role="tablist" aria-label="Lesson views">
          ${['Overview', 'Components', 'Circuit', 'Maths'].map((tab, index) => `<button id="tab-${tab.toLowerCase()}" role="tab" aria-selected="${index === 0}" aria-controls="tab-content" tabindex="${index === 0 ? 0 : -1}" data-tab="${tab.toLowerCase()}">${tab}</button>`).join('')}
        </div>
        <div class="panel-scroll"><div id="tab-content" role="tabpanel" aria-labelledby="tab-overview"></div><div id="controls-home"><section class="experiment-controls"><div class="section-label">${icon('settings', 15)} MAKE IT YOURS <button class="text-button" data-action="reset-experiment">Reset</button></div><div id="controls"></div></section></div><p class="model-note">Idealized learning models, not SPICE. Always check real component ratings. Use only low-voltage, current-limited circuits.</p></div>
        <div class="completion-bar"><button id="complete" data-action="complete">${icon('check', 18)} Mark lesson complete</button><span id="lesson-number">LESSON 01 / 68</span></div>
      </aside>
    </main>
    <footer class="lesson-dock" aria-label="Lesson navigation">
      <div class="dock-heading"><label class="category-select"><span>EXPLORE A CHAPTER</span><select id="category" aria-label="Lesson category">${categories.map((category, index) => `<option value="${index}">${category.name}</option>`).join('')}</select></label><div class="dock-caption"><span id="category-size">9 hands-on lessons</span><span>LEARN BY DOING</span></div><div class="lesson-arrows"><button data-action="previous" aria-label="Previous lesson">${icon('left')}</button><button data-action="next" aria-label="Next lesson">${icon('right')}</button></div></div>
      <div id="lesson-strip" class="lesson-strip" role="list" aria-label="Lessons in selected category"></div>
    </footer>
  </div>
  <div id="notification" class="notification" role="status" aria-live="polite" hidden></div>
  <dialog id="dialog"><div class="dialog-header"><h2 id="dialog-title"></h2><button data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div><div id="dialog-body"></div></dialog>
  <dialog id="circuit-dialog" aria-labelledby="circuit-dialog-title"><div class="dialog-header"><h2 id="circuit-dialog-title">Enlarged circuit</h2><button data-action="close-circuit" aria-label="Close enlarged circuit" autofocus>${icon('close')}</button></div><div class="circuit-dialog-body"><div id="enlarged-schematic"></div><div id="enlarged-controls"></div></div></dialog>
`;

let notificationTimeout = 0;
function notify(message: string): void {
  const notification = $('#notification');
  notification.textContent = message;
  notification.hidden = false;
  window.clearTimeout(notificationTimeout);
  notificationTimeout = window.setTimeout(() => { notification.hidden = true; }, 7000);
}
let saved: SavedState;
try { saved = decodeState(localStorage.getItem(storageKey)); }
catch (error) { console.error('Unable to load saved lesson progress', error); saved = emptyState(); notify('Saved progress could not be loaded. This session will start fresh.'); }
let lesson = lessons.find(item => item.id === location.hash.slice(1)) ?? lessons.find(item => item.id === saved.lessonId) ?? lessons[0];
let inputs = initialInputs(lesson.kind, lesson.defaults);
let result = simulate(lesson.kind, inputs);
let tab = 'circuit';
let component = '';
let workbench: Workbench | undefined;
let audio: AudioContext | undefined;
try { workbench = new Workbench($('#stage'), () => toggleInput('closed'), notify, inspectComponent); }
catch (error) {
  console.error('Unable to initialize WebGL workbench', error);
  $('#stage').innerHTML = '<div class="graphics-error"><h3>3D graphics are unavailable</h3><p>Enable hardware acceleration and reload. You can still explore every lesson, control and circuit diagram.</p></div>';
  notify('Your browser could not start WebGL. The electrical experiments still work in the Circuit and Maths tabs.');
}
function persist(): void {
  saved.lessonId = lesson.id;
  try { localStorage.setItem(storageKey, JSON.stringify(saved)); }
  catch (error) { console.error('Unable to save progress', error); notify('Browser storage is unavailable. Your progress will not survive a reload.'); }
}
function chirp(): void {
  if (!saved.sound) return;
  try {
    audio ??= new AudioContext();
    void audio.resume().catch(error => { console.error('Unable to resume sound', error); notify('Your browser blocked audio playback.'); });
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = inputs.closed ? 620 : 380;
    gain.gain.setValueAtTime(0.025, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.08);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.08);
  } catch (error) { console.error('Unable to play switch sound', error); notify('Switch sound is unavailable in this browser.'); }
}
const componentInfo: Record<string, { title: string; text: string }> = {
  battery: { title: 'Voltage source', text: 'Establishes a potential difference between its terminals. A battery supplies DC; an AC generator reverses voltage periodically. The workbench uses ideal sources without internal resistance or capacity limits.' },
  meter: { title: 'Meter / readout', text: 'Shows the selected circuit measurement. The AC/DC experiment displays RMS voltage for AC and steady voltage for DC. Measurement probes and internal meter circuitry are idealized.' },
  resistor: { title: 'Resistor', text: 'Limits current, sets divider ratios and dissipates heat. The brown-black-red-gold model illustrates a nominal 1 kilohm resistor; live values are set by the controls, not the painted bands.' },
  lamp: { title: 'Lamp / output indicator', text: 'Makes the circuit state visible. The lamp experiment uses the selected lamp resistance. In other lessons the lamp is an output indicator, not an additional modeled resistance. Brightness is illustrative.' },
  switch: { title: 'Switch / button', text: 'Opens or closes a path. You can click a knife switch in 3D or use the control below. Button states remain latched here so you can inspect them.' },
  capacitor: { title: 'Capacitor', text: 'Stores charge and responds to changing voltage. Capacitance controls are in microfarads; calculations convert them to farads.' },
  diode: { title: 'Diode / LED', text: 'Allows forward conduction. Diode and LED experiments use fixed drops of 0.7 V and 2 V respectively. LEDs in other lessons are output indicators, not additional modeled loads. Reverse breakdown, temperature and parasitics are not modeled.' },
  transistor: { title: 'Transistor', text: 'Controls a load from a separate drive signal. The NPN model uses gain 100 and a 0.2 V saturation drop; the MOSFET has an ideal 2 V threshold and 0.5 ohm on-resistance.' },
  chip: { title: 'Integrated circuit', text: 'Combines many electronic functions. This model illustrates a timer, ideal amplifier, comparator or Boolean gate; it is not a physical pin-by-pin wiring guide.' },
  sensor: { title: 'Sensor', text: 'Turns a physical property into an electrical signal. LDR and pressure curves are illustrative; the thermistor uses an explicitly defined beta model.' },
};
function componentKeys(item: Lesson): string[] {
  const actual = workbench?.components.filter(key => componentInfo[key]);
  if (actual?.length) return actual;
  const kind = item.kind;
  const special = ['capacitor', 'rc', 'filter'].includes(kind) ? ['capacitor']
    : ['led', 'diode', 'rectifier', 'zener', 'breadboard'].includes(kind) ? ['diode']
    : ['transistor', 'mosfet'].includes(kind) ? ['transistor']
    : ['timer', 'logic', 'opamp', 'comparator'].includes(kind) ? ['chip']
    : kind === 'sensor' ? ['sensor'] : ['lamp', 'switch'];
  return ['battery', 'resistor', ...special];
}
function miniIllustration(item: Lesson): string {
  const color = categories[item.category].color;
  const kind = item.kind;
  const shape = ['capacitor', 'rc', 'filter'].includes(kind)
    ? `<ellipse cx="62" cy="18" rx="13" ry="6" fill="#abcdd2"/><path d="M49 18v27c0 8 26 8 26 0V18" fill="#6d9fad"/><path d="M56 51v9m13-9v9"/>`
    : ['transistor', 'mosfet'].includes(kind) ? '<path d="M50 14h28v31H50z" fill="#263b49"/><path d="M55 45v15m9-15v15m9-15v15" stroke="#b59a56"/>'
    : ['logic', 'timer', 'opamp', 'comparator'].includes(kind) ? '<path d="m42 23 27-12 21 12v23L64 57 42 44z" fill="#263b49"/><path d="m43 30-7 4v9m7-6-7 4v9m42-14 8 4v9m-8-2 8 4v9" stroke="#b59a56"/><text x="64" y="38" fill="#eee9db" stroke="none" text-anchor="middle" font-size="10">IC</text>'
    : ['led', 'diode', 'rectifier', 'zener', 'breadboard'].includes(kind) ? '<path d="M55 48V29a10 10 0 0 1 20 0v19z" fill="#df886f"/><path d="M58 48v12m14-12v12"/><path d="m79 20 8-8m-5 0h5v5"/>'
    : ['series', 'parallel', 'ohm', 'divider', 'pot', 'kirchhoff'].includes(kind) ? '<path d="m35 46 20-10m30-12 18-9"/><path d="m47 37 27-18 18 12-28 19z" fill="#dfc19c"/><path d="m55 32 17 12m-11-17 17 12m-11-17 17 12" stroke="#8c5c38" stroke-width="4"/>'
    : kind === 'sensor' ? '<path d="M54 43v17m16-17v17"/><ellipse cx="63" cy="29" rx="18" ry="17" fill="#d6b17a"/><path d="M51 22h24m-24 6h24m-24 6h24" stroke="#b9604e"/>'
    : '<path d="M48 57V26c0-9 23-9 23 0v31" fill="#bfd47a"/><ellipse cx="59.5" cy="26" rx="11.5" ry="5" fill="#e0e8a7"/><path d="M48 56c0 6 23 6 23 0" fill="#a6b966"/><path d="M57 21v-5h6v5"/><circle cx="86" cy="38" r="12" fill="#f5cc6b"/><path d="M80 52h12v5H80z"/>';
  return `<svg viewBox="0 0 130 73" aria-hidden="true"><path d="m6 54 58-29 59 29-57 29z" fill="${color}" opacity=".16"/><g stroke="#263b49" stroke-width="1.5" stroke-linejoin="round">${shape}</g></svg>`;
}
function renderStrip(): void {
  $<HTMLSelectElement>('#category').value = String(lesson.category);
  const list = categoryLessons(lesson.category);
  $('#category-size').textContent = `${list.length} hands-on lessons`;
  $('#lesson-strip').innerHTML = list.map((item, index) => `<div role="listitem"><button class="lesson-card ${item.id === lesson.id ? 'active' : ''}" data-lesson="${item.id}" aria-current="${item.id === lesson.id ? 'step' : 'false'}"><span class="card-number">${String(index + 1).padStart(2, '0')}</span>${saved.completed.includes(item.id) ? `<span class="card-check">${icon('check', 12)}</span>` : ''}${miniIllustration(item)}<span class="card-title">${item.title}</span></button></div>`).join('');
  const strip = $('#lesson-strip');
  const active = $('#lesson-strip .active');
  const stripBounds = strip.getBoundingClientRect();
  const activeBounds = active.getBoundingClientRect();
  if (activeBounds.left < stripBounds.left) strip.scrollLeft += activeBounds.left - stripBounds.left;
  else if (activeBounds.right > stripBounds.right) strip.scrollLeft += activeBounds.right - stripBounds.right;
  $<HTMLButtonElement>('[data-action="previous"]').disabled = lesson.id === lessons[0].id;
  $<HTMLButtonElement>('[data-action="next"]').disabled = lesson.id === lessons.at(-1)?.id;
}
function renderProgress(): void {
  const list = categoryLessons(lesson.category);
  const count = list.filter(item => saved.completed.includes(item.id)).length;
  $('#progress-label').textContent = categories[lesson.category].name;
  $('#progress-count').textContent = `${count} / ${list.length} complete`;
  const progress = $<HTMLProgressElement>('#progress');
  progress.value = count;
  progress.max = list.length;
  const complete = saved.completed.includes(lesson.id);
  $('#complete').innerHTML = `${icon('check', 18)} ${complete ? 'Lesson completed' : 'Mark lesson complete'}`;
  $('#complete').classList.toggle('completed', complete);
  $('#complete').setAttribute('aria-pressed', String(complete));
  $('#lesson-number').textContent = `LESSON ${String(lessons.indexOf(lesson) + 1).padStart(2, '0')} / 68`;
}
function renderControls(): void {
  $('#controls').innerHTML = controls(lesson.kind, inputs).map(control => {
    const value = inputs[control.key];
    if (control.options) return `<label class="select-control"><span>${control.label}</span><select data-input="${control.key}">${control.options.map(option => `<option ${value === option ? 'selected' : ''} value="${option}">${option}</option>`).join('')}</select></label>`;
    if (typeof value === 'boolean') return `<button class="toggle-control ${value ? 'on' : ''}" data-toggle="${control.key}" aria-pressed="${value}"><span>${control.label}</span><span class="toggle-state">${value ? 'ON' : 'OFF'}<i></i></span></button>`;
    return `<label class="range-control"><span>${control.label}<output id="control-${control.key}">${format(Number(value), control.unit ?? '')}</output></span><input type="range" data-input="${control.key}" min="${control.min}" max="${control.max}" step="${control.step}" value="${value}" aria-label="${control.label}" /></label>`;
  }).join('');
}
function circuitMarkup(): string {
  return `<p class="small-copy">Click a highlighted part to adjust it. Teal indicates an energized experiment.</p>${schematic(lesson.kind, inputs, result.active)}<p class="diagram-note">Conceptual diagram and 3D arrangement, not a pin-by-pin construction guide.</p>${['ac', 'rectifier', 'rc', 'timer'].includes(lesson.kind) ? waveform(lesson.kind, inputs) : ''}<div class="circuit-state">${icon('bolt', 17)}<span>${result.status}</span></div>`;
}
function circuitScope(): string {
  return $<HTMLDialogElement>('#circuit-dialog').open ? '#enlarged-schematic' : '#schematic-holder';
}
function enlargeCircuit(): void {
  $('#circuit-dialog-title').textContent = `${lesson.title} - circuit`;
  $('#enlarged-schematic').innerHTML = circuitMarkup();
  $('#enlarged-controls').append($('.experiment-controls'));
  $<HTMLDialogElement>('#circuit-dialog').showModal();
}
$<HTMLDialogElement>('#circuit-dialog').addEventListener('close', () => {
  $('#controls-home').append($('.experiment-controls'));
  $('#enlarged-schematic').replaceChildren();
  document.querySelector<HTMLElement>('[data-action="enlarge-circuit"]')?.focus({ preventScroll: true });
});
function renderTab(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button => {
    const active = button.dataset.tab === tab;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  const content = $('#tab-content');
  content.setAttribute('aria-labelledby', `tab-${tab}`);
  const heading = `<div class="lesson-kicker"><span>${categories[lesson.category].name}</span><span>${String(categoryLessons(lesson.category).indexOf(lesson) + 1).padStart(2, '0')}</span></div><h2>${lesson.title}</h2>`;
  if (tab === 'overview') {
    content.innerHTML = `${heading}<p class="lesson-explanation">${lesson.explanation}</p><div class="takeaway"><span>${icon('bolt', 18)} THE BIG IDEA</span><p>${lesson.takeaway}</p></div><div class="try-it"><h3>${icon('sun', 17)} Try this</h3><p>${lesson.experiment}</p></div>`;
  } else if (tab === 'components') {
    const keys = componentKeys(lesson);
    if (!keys.includes(component)) component = keys[0];
    content.innerHTML = `${heading}<p class="small-copy">Select a component to get to know it.</p><div class="component-list">${keys.map(key => `<button data-component="${key}" aria-pressed="${component === key}" class="${component === key ? 'active' : ''}">${icon(key === 'battery' ? 'bolt' : key === 'chip' ? 'chip' : 'settings', 19)}<span>${componentInfo[key].title}</span>${icon('right', 15)}</button>`).join('')}</div><div class="component-detail"><h3>${componentInfo[component].title}</h3><p>${componentInfo[component].text}</p></div>`;
  } else if (tab === 'circuit') {
    content.innerHTML = `${heading}<button class="enlarge-button" data-action="enlarge-circuit" aria-haspopup="dialog">Enlarge circuit</button><div id="schematic-holder">${circuitMarkup()}</div>`;
  } else {
    content.innerHTML = `${heading}<p class="small-copy">Numbers that move with your experiment.</p><div class="formula">${result.formula}</div><dl class="math-readings">${[
      { label: lesson.kind === 'ac' && inputs.gate === 'AC' ? 'AC peak voltage' : lesson.kind === 'cells' ? 'Voltage per cell' : 'Supply voltage', value: inputs.voltage, unit: 'V' },
      { label: lesson.kind === 'ac' && inputs.gate === 'AC' ? 'RMS current' : lesson.kind === 'filter' ? 'Peak RC path current' : lesson.kind === 'rectifier' ? 'Average load current' : 'Circuit / load current', value: result.current, unit: 'A' },
      { label: lesson.kind === 'ac' && inputs.gate === 'AC' ? 'RMS output voltage' : ['filter', 'rectifier'].includes(lesson.kind) ? 'Peak output voltage' : 'Output voltage', value: result.output, unit: 'V' },
      ...result.readings,
      { label: lesson.kind === 'filter' ? 'Average resistor power' : lesson.kind === 'rc' && inputs.gate === 'discharge' ? 'Discharge resistor power' : ['opamp', 'comparator', 'sensor', 'capacitor'].includes(lesson.kind) ? 'Modeled source power (excludes IC quiescent power)' : 'Modeled source power', value: result.power, unit: 'W' },
    ].map(reading => `<div><dt>${reading.label}</dt><dd>${format(reading.value, reading.unit)}</dd></div>`).join('')}</dl><p class="math-assumptions">Ideal sources and simplified component behavior. For amplifiers and digital ICs, supply and quiescent currents are not modeled.</p>${lesson.kind === 'logic' ? `<table class="truth-table"><caption>${inputs.gate} truth table</caption><thead><tr><th>A</th><th>B</th><th>OUT</th></tr></thead><tbody>${[0, 1].flatMap(a => [0, 1].map(b => `<tr><td>${a}</td><td>${b}</td><td>${Number(simulate('logic', { ...inputs, closed: Boolean(a), reverse: Boolean(b) }).output > 0)}</td></tr>`)).join('')}</tbody></table>` : ''}`;
  }
  if ($<HTMLDialogElement>('#circuit-dialog').open) {
    $('#circuit-dialog-title').textContent = `${lesson.title} - circuit`;
    $('#enlarged-schematic').innerHTML = circuitMarkup();
  }
}
function updateReadings(): void {
  result = simulate(lesson.kind, inputs);
  $('#supply-label').textContent = lesson.kind === 'cells' ? 'PER CELL' : lesson.kind === 'ac' && inputs.gate === 'AC' ? 'AC PEAK' : 'SUPPLY';
  $('#current-label').textContent = lesson.kind === 'ac' && inputs.gate === 'AC' ? 'RMS CURRENT' : 'CURRENT';
  $('#output-label').textContent = lesson.kind === 'ac' && inputs.gate === 'AC' ? 'RMS OUTPUT' : lesson.kind === 'cells' ? 'PACK' : 'OUTPUT';
  $('#supply-value').textContent = format(inputs.voltage, 'V');
  $('#current-value').textContent = format(result.current, 'A');
  $('#output-value').textContent = format(result.output, 'V');
  $('#stage-status').textContent = lesson.kind === 'ac' && inputs.gate === 'AC' ? `${result.status} - motion ${acPlaybackHz} cycles/s (time-scaled)` : result.status;
  $('.stage-note').classList.toggle('inactive', !result.active);
  workbench?.update(inputs, result);
  if (tab === 'maths' || tab === 'circuit') renderTab();
}
function selectLesson(next: Lesson, replaceHistory = false): void {
  const restoreCardFocus = document.activeElement instanceof Element && document.activeElement.matches('.lesson-card');
  lesson = next;
  inputs = initialInputs(lesson.kind, lesson.defaults);
  if (location.hash !== `#${lesson.id}`) {
    if (replaceHistory) history.replaceState(null, '', `#${lesson.id}`);
    else history.pushState(null, '', `#${lesson.id}`);
  }
  persist();
  $('#stage-title').textContent = lesson.title;
  workbench?.setLesson(lesson, inputs);
  workbench?.settings(saved.motion, saved.current);
  renderControls();
  updateReadings();
  renderTab();
  renderStrip();
  renderProgress();
  if (restoreCardFocus) $('#lesson-strip .active').focus({ preventScroll: true });
}
function inspectComponent(key: string): void {
  if (!componentKeys(lesson).includes(key)) return;
  component = key;
  tab = 'components';
  renderTab();
  $(`[data-component="${key}"]`).focus({ preventScroll: true });
}
function inspectControl(key: string): void {
  const control = document.querySelector<HTMLElement>(`#controls [data-input="${key}"], #controls [data-toggle="${key}"]`);
  if (control) control.focus();
}
function cycleMode(key: string): void {
  const control = controls(lesson.kind, inputs).find(control => control.key === key);
  if (!control?.options || key !== 'gate') return;
  const index = control.options.indexOf(inputs.gate);
  const select = $<HTMLSelectElement>('#controls [data-input="gate"]');
  select.value = control.options[(index + 1) % control.options.length];
  select.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector<SVGElement>(`${circuitScope()} [data-cycle="${key}"]`)?.focus();
}
function toggleInput(key: 'closed' | 'reverse'): void {
  if (!controls(lesson.kind).some(control => control.key === key)) {
    notify('This experiment has no circuit switch. Use its dedicated controls.');
    return;
  }
  const focus = document.activeElement;
  const restoreControlFocus = focus instanceof HTMLElement && focus.dataset.toggle === key && !focus.classList.contains('schematic-switch');
  const restoreSchematicFocus = focus instanceof SVGElement && focus.dataset.toggle === key;
  inputs[key] = !inputs[key];
  renderControls();
  updateReadings();
  if (restoreControlFocus) $(`#controls [data-toggle="${key}"]`).focus();
  if (restoreSchematicFocus && tab === 'circuit') $(`${circuitScope()} [data-toggle="${key}"]`).focus();
  chirp();
}
function openDialog(title: string, body: string): void {
  $('#dialog-title').textContent = title;
  $('#dialog-body').innerHTML = body;
  $<HTMLDialogElement>('#dialog').showModal();
}
function library(): void {
  openDialog('Your learning journey', `<p class="dialog-intro">68 experiments. One curious mind. ${saved.completed.length} lessons completed.</p><label class="search-label">Find a lesson<input id="lesson-search" type="search" placeholder="Try capacitor, transistor, logic..." /></label><div id="library-list">${categories.map((category, index) => `<section class="library-category"><h3>${category.name}<small>${categoryLessons(index).length} LESSONS</small></h3>${categoryLessons(index).map(item => `<button class="library-lesson" data-lesson="${item.id}"><span>${item.title}</span><span>${saved.completed.includes(item.id) ? icon('check', 16) : icon('right', 15)}</span></button>`).join('')}</section>`).join('')}</div><p id="no-results" hidden>No matching lessons. Try another topic.</p>`);
}
function settings(): void {
  openDialog('Make yourself at home', `<p class="dialog-intro">Tune the workbench to your way of learning.</p>${[
    ['motion', 'Animate current', 'Move charge markers along the wires. Your system reduced-motion preference is always respected.'],
    ['current', 'Show current markers', 'Display the small golden charge indicators.'],
    ['sound', 'Switch sounds', 'A quiet click tone when you toggle a switch. Off by default.'],
  ].map(([key, title, description]) => `<label class="setting-row"><span><strong>${title}</strong><small>${description}</small></span><input type="checkbox" data-setting="${key}" ${saved[key as 'motion' | 'current' | 'sound'] ? 'checked' : ''}/></label>`).join('')}<div class="settings-footer"><p>Your progress is saved only in this browser. No account, analytics or tracking.</p><button class="danger-button" data-action="reset-progress">Reset learning progress</button></div>`);
}
function glossary(spanish = false): void {
  const terms = spanish ? [
    ['Voltaje (V)', 'Energia por unidad de carga. Se mide en voltios.'],
    ['Corriente (I)', 'Flujo de carga por segundo. Se mide en amperios.'],
    ['Resistencia (R)', 'Oposicion al paso de corriente. Se mide en ohmios.'],
    ['Capacitancia (C)', 'Carga almacenada por voltio. Se mide en faradios.'],
    ['Potencia (P)', 'Energia transferida por segundo. Se mide en vatios.'],
  ] : [
    ['Voltage (V)', 'Energy per unit charge, measured in volts.'],
    ['Current (I)', 'Charge flow per second, measured in amperes.'],
    ['Resistance (R)', 'Opposition to current, measured in ohms.'],
    ['Capacitance (C)', 'Stored charge per volt, measured in farads.'],
    ['Power (P)', 'Energy transferred per second, measured in watts.'],
  ];
  const body = `<p class="dialog-intro">A bilingual pocket glossary. The lesson catalogue is written in English.</p><div class="language-buttons"><button data-glossary="en" aria-pressed="${!spanish}">English</button><button data-glossary="es" aria-pressed="${spanish}">Espanol</button></div><dl class="glossary" lang="${spanish ? 'es' : 'en'}">${terms.map(([term, description]) => `<dt>${term}</dt><dd>${description}</dd>`).join('')}</dl>`;
  if ($<HTMLDialogElement>('#dialog').open) $('#dialog-body').innerHTML = body;
  else openDialog('Electronics, in a few words', body);
}
function handleAction(action: string): void {
  switch (action) {
    case 'expand': {
      const expanded = $('.sidebar').classList.toggle('expanded');
      $('[data-action="expand"]').setAttribute('aria-expanded', String(expanded));
      $('[data-action="expand"]').setAttribute('aria-label', expanded ? 'Collapse navigation' : 'Expand navigation');
      break;
    }
    case 'home': selectLesson(lessons[0]); tab = 'circuit'; renderTab(); break;
    case 'library': library(); break;
    case 'components': tab = 'components'; renderTab(); break;
    case 'settings': settings(); break;
    case 'glossary': glossary(); break;
    case 'close-dialog': $<HTMLDialogElement>('#dialog').close(); break;
    case 'enlarge-circuit': enlargeCircuit(); break;
    case 'close-circuit': $<HTMLDialogElement>('#circuit-dialog').close(); break;
    case 'previous': selectLesson(adjacentLesson(lesson.id, -1)); break;
    case 'next': selectLesson(adjacentLesson(lesson.id, 1)); break;
    case 'complete':
      if (saved.completed.includes(lesson.id)) saved = { ...saved, completed: saved.completed.filter(id => id !== lesson.id) };
      else { saved = completeLesson(saved, lesson.id); notify(`Nicely done! ${lesson.title} completed.`); }
      persist(); renderProgress(); renderStrip(); break;
    case 'reset-experiment':
      inputs = initialInputs(lesson.kind, lesson.defaults);
      workbench?.setLesson(lesson, inputs);
      renderControls(); updateReadings(); break;
    case 'reset-progress':
      $('#dialog-body').innerHTML = `<div class="reset-confirm"><h3>Start your learning journey over?</h3><p>This clears ${saved.completed.length} completed lessons from this browser. Your workbench settings stay the same.</p><button class="danger-button" data-action="confirm-reset">Yes, reset progress</button><button data-action="settings">Keep my progress</button></div>`;
      break;
    case 'confirm-reset': saved.completed = []; persist(); renderProgress(); renderStrip(); settings(); notify('Learning progress reset. A fresh start.'); break;
  }
}
document.addEventListener('click', event => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLElement>('[data-action], [data-camera], [data-tab], [data-toggle], [data-lesson], [data-component], [data-glossary], [data-inspect], [data-cycle]');
  if (!button) return;
  if (button.dataset.action) handleAction(button.dataset.action);
  if (button.dataset.camera) workbench?.action(button.dataset.camera);
  if (button.dataset.tab) { tab = button.dataset.tab; renderTab(); }
  if (button.dataset.toggle === 'closed' || button.dataset.toggle === 'reverse') toggleInput(button.dataset.toggle);
  if (button.dataset.lesson) {
    const next = lessons.find(item => item.id === button.dataset.lesson);
    if (next) { if ($<HTMLDialogElement>('#dialog').open) $<HTMLDialogElement>('#dialog').close(); selectLesson(next); }
  }
  if (button.dataset.component) { component = button.dataset.component; renderTab(); }
  if (button.dataset.glossary) glossary(button.dataset.glossary === 'es');
  if (button.dataset.inspect) inspectControl(button.dataset.inspect);
  if (button.dataset.cycle) cycleMode(button.dataset.cycle);
});
document.addEventListener('input', event => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) return;
  if (target.id === 'lesson-search') {
    const query = target.value.toLowerCase();
    let matches = 0;
    document.querySelectorAll<HTMLElement>('.library-lesson').forEach(button => {
      button.hidden = !button.textContent?.toLowerCase().includes(query);
      if (!button.hidden) matches++;
    });
    document.querySelectorAll<HTMLElement>('.library-category').forEach(section => { section.hidden = !section.querySelector('.library-lesson:not([hidden])'); });
    $('#no-results').hidden = matches > 0;
    return;
  }
  if (target.id === 'category') { selectLesson(categoryLessons(Number(target.value))[0]); return; }
  if (target.dataset.setting && target instanceof HTMLInputElement) {
    const key = target.dataset.setting;
    if (key === 'motion' || key === 'current' || key === 'sound') saved[key] = target.checked;
    persist();
    workbench?.settings(saved.motion, saved.current);
    return;
  }
  const control = controls(lesson.kind, inputs).find(item => item.key === target.dataset.input);
  if (!control) return;
  if (control.key === 'gate' && control.options?.includes(target.value)) {
    inputs.gate = target.value;
    workbench?.setLesson(lesson, inputs);
    renderControls();
    $('#controls [data-input="gate"]').focus({ preventScroll: true });
  } else if (typeof inputs[control.key] === 'number') {
    const value = Number(target.value);
    if (!Number.isFinite(value) || value < (control.min ?? -Infinity) || value > (control.max ?? Infinity)) return;
    const key = control.key as Exclude<keyof Inputs, 'gate' | 'closed' | 'reverse'>;
    inputs[key] = value;
    const output = document.getElementById(`control-${control.key}`);
    if (output) output.textContent = format(value, control.unit ?? '');
    if (lesson.kind === 'cells' && key === 'secondary') workbench?.setLesson(lesson, inputs);
  }
  updateReadings();
});
document.addEventListener('keydown', event => {
  const target = event.target;
  const circuitDialog = $<HTMLDialogElement>('#circuit-dialog');
  if (circuitDialog.open && event.key === 'Escape') {
    event.preventDefault();
    circuitDialog.close();
    return;
  }
  if (circuitDialog.open && event.key === 'Tab') {
    const focusable = [...circuitDialog.querySelectorAll<HTMLElement | SVGElement>('button, input, select, [tabindex="0"]')];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && target === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && target === last) { event.preventDefault(); first?.focus(); }
    return;
  }
  if (target instanceof Element && target.matches('[data-inspect], [data-cycle]') && [' ', 'Enter'].includes(event.key)) {
    event.preventDefault();
    const element = target as SVGElement;
    if (element.dataset.inspect) inspectControl(element.dataset.inspect);
    if (element.dataset.cycle) cycleMode(element.dataset.cycle);
    return;
  }
  if (target instanceof HTMLElement && target.matches('.lesson-card') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const cards = [...document.querySelectorAll<HTMLButtonElement>('.lesson-card')];
    const index = cards.indexOf(target as HTMLButtonElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : Math.max(0, Math.min(cards.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)));
    cards[next].focus();
    return;
  }
  if (target instanceof HTMLElement && target.hasAttribute('data-tab') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const tabs = ['overview', 'components', 'circuit', 'maths'];
    const index = tabs.indexOf(tab);
    tab = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[3] : tabs[(index + (event.key === 'ArrowRight' ? 1 : 3)) % 4];
    renderTab();
    $(`#tab-${tab}`).focus();
    return;
  }
  if (target instanceof SVGElement && (target.dataset.toggle === 'closed' || target.dataset.toggle === 'reverse') && [' ', 'Enter'].includes(event.key)) { event.preventDefault(); toggleInput(target.dataset.toggle); return; }
  if (target !== $('#stage')) return;
  const key = event.key.toLowerCase();
  const action = ({ q: 'left', e: 'right', r: 'reset', '+': 'in', '-': 'out', w: 'w', a: 'a', s: 's', d: 'd' } as Record<string, string>)[key];
  if (action) { event.preventDefault(); workbench?.action(action); }
  if (event.key === ' ') { event.preventDefault(); toggleInput('closed'); }
});
window.addEventListener('hashchange', () => {
  const next = lessons.find(item => item.id === location.hash.slice(1));
  if (next) selectLesson(next, true);
});
function clock(): void {
  const now = new Date();
  const element = $<HTMLTimeElement>('#clock');
  element.dateTime = now.toISOString();
  element.innerHTML = `<span>${now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span><strong>${now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</strong>`;
}
clock();
window.setInterval(clock, 30000);
selectLesson(lesson, true);
window.addEventListener('pagehide', () => { workbench?.dispose(); void audio?.close(); });
