export type Kind = 'switch' | 'conductor' | 'ohm' | 'series' | 'parallel' | 'cells' | 'ac' | 'breadboard' | 'meter' | 'kirchhoff' | 'divider' | 'pot' | 'led' | 'diode' | 'zener' | 'rectifier' | 'capacitor' | 'rc' | 'filter' | 'button' | 'transistor' | 'mosfet' | 'sensor' | 'opamp' | 'comparator' | 'timer' | 'logic';
export interface Inputs {
  voltage: number;
  resistance: number;
  secondary: number;
  capacitance: number;
  frequency: number;
  signal: number;
  time: number;
  closed: boolean;
  reverse: boolean;
  gate: string;
}
export interface Lesson {
  id: string;
  category: number;
  title: string;
  kind: Kind;
  explanation: string;
  experiment: string;
  takeaway: string;
  defaults: Inputs;
}
type Entry = [string, Kind, string, string, string, Partial<Inputs>?];
export const categories = [
  { name: 'Basics', symbol: '01', color: '#c2d96c' },
  { name: 'Resistors', symbol: '02', color: '#e5bc82' },
  { name: 'LEDs & diodes', symbol: '03', color: '#e89783' },
  { name: 'Capacitors', symbol: '04', color: '#8abccc' },
  { name: 'Switches & buttons', symbol: '05', color: '#b1cbb8' },
  { name: 'Transistors', symbol: '06', color: '#b3acd2' },
  { name: 'Sensors', symbol: '07', color: '#99cdbf' },
  { name: 'Op-amps & comparators', symbol: '08', color: '#a7b8cc' },
  { name: 'The 555 timer', symbol: '09', color: '#dfb481' },
  { name: 'Logic & digital', symbol: '10', color: '#c2bdd8' },
] as const;

const catalogue: Entry[][] = [
  [
    ['Open & closed circuits', 'switch', 'A circuit is a complete path. A battery supplies a potential difference, but charges can only travel around an unbroken loop. Open the knife switch and the lamp goes dark; close it and energy reaches the lamp.', 'Click the knife switch on the workbench. Watch the lamp, moving charges and circuit diagram change together.', 'An open switch interrupts current; it does not empty the battery.'],
    ['Conductors & insulators', 'conductor', 'Materials resist charge motion by different amounts. Copper provides an easy path, while a dry insulating material offers an enormous resistance. This experiment replaces the link with an idealized material sample.', 'Change the material selector from copper to rubber and compare current.', 'Conductivity is a property of the material, its geometry and its conditions.'],
    ['Volts, amps & ohms', 'ohm', 'Voltage describes energy per unit charge. Current is the rate of charge flow. Resistance links the two for an ohmic component: I = V / R.', 'Double the voltage, then double the resistance. Which change brightens the load?', 'Volts, amperes and ohms describe different quantities.'],
    ['Series & parallel paths', 'parallel', 'A parallel circuit has more than one path between the same two nodes. Each branch gets the supply voltage. Adding another branch increases total current rather than dividing the voltage.', 'Change each branch resistance independently and compare branch currents.', 'In parallel, branch currents add at the supply.'],
    ['Series & parallel cells', 'cells', 'Cells in series add their voltages. Identical cells in parallel keep the same voltage and can share the load. Only matched cells with appropriate protection should ever be connected in a real battery pack.', 'Choose series or parallel and change the cell count.', 'Series raises voltage; parallel can increase capacity, not voltage.', { voltage: 1.5, secondary: 2, gate: 'series' }],
    ['AC & DC', 'ac', 'Direct current has one direction. A sinusoidal alternating source changes polarity periodically. The graph shows one cycle; RMS voltage describes the equivalent heating effect in a resistor.', 'Adjust frequency and peak voltage. Compare peak and RMS readings.', 'For a sine wave, RMS voltage is peak voltage divided by the square root of two.'],
    ['Meet the breadboard', 'breadboard', 'A solderless breadboard joins small groups of sockets internally. A wire can connect a power rail to a resistor and LED. Rail breaks and the center trench mean that nearby holes are not always connected.', 'Open the jumper to break the path. Inspect the board from the top view.', 'Follow connected nodes, not just the physical distance between holes.', { resistance: 330 }],
    ['Using a multimeter', 'meter', 'A voltmeter connects across a component; an ammeter goes in series with the current path. This virtual meter switches between readings without changing the circuit.', 'Choose voltage, current or resistance on the virtual meter.', 'Never connect a real ammeter directly across a battery.', { gate: 'voltage' }],
    ["Kirchhoff's rules", 'kirchhoff', 'Charge is conserved at a junction and energy is conserved around a loop. Here two resistors share the supply voltage. Their voltage drops add back to the source voltage.', 'Change either resistor. Check that the two displayed voltage drops still sum to the supply.', 'At a junction currents balance; around a loop voltage changes sum to zero.'],
  ],
  [
    ['What a resistor does', 'ohm', 'A resistor limits current and turns electrical energy into heat. Its resistance is measured in ohms; the same supply produces less current through a larger resistance.', 'Move the resistance slider while keeping the supply fixed.', 'A resistor limits current; it does not use up current.'],
    ['Reading resistor bands', 'ohm', 'The first two color bands encode digits and the third is a multiplier. Brown-black-red represents 1,000 ohms. A gold tolerance band allows a five-percent deviation from that nominal value.', 'Set resistance to 1,000 ohms and inspect the modeled brown-black-red bands.', 'Tolerance gives a range, not an extra digit.'],
    ["Ohm's law in action", 'ohm', 'An ohmic resistor obeys V = IR. This relationship makes it possible to predict current before building a circuit. Not every electronic component behaves like a resistor.', 'Use 6 V and 1,000 ohms. Predict the current before checking Maths.', 'At a fixed resistance, current is proportional to voltage.', { voltage: 6 }],
    ['Resistors in series', 'series', 'Series resistors carry the same current. Their resistances add because the supply must drive that current through both obstacles.', 'Set two equal resistors, then increase only one.', 'The equivalent series resistance is R1 + R2.'],
    ['Resistors in parallel', 'parallel', 'Parallel resistors share the same voltage. The equivalent resistance is smaller than either branch because the circuit offers another path.', 'Try 1,000 and 2,000 ohms. Compare total current with the two branch currents.', 'For two branches, R equivalent = R1 R2 / (R1 + R2).', { secondary: 2000 }],
    ['Build a voltage divider', 'divider', 'Two series resistors create a useful intermediate voltage. The output is measured across the lower resistor. This ideal model assumes nothing else draws current from the output.', 'Increase the lower resistor and watch output voltage rise.', 'An unloaded divider gives Vout = Vin R2 / (R1 + R2).'],
    ['Turn a potentiometer', 'pot', 'A potentiometer has a moving contact between two ends of a resistive track. The wiper taps an adjustable fraction of the supply voltage.', 'Rotate the wiper slider from zero to one hundred percent.', 'A potentiometer can divide voltage or act as a variable resistor.', { signal: 50 }],
    ['Power & resistor ratings', 'ohm', 'Resistor power is voltage times current. A physical resistor must be rated above the expected dissipation with a sensible margin, or it can overheat.', 'Try 12 V across 100 ohms. Compare the calculated power with a 0.25 W rating.', 'P = VI = I squared R; choose components with thermal margin.', { voltage: 12, resistance: 100 }],
    ['Pull-up & pull-down', 'button', 'A pull-up establishes a known high logic level when a switch is open. Pressing the switch connects the input to ground. A pull-down reverses these default levels.', 'Select pull-up or pull-down and press the button.', 'A floating input has no reliably defined logic level.', { gate: 'pull-up', closed: false }],
    ['Resistor networks', 'divider', 'A network can be simplified one stage at a time. This two-resistor network produces a reference voltage; its output changes if a real load is attached.', 'Try a 1:3 upper-to-lower resistance ratio and compare the output to the supply.', 'Equivalent circuits must preserve the same external behavior.', { secondary: 3000 }],
  ],
  [
    ['Light your first LED', 'led', 'An LED emits light when forward current passes through its junction. It needs a current-limiting resistor. This model uses a 2 V forward drop and a simple brightness response.', 'Close the switch and adjust the resistor. Keep current under 20 mA.', 'Never place an unprotected LED directly across a supply.', { voltage: 5, resistance: 330 }],
    ['LED polarity', 'led', 'LEDs are directional. The anode belongs at the higher potential for forward operation. Reverse voltage can damage a real LED, even though this simplified model just blocks current.', 'Reverse the LED and compare the current and glow.', 'Polarity matters for LEDs, unlike ordinary resistors.', { voltage: 5, resistance: 330 }],
    ['Choose an LED resistor', 'led', 'Subtract the LED forward voltage from the supply, then divide by the target current to estimate the resistor. Select a standard value that keeps current safely below the limit.', 'With a 5 V supply, find a resistor giving about 10 mA.', 'R = (Vsupply - Vforward) / Itarget.', { voltage: 5, resistance: 300 }],
    ['Diodes as one-way valves', 'diode', 'A diode allows forward current and largely blocks reverse current. The simple silicon model here subtracts a fixed 0.7 V forward drop; real diode curves are smoother.', 'Reverse the diode and then lower the supply below 0.7 V.', 'A diode is not a perfect switch: forward voltage and limits matter.'],
    ['Half-wave rectification', 'rectifier', 'A diode can pass one half of an AC waveform. The resulting voltage is unidirectional but pulsing, not a smooth DC supply.', 'Compare the input sine wave with the half-wave output.', 'Rectification changes polarity behavior; filtering smooths ripple.', { gate: 'half-wave', voltage: 6 }],
    ['Bridge rectification', 'rectifier', 'A bridge steers both halves of AC into the same load direction. Two diodes conduct in each path, so this simple model loses 1.4 V at the output peak.', 'Switch between half-wave and full-wave and compare the waveforms.', 'A bridge uses both half-cycles, with two forward drops.', { gate: 'full-wave', voltage: 6 }],
    ['Zener voltage reference', 'zener', 'A Zener diode can hold a roughly constant voltage in reverse breakdown when a series resistor limits its current. This model assumes an unloaded 3.3 V reference.', 'Raise the supply above 3.3 V and observe the reference voltage.', 'Regulation requires enough current and a safe power rating.', { voltage: 6 }],
    ['Protecting a coil', 'diode', 'Inductors oppose sudden current changes. A flyback diode provides a path for a coil current when its driving switch opens. This static diode experiment shows polarity; it does not model the inductive transient.', 'Compare forward and reverse paths and identify the normally blocked orientation.', 'A flyback diode limits a switching voltage spike; this model does not simulate that spike.'],
  ],
  [
    ['Capacitors store charge', 'capacitor', 'A capacitor stores separated charge in an electric field. Its charge is Q = CV and its stored energy is one half C V squared. It is not an unlimited source of energy.', 'Change capacitance and voltage. Compare charge and stored energy.', 'Capacitance is measured in farads; this workbench uses microfarads.', { capacitance: 100 }],
    ['Charge an RC circuit', 'rc', 'Charging through a resistor produces an exponential rise. After one time constant, the capacitor reaches about 63 percent of its final voltage.', 'Set time to one time constant and check the capacitor voltage.', 'The time constant tau equals R times C.', { resistance: 10000, capacitance: 100, time: 1 }],
    ['Discharge an RC circuit', 'rc', 'A charged capacitor loses voltage exponentially through a resistor. Its initial voltage is the selected supply. The battery is disconnected during discharge.', 'Move elapsed time from zero to five seconds.', 'After five time constants, less than one percent of the initial voltage remains.', { resistance: 10000, capacitance: 100, gate: 'discharge', time: 1 }],
    ['Capacitors in parallel', 'capacitor', 'Parallel capacitors share voltage and their capacitances add. Doubling capacitance doubles stored charge at the same voltage.', 'Select parallel and change each capacitance.', 'C equivalent = C1 + C2 in parallel.', { gate: 'parallel', capacitance: 100, secondary: 100 }],
    ['Capacitors in series', 'capacitor', 'Series capacitors share charge. Their equivalent capacitance is smaller than either individual capacitance, and unequal values divide voltage unequally.', 'Select series and compare equal versus unequal capacitors.', 'For two capacitors, C equivalent = C1 C2 / (C1 + C2).', { gate: 'series', capacitance: 100, secondary: 100 }],
    ['Decoupling a supply', 'filter', 'A nearby capacitor provides a local path for changing currents. This RC low-pass experiment illustrates frequency-dependent attenuation, not a complete supply or PCB simulation.', 'Increase signal frequency and compare output amplitude.', 'Short physical connections matter for real decoupling.', { frequency: 100, resistance: 1000, capacitance: 1 }],
    ['Low-pass filters', 'filter', 'A resistor followed by a shunt capacitor passes slow changes better than fast ones. At the cutoff frequency the output amplitude is about 70.7 percent of the input.', 'Find the cutoff frequency in Maths, then compare it with the input frequency.', 'The RC cutoff is 1 / (2 pi R C).', { frequency: 100, capacitance: 1 }],
    ['High-pass filters', 'filter', 'A series capacitor and a shunt resistor reject DC and attenuate slow variations. The output approaches the input amplitude well above cutoff.', 'Increase frequency and observe the output amplitude rise.', 'A high-pass blocks steady DC after its transient settles.', { gate: 'high-pass', frequency: 100, capacitance: 1 }],
    ['Timing with an RC', 'rc', 'An RC charging curve reaches a chosen threshold after a predictable delay. A digital input needs a defined threshold and often hysteresis to turn that slow curve into a clean transition.', 'Find the time when the capacitor crosses half the supply.', 'Half-supply occurs at approximately 0.693 R C.', { resistance: 10000, capacitance: 100, time: 0.7 }],
  ],
  [
    ['The knife switch', 'switch', 'A mechanical switch connects or separates conducting contacts. The visible blade shows the difference between an open path and a closed path.', 'Click the blade or press Space while the workbench is focused.', 'A switch controls a path, not a stored quantity of current.'],
    ['Momentary buttons', 'button', 'A button can temporarily connect a digital input to a defined level. This virtual latching control represents the two states of a momentary button for easier inspection.', 'Press and release the virtual button by toggling it.', 'A real momentary button returns when your finger is removed.', { gate: 'pull-up', closed: false }],
    ['Normally open & closed', 'button', 'Normally open contacts start separated. Normally closed contacts start connected. The normal state means the state without actuation, not the most common use.', 'Select a pull-down and compare its unpressed input with a pull-up.', 'Contact type and electrical logic polarity are separate choices.', { gate: 'pull-down', closed: false }],
    ['Button bounce', 'button', 'Mechanical contacts may connect and separate repeatedly during a press. This workbench shows settled states only. A real system can use an RC network or software timing to reject the brief transitions.', 'Toggle rapidly, then compare with the RC timing lesson.', 'Debouncing prevents one physical press being counted many times.', { gate: 'pull-up', closed: false }],
  ],
  [
    ['Meet the NPN transistor', 'transistor', 'A small base current can control a larger collector current. This simplified NPN model uses a gain of 100 until the collector load limits the current.', 'Raise base drive and watch the collector load brighten.', 'A BJT is current-controlled in this introductory model.', { signal: 1, voltage: 5 }],
    ['A transistor switch', 'transistor', 'For switching, drive the transistor hard enough that the load determines collector current. Saturation is modeled with a 0.2 V collector-emitter drop.', 'Increase base drive until the displayed state says saturated.', 'Do not rely on typical gain alone when designing a switch.', { signal: 3, voltage: 5 }],
    ['Current gain', 'transistor', 'Current gain compares collector current with base current in the active region. Once the transistor saturates, more base current does not produce the same proportional load current.', 'Compare base and collector current before and after saturation.', 'Actual transistor gain varies with device, temperature and operating point.', { signal: 0.75 }],
    ['MOSFET gate control', 'mosfet', 'A MOSFET gate voltage controls its channel. This deliberately simplified model switches at a 2 V threshold with a 0.5 ohm on-resistance.', 'Move gate voltage across the threshold.', 'A real threshold voltage does not guarantee a fully enhanced MOSFET.', { signal: 3, voltage: 5 }],
    ['Driving a larger load', 'mosfet', 'A power switch allows a control signal to manage a separate load path. Current, dissipation and protective components still need to be designed for the actual load.', 'Lower load resistance and compare channel dissipation.', 'A logic pin should control the gate, not supply the load current.', { resistance: 100, signal: 5, voltage: 12 }],
    ['The emitter follower', 'transistor', 'An emitter follower produces approximately the base voltage minus a junction drop. It provides current buffering rather than voltage gain in this simplified unloaded model.', 'Change base voltage and compare the emitter output.', 'A follower needs supply headroom and load-current capacity.', { gate: 'follower', signal: 2, voltage: 5 }],
  ],
  [
    ['Light-dependent resistors', 'sensor', 'An LDR changes resistance with illumination. A divider converts that resistance into a voltage. The illustrative light model here is not a calibrated sensor curve.', 'Increase light level and follow the divider output.', 'A sensor often needs a circuit to convert its changing property into voltage.', { gate: 'light', signal: 50 }],
    ['Temperature & thermistors', 'sensor', 'An NTC thermistor decreases resistance as temperature rises. This model uses a 10 kilohm thermistor at 25 C and a beta value of 3950 K.', 'Raise the temperature and compare resistance and output voltage.', 'Thermistor response is nonlinear and needs calibration.', { gate: 'temperature', signal: 25, resistance: 10000 }],
    ['A pressure-sensitive resistor', 'sensor', 'A force-sensitive resistor can reduce its resistance under pressure. This illustrative model maps a percentage input to resistance, not a calibrated force measurement.', 'Increase applied pressure and compare the divider output.', 'A force-sensitive resistor is useful for changes, not precision weighing.', { gate: 'pressure', signal: 30 }],
    ['Analog sensor outputs', 'sensor', 'An analog signal can represent a continuously changing measurement. This virtual sensor produces a fraction of the supply voltage proportional to the selected level.', 'Sweep level slowly and watch the output voltage.', 'Analog means a range of values, not only zero and one.', { gate: 'analog', signal: 50 }],
    ['Threshold detection', 'comparator', 'A comparator turns an analog difference into a high or low output. Here the input is compared with half the supply.', 'Move the sensor input above and below the reference.', 'A threshold makes a discrete decision from an analog measurement.', { signal: 1.5 }],
    ['Voltage to digital counts', 'sensor', 'An ideal 8-bit converter maps an input within its reference range to one of 256 codes. The displayed code uses a simple nearest-code convention.', 'Move level through its range and inspect the digital count.', 'More bits provide finer steps, not automatically better absolute accuracy.', { gate: 'adc', signal: 50 }],
    ['Sensor calibration', 'sensor', 'Calibration connects a measured signal to a known physical quantity. Here an illustrative linear sensor lets you identify a zero point and full-scale reading.', 'Compare readings at zero, half-scale and full-scale.', 'Calibration cannot remove every source of noise or drift.', { gate: 'analog', signal: 0 }],
  ],
  [
    ['Inside an op-amp circuit', 'opamp', 'An op-amp uses feedback to make a controlled amplifier. This ideal non-inverting circuit has gain 1 + R2 / R1, with output clipped to the selected single supply.', 'Increase input voltage until output reaches the supply rail.', 'Feedback sets useful gain; the supply limits output swing.', { signal: 0.5, voltage: 5 }],
    ['Non-inverting gain', 'opamp', 'A non-inverting amplifier preserves input polarity. The lower resistor and feedback resistor set its closed-loop gain in this ideal model.', 'Set equal resistors and verify a gain of two.', 'Vout = Vin (1 + Rfeedback / Rground).', { signal: 1, voltage: 5 }],
    ['Inverting gain', 'opamp', 'An inverting amplifier produces an output with the opposite sign. This experiment assumes symmetric positive and negative supply rails so a negative output is possible.', 'Change feedback resistance and compare output magnitude.', 'The ideal gain is -Rfeedback / Rinput.', { gate: 'inverting', signal: 1, voltage: 5 }],
    ['The voltage follower', 'opamp', 'Direct negative feedback makes an ideal buffer with gain one. A real op-amp still has limits on input range, output current, bandwidth and rail swing.', 'Change the input and check that the output follows it within the supply range.', 'A buffer isolates stages without intentionally multiplying voltage.', { gate: 'follower', signal: 1, voltage: 5 }],
    ['Comparing two voltages', 'comparator', 'Without linear negative feedback, a comparator chooses a high or low state according to which input is larger. Equal inputs are shown low by convention in this ideal model.', 'Move the input across the adjustable reference.', 'Comparators make decisions; op-amps with feedback amplify.', { signal: 2, voltage: 5, secondary: 2500 }],
  ],
  [
    ['Meet the 555 timer', 'timer', 'The classic 555 combines comparators, a latch and a discharge switch. This astable model estimates frequency from two resistors and a timing capacitor.', 'Change the timing capacitor and watch the output pulse slower or faster.', 'A timing capacitor repeatedly charges and discharges between thresholds.', { resistance: 10000, secondary: 10000, capacitance: 10, voltage: 5 }],
    ['Astable oscillation', 'timer', 'An astable 555 runs continuously. The capacitor charges through R1 + R2 and discharges through R2, giving unequal high and low durations.', 'Increase R1 and compare frequency and duty cycle.', 'Frequency is approximately 1.44 / ((R1 + 2 R2) C).', { resistance: 10000, secondary: 10000, capacitance: 10, voltage: 5 }],
    ['Monostable timing', 'timer', 'A monostable produces one pulse after a trigger. The approximate pulse duration is 1.1 R C. Elapsed time here is measured from an ideal trigger.', 'Move elapsed time past the calculated pulse duration.', 'A monostable returns to its stable state after one timed pulse.', { gate: 'monostable', resistance: 10000, capacitance: 100, time: 0.5, voltage: 5 }],
    ['Duty cycle & blinking', 'timer', 'Duty cycle is the fraction of a cycle spent high. For the standard astable wiring here, the duty cycle is greater than 50 percent; other circuits can change that.', 'Increase R2 relative to R1 and watch duty cycle approach half.', 'Pulse frequency and duty cycle describe different features.', { resistance: 1000, secondary: 10000, capacitance: 10, voltage: 5 }],
  ],
  [
    ['Binary signals', 'logic', 'Digital logic uses defined low and high voltage ranges to represent zero and one. This model uses ideal Boolean inputs, rather than real threshold or noise behavior.', 'Toggle input A and watch the output indicator.', 'Binary describes two logical states, not necessarily exactly 0 V and 5 V.', { gate: 'BUFFER', closed: false, reverse: false, voltage: 5 }],
    ['NOT: turn logic around', 'logic', 'A NOT gate inverts its input. Low becomes high and high becomes low. The output indicator shows the logical result as a lamp.', 'Toggle input A and compare it with the output.', 'NOT has one input and one complementary output.', { gate: 'NOT', closed: false, voltage: 5 }],
    ['AND: both must agree', 'logic', 'An AND gate is high only when both inputs are high. It represents a requirement that two conditions hold at the same time.', 'Try all four input combinations.', 'AND is one only for A = 1 and B = 1.', { gate: 'AND', closed: false, reverse: false, voltage: 5 }],
    ['OR: either is enough', 'logic', 'An OR gate is high if either input is high, including when both are high. It combines alternative conditions.', 'Turn on one input, then both, then neither.', 'OR differs from exclusive OR when both inputs are high.', { gate: 'OR', closed: false, reverse: false, voltage: 5 }],
    ['XOR: exactly one', 'logic', 'An exclusive-OR gate is high when its two inputs differ. It appears in adders and in checks that compare two binary states.', 'Compare equal inputs with unequal inputs.', 'XOR is zero when both inputs match.', { gate: 'XOR', closed: false, reverse: false, voltage: 5 }],
    ['NAND & universal logic', 'logic', 'A NAND gate is the inverse of AND. Combining NAND gates can build other Boolean functions. This experiment lets you compare common gate truth tables.', 'Select NAND, then compare all four combinations with AND.', 'NAND is low only when both inputs are high.', { gate: 'NAND', closed: false, reverse: false, voltage: 5 }],
  ],
];

const defaults: Inputs = { voltage: 3, resistance: 1000, secondary: 1000, capacitance: 100, frequency: 50, signal: 1, time: 1, closed: true, reverse: false, gate: '' };
export const lessons: Lesson[] = catalogue.flatMap((entries, category) => entries.map((entry, index) => ({
  id: `${category + 1}-${index + 1}`,
  category,
  title: entry[0],
  kind: entry[1],
  explanation: entry[2],
  experiment: entry[3],
  takeaway: entry[4],
  defaults: { ...defaults, ...entry[5] },
})));
export function categoryLessons(category: number): Lesson[] {
  return lessons.filter(lesson => lesson.category === category);
}
export function adjacentLesson(id: string, direction: number): Lesson {
  const index = lessons.findIndex(lesson => lesson.id === id);
  return lessons[Math.max(0, Math.min(lessons.length - 1, index + direction))];
}
