import * as THREE from 'three';
import type { Inputs, Lesson } from './lessons';

export const palette = { ink: 0x203747, teal: 0x268e87, lime: 0xc7db77, brass: 0xb59a56, wood: 0xcaa579, red: 0xc76b55, paper: 0xf5f1e7 };
export interface ComponentLabel {
  text: string;
  position: [number, number, number];
  width: number;
  role?: 'capacitor' | 'display';
}
export interface CircuitPart {
  kind: string;
  a: THREE.Object3D;
  b: THREE.Object3D;
  pins: THREE.Object3D[];
  disconnected?: boolean;
}
export interface CircuitConnection {
  from: THREE.Object3D;
  to: THREE.Object3D;
  curve: THREE.CatmullRomCurve3;
  color: number;
}

export class CircuitGeometry extends THREE.Group {
  readonly parts: CircuitPart[] = [];
  readonly connections: CircuitConnection[] = [];
  readonly labels: ComponentLabel[] = [];
  readonly batteryBodies: THREE.Mesh[] = [];
  readonly lights: THREE.Mesh[] = [];
  switchBlade?: THREE.Group;
  readonly reverse: boolean;

  constructor(lesson: Lesson, inputs: Inputs) {
    super();
    this.reverse = inputs.reverse;
    this.build(lesson, inputs);
  }

  private mesh(geometry: THREE.BufferGeometry, color: number, position: [number, number, number], metalness = 0, parent: THREE.Object3D = this): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: metalness ? 0.38 : 0.8, metalness }));
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 35), new THREE.LineBasicMaterial({ color: palette.ink, transparent: true, opacity: 0.72 })));
    parent.add(mesh);
    return mesh;
  }
  private box(w: number, h: number, d: number, color: number, position: [number, number, number], parent?: THREE.Object3D): THREE.Mesh {
    return this.mesh(new THREE.BoxGeometry(w, h, d), color, position, 0, parent);
  }
  private cylinder(radius: number, height: number, color: number, position: [number, number, number], metalness = 0): THREE.Mesh {
    return this.mesh(new THREE.CylinderGeometry(radius, radius, height, 40), color, position, metalness);
  }
  private label(text: string, position: [number, number, number], width = 1.8, role?: ComponentLabel['role']): void {
    this.labels.push({ text, position, width, role });
  }
  private terminal(mesh: THREE.Mesh, position: [number, number, number], direction: [number, number, number]): THREE.Object3D {
    const terminal = new THREE.Object3D();
    terminal.position.set(...position);
    terminal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...direction));
    mesh.add(terminal);
    return terminal;
  }
  private part(kind: string, pins: THREE.Object3D[]): CircuitPart {
    const part = { kind, a: pins[0], b: pins[1], pins };
    this.parts.push(part);
    return part;
  }
  private axial(kind: string, lead: THREE.Mesh): CircuitPart {
    const geometry = lead.geometry;
    if (!(geometry instanceof THREE.CylinderGeometry)) throw new Error('Axial terminals require a cylindrical lead.');
    const half = geometry.parameters.height / 2;
    return this.part(kind, [
      this.terminal(lead, [0, half, 0], [0, 1, 0]),
      this.terminal(lead, [0, -half, 0], [0, -1, 0]),
    ]);
  }
  private leg(mesh: THREE.Mesh): THREE.Object3D {
    const geometry = mesh.geometry;
    if (!(geometry instanceof THREE.CylinderGeometry)) throw new Error('Pin terminals require a cylindrical lead.');
    // Exit the exposed side of a vertical pin above the table, not below its tip.
    return this.terminal(mesh, [0, -geometry.parameters.height / 2 + geometry.parameters.radiusBottom, geometry.parameters.radiusBottom], [0, 0, 1]);
  }
  private point(terminal: THREE.Object3D, distance = 0): THREE.Vector3 {
    this.updateWorldMatrix(true, true);
    return this.worldToLocal(terminal.localToWorld(new THREE.Vector3(0, 0, distance)));
  }
  private connect(from: THREE.Object3D, to: THREE.Object3D, color = palette.teal, corridor?: number): void {
    const start = this.point(from);
    const end = this.point(to);
    const clearance = Math.min(0.28, start.distanceTo(end) / 3);
    const exit = this.point(from, clearance);
    const entry = this.point(to, clearance);
    const points = [start, exit];
    if (start.distanceTo(end) > 0.8) {
      const middle = exit.clone().add(entry).multiplyScalar(0.5);
      middle.y = Math.max(0.18, Math.min(0.5, middle.y));
      if (corridor !== undefined) middle.z = corridor;
      points.push(middle);
    }
    points.push(entry, end);
    this.connections.push({ from, to, color, curve: new THREE.CatmullRomCurve3(points) });
  }

  private battery(x: number, z: number): CircuitPart {
    this.batteryBodies.push(this.cylinder(0.58, 1.65, palette.lime, [x, 0.86, z]));
    this.cylinder(0.59, 0.16, palette.brass, [x, 1.7, z], 0.6);
    const positive = this.cylinder(0.24, 0.16, palette.ink, [x, 1.84, z], 0.4);
    const negative = this.cylinder(0.59, 0.12, palette.ink, [x, 0.08, z]);
    this.label('POWER SOURCE', [x, 2.4, z], 1.95);
    return this.part('battery', [this.terminal(positive, [0, 0.08, 0], [0, 1, 0]), this.terminal(negative, [0, 0, 0.59], [0, 0, 1])]);
  }
  private bulb(x: number, z: number, led = false): CircuitPart {
    this.box(1.4, 0.22, 1.25, palette.wood, [x, 0.12, z]);
    this.cylinder(0.4, 0.22, palette.brass, [x, 0.36, z], 0.5);
    this.cylinder(0.27, 0.45, palette.ink, [x, 0.64, z]);
    for (let y = 0.5; y < 0.83; y += 0.09) this.cylinder(0.3, 0.025, palette.brass, [x, y, z], 0.5);
    this.lights.push(this.mesh(led ? new THREE.CapsuleGeometry(0.24, 0.25, 8, 24) : new THREE.SphereGeometry(0.48, 32, 24), 0xffdda1, [x, 1.16, z]));
    this.label(led ? 'LED' : 'LAMP', [x, 1.95, z], 1.25);
    const pins = [-0.52, 0.52].map(offset => {
      const post = this.cylinder(0.085, 0.16, palette.brass, [x + offset, 0.31, z], 0.6);
      return this.terminal(post, [0, 0.08, 0], [0, 1, 0]);
    });
    return this.part(led ? 'led' : 'lamp', pins);
  }
  private knife(x: number, z: number): CircuitPart {
    this.box(1.9, 0.22, 1.1, palette.wood, [x, 0.12, z]);
    const pins = [-0.62, 0.62].map(offset => {
      const contact = this.box(0.27, 0.3, 0.46, palette.brass, [x + offset, 0.37, z]);
      contact.userData.toggle = true;
      this.cylinder(0.08, 0.04, palette.ink, [x + offset, 0.55, z]);
      const side = Math.sign(offset);
      return this.terminal(contact, [side * 0.135, 0, 0], [side, 0, 0]);
    });
    this.switchBlade = new THREE.Group();
    this.switchBlade.position.set(x - 0.62, 0.55, z);
    this.add(this.switchBlade);
    this.box(1.35, 0.075, 0.22, palette.brass, [0.62, 0, 0], this.switchBlade).userData.toggle = true;
    this.box(0.42, 0.16, 0.37, palette.teal, [1.14, 0.05, 0], this.switchBlade).userData.toggle = true;
    this.label('CLICK TO SWITCH', [x, 1.6, z], 2.15);
    return this.part('switch', pins);
  }
  private resistor(x: number, z: number, label = 'R1'): CircuitPart {
    this.cylinder(0.19, 0.95, 0xe3c7a1, [x, 0.5, z]).rotation.z = Math.PI / 2;
    const colors = [0x73412e, 0x263b44, 0xbf5847, palette.brass];
    for (let index = 0; index < 4; index++) this.cylinder(0.195, 0.08, colors[index], [x + (index - 1.5) * 0.19, 0.5, z]).rotation.z = Math.PI / 2;
    const lead = this.cylinder(0.035, 1.8, palette.brass, [x, 0.5, z], 0.6);
    lead.rotation.z = Math.PI / 2;
    this.label(label, [x, 1.17, z], 1.4);
    return this.axial('resistor', lead);
  }
  private capacitor(x: number, z: number, text = 'C1'): CircuitPart {
    this.cylinder(0.36, 0.95, 0x669eac, [x, 0.77, z]);
    this.cylinder(0.37, 0.04, 0xc6d5ce, [x, 1.25, z], 0.6);
    const pins = [-0.16, 0.16].map(offset => this.leg(this.cylinder(0.025, 0.32, palette.brass, [x + offset, 0.17, z])));
    this.box(0.07, 0.75, 0.025, 0xcce3dd, [x + 0.16, 0.77, z + 0.34]);
    this.label(text, [x, 1.7, z], 1.4, 'capacitor');
    return this.part('capacitor', pins);
  }
  private chip(x: number, z: number, name: string): CircuitPart {
    this.box(1.7, 0.36, 0.95, palette.ink, [x, 0.55, z]);
    const pins: THREE.Object3D[] = [];
    for (let index = 0; index < 4; index++) for (const side of [-1, 1]) {
      const pin = this.box(0.09, 0.25, 0.5, palette.brass, [x - 0.59 + index * 0.4, 0.36, z + side * 0.66]);
      pins.push(this.terminal(pin, [0, 0, side * 0.25], [0, 0, side]));
    }
    this.label(name, [x, 1.23, z], 1.9);
    return this.part('chip', pins);
  }
  private transistor(x: number, z: number, mosfet: boolean): CircuitPart {
    if (mosfet) {
      this.box(0.95, 1.2, 0.26, palette.ink, [x, 1, z]);
      this.box(0.95, 0.36, 0.25, 0xc8c8b6, [x, 1.72, z]);
    } else this.cylinder(0.39, 0.7, palette.ink, [x, 1, z]);
    const pins = [-0.26, 0.26, 0].map(offset => this.leg(this.cylinder(0.035, 0.65, palette.brass, [x + offset, 0.35, z])));
    this.label(mosfet ? 'MOSFET' : 'NPN', [x, 2.2, z], 1.5);
    return this.part(mosfet ? 'mosfet' : 'transistor', pins);
  }
  private diode(x: number, z: number, text = 'DIODE'): CircuitPart {
    this.cylinder(0.18, 0.7, palette.ink, [x, 0.5, z]).rotation.z = Math.PI / 2;
    this.cylinder(0.184, 0.09, 0xd1d4c8, [x + 0.2, 0.5, z]).rotation.z = Math.PI / 2;
    const lead = this.cylinder(0.035, 1.1, palette.brass, [x, 0.5, z], 0.6);
    lead.rotation.z = Math.PI / 2;
    this.label(text, [x, 1.2, z], 1.9);
    return this.axial('diode', lead);
  }
  private breadboard(): { resistor: CircuitPart; led: CircuitPart } {
    this.box(4.5, 0.3, 2.2, 0xe6e5d5, [0, 0.17, 0.3]);
    this.box(3.8, 0.03, 0.07, palette.red, [0, 0.335, -0.55]);
    this.box(3.8, 0.03, 0.07, palette.teal, [0, 0.335, 1.12]);
    this.box(4.1, 0.03, 0.1, 0xd1cebd, [0, 0.335, 0.3]);
    for (let column = 0; column < 18; column++) for (let row = 0; row < 6; row++) this.cylinder(0.032, 0.008, palette.ink, [-1.85 + column * 0.22, 0.337, -0.3 + row * 0.23]);
    return { resistor: this.resistor(-0.8, 0.2), led: this.bulb(1, 0.1, true) };
  }

  private build(lesson: Lesson, inputs: Inputs): void {
    const kind = lesson.kind;
    const source = this.battery(-3.1, 0.1);
    if (kind === 'cells') {
      const cells = [source];
      for (let index = 1; index < inputs.secondary; index++) cells.push(this.battery(-3.1 + index * 1.3, -1.2));
      const load = this.resistor(1, 1);
      const lamp = this.bulb(3, 0);
      if (inputs.gate === 'series') for (let index = 1; index < cells.length; index++) this.connect(cells[index - 1].a, cells[index].b, palette.red, -2);
      else for (const cell of cells.slice(1)) {
        this.connect(source.a, cell.a, palette.red, -2);
        this.connect(source.b, cell.b, palette.teal, 2.4);
      }
      this.connect(inputs.gate === 'series' ? cells[cells.length - 1].a : source.a, lamp.a, palette.red, -2);
      this.connect(lamp.b, load.b, palette.teal, 2.5);
      this.connect(load.a, source.b, palette.teal, 2.5);
    } else if (kind === 'breadboard') {
      const board = this.breadboard();
      const knife = this.knife(0, 2.4);
      this.connect(source.a, board.resistor.a, palette.red, -1.4);
      this.connect(board.resistor.b, board.led.a, palette.red);
      this.connect(board.led.b, knife.b, palette.teal, 2.8);
      this.connect(knife.a, source.b, palette.teal, 2.8);
    } else if (['capacitor', 'rc', 'filter'].includes(kind)) {
      const cap = this.capacitor(1.7, -0.6, `${inputs.capacitance} uF`);
      if (kind === 'capacitor' && inputs.gate !== 'single') {
        const second = this.capacitor(0, -0.6, `${inputs.secondary} uF`);
        this.connect(source.a, cap.a, palette.red, -1.8);
        if (inputs.gate === 'series') { this.connect(cap.b, second.a); this.connect(second.b, source.b, palette.teal, 2.4); }
        else { this.connect(source.a, second.a, palette.red, -1.8); this.connect(cap.b, source.b, palette.teal, 2.4); this.connect(second.b, source.b, palette.teal, 2.4); }
      } else if (kind === 'capacitor') {
        this.connect(source.a, cap.a, palette.red, -1.8);
        this.connect(cap.b, source.b, palette.teal, 2.4);
      } else {
        const resistor = this.resistor(0, 1.5);
        const first = kind === 'filter' && inputs.gate === 'high-pass' ? cap : resistor;
        const second = first === cap ? resistor : cap;
        if (kind === 'rc' && inputs.gate === 'discharge') {
          source.disconnected = true;
          this.connect(cap.a, resistor.a, palette.red, -1.8);
          this.connect(resistor.b, cap.b, palette.teal, 2.4);
        } else {
          this.connect(source.a, first.a, palette.red, -1.8);
          this.connect(first.b, second.a, palette.red);
          this.connect(second.b, source.b, palette.teal, 2.4);
        }
      }
      this.label('CAPACITOR', [2, 2.2, 1.1], 2, 'display');
    } else if (kind === 'transistor' || kind === 'mosfet') {
      const transistor = this.transistor(0, 0, kind === 'mosfet');
      const drive = this.resistor(-0.8, 1.6, 'DRIVE');
      const lamp = this.bulb(2.9, -0.2, true);
      const load = this.resistor(1.8, 1.7, 'LOAD');
      this.connect(source.a, load.a, palette.red, -1.8);
      this.connect(load.b, lamp.a, palette.red, 2.3);
      this.connect(lamp.b, transistor.b, palette.teal, 2.8);
      this.connect(transistor.a, source.b, palette.teal, 2.8);
      this.connect(source.a, drive.a, palette.brass);
      this.connect(drive.b, transistor.pins[2], palette.brass);
    } else if (['logic', 'timer', 'opamp', 'comparator'].includes(kind)) {
      const chip = this.chip(0, 0.1, kind === 'timer' ? 'NE555' : kind === 'logic' ? inputs.gate : kind === 'comparator' ? 'COMPARE' : 'OP-AMP');
      const lamp = this.bulb(2.9, -0.2, true);
      this.connect(source.a, chip.a, palette.red, -1.8);
      this.connect(chip.b, source.b, palette.teal, 2.6);
      this.connect(lamp.b, chip.b, palette.teal, 2.6);
      if (kind === 'timer') {
        const cap = this.capacitor(1.7, 1.65);
        const resistor = this.resistor(-1, 1.9, 'R1');
        this.connect(chip.pins[6], lamp.a, palette.red);
        this.connect(source.a, resistor.a, palette.brass);
        this.connect(resistor.b, cap.a, palette.brass, 2.7);
        this.connect(cap.a, chip.pins[5], palette.brass);
        this.connect(cap.b, chip.b);
      } else {
        const resistor = this.resistor(0, 1.8, kind === 'logic' ? 'OUTPUT' : 'FEEDBACK');
        this.connect(chip.pins[6], resistor.a, palette.brass, 2.6);
        this.connect(resistor.b, kind === 'logic' ? lamp.a : chip.pins[3], palette.brass, 2.6);
        if (kind !== 'logic') this.connect(chip.pins[6], lamp.a, palette.red);
      }
      this.label('OUTPUT', [2.9, 2.7, -0.2], 1.7, 'display');
    } else if (kind === 'sensor') {
      this.cylinder(0.45, 0.18, palette.wood, [0, 0.7, 0]);
      for (let index = 0; index < 5; index++) this.box(0.62, 0.025, 0.028, palette.red, [0, 0.8, -0.25 + index * 0.12]);
      const sensor = this.part('sensor', [-1, 1].map(side => this.leg(this.cylinder(0.025, 0.65, palette.brass, [side * 0.23, 0.3, 0]))));
      this.label(inputs.gate.toUpperCase(), [0, 1.5, 0], 1.8);
      const resistor = this.resistor(0.2, 1.6, 'DIVIDER');
      this.connect(source.a, sensor.a, palette.red, -1.8);
      this.connect(sensor.b, resistor.a, palette.brass);
      this.connect(resistor.b, source.b, palette.teal, 2.6);
      this.label('SENSOR OUTPUT', [2.5, 1, 0], 2.1, 'display');
    } else if (kind === 'meter' || kind === 'ac') {
      this.box(1.5, 0.4, 2, palette.teal, [1.5, 0.25, 0]);
      this.cylinder(0.34, 0.12, palette.ink, [1.5, 0.55, 0.4]);
      const meter = this.part('meter', [-0.5, 0.5].map(offset => this.terminal(this.cylinder(0.075, 0.1, palette.brass, [1.5 + offset, 0.5, -0.55]), [0, 0.05, 0], [0, 1, 0])));
      const resistor = this.resistor(-0.5, 1.6);
      if (inputs.gate === 'current') {
        this.connect(source.a, meter.a, palette.red, -1.8);
        this.connect(meter.b, resistor.a, palette.red);
      } else {
        this.connect(source.a, resistor.a, palette.red, -1.8);
        this.connect(resistor.a, meter.a, palette.red);
        this.connect(resistor.b, meter.b);
      }
      this.connect(resistor.b, source.b, palette.teal, 2.6);
      this.label('READING', [1.5, 1.35, -0.1], 2, 'display');
    } else if (['series', 'parallel', 'divider', 'kirchhoff', 'pot'].includes(kind)) {
      const first = this.resistor(-0.3, -0.5, 'R1');
      const second = this.resistor(kind === 'parallel' ? -0.3 : 1.65, kind === 'parallel' ? 1.5 : -0.5, 'R2');
      this.connect(source.a, first.a, palette.red, -1.8);
      if (kind === 'parallel') {
        this.connect(source.a, second.a, palette.red);
        this.connect(first.b, source.b, palette.teal, 2.6);
      } else this.connect(first.b, second.a, palette.red);
      this.connect(second.b, source.b, palette.teal, 2.6);
      if (kind === 'pot') { this.cylinder(0.4, 0.42, palette.teal, [0.5, 0.5, 1.2]); this.box(0.08, 0.1, 0.45, palette.ink, [0.5, 0.76, 1.2]); }
      this.label('VOUT', [2.8, 1, 1], 1.7, 'display');
    } else if (kind === 'diode' || kind === 'rectifier' || kind === 'zener') {
      const resistor = this.resistor(-0.5, 1.4);
      const diode = this.diode(1, -0.3, kind === 'zener' ? '3.3 V ZENER' : 'DIODE');
      if (kind === 'rectifier' && inputs.gate === 'full-wave') {
        const second = this.diode(0, -1, 'D2');
        const third = this.diode(1, -1.7, 'D3');
        const fourth = this.diode(2, -1, 'D4');
        this.connect(source.a, diode.a, palette.red, -2.2);
        this.connect(source.b, second.a, palette.red);
        this.connect(third.b, source.a, palette.red, -2.2);
        this.connect(fourth.b, source.b);
        this.connect(diode.b, second.b, palette.red);
        this.connect(third.a, fourth.a);
        this.connect(diode.b, resistor.a, palette.red, 2.2);
        this.connect(resistor.b, third.a, palette.teal, 2.6);
      } else {
        this.connect(source.a, resistor.a, palette.red, -1.8);
        this.connect(resistor.b, inputs.reverse ? diode.b : diode.a, palette.red);
        this.connect(inputs.reverse ? diode.a : diode.b, source.b, palette.teal, 2.6);
      }
      this.label('OUTPUT', [2.7, 1, 1], 1.7, 'display');
    } else {
      const led = kind === 'led' || kind === 'button';
      const lamp = this.bulb(2.7, -0.3, led);
      const knife = this.knife(0, 2);
      const resistor = ['led', 'ohm', 'conductor', 'button'].includes(kind) ? this.resistor(0, -0.8, kind === 'conductor' ? 'MATERIAL' : 'RESISTOR') : undefined;
      const anode = led && inputs.reverse ? lamp.b : lamp.a;
      const cathode = led && inputs.reverse ? lamp.a : lamp.b;
      this.connect(source.a, resistor?.a ?? anode, palette.red, -1.8);
      if (resistor) this.connect(resistor.b, anode, palette.red);
      this.connect(cathode, knife.b, palette.teal, 2.8);
      this.connect(knife.a, source.b, palette.teal, 2.8);
    }
  }
}
