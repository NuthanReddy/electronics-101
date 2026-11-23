import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Inputs, Lesson } from './lessons';
import type { Result } from './simulation';
import { format } from './simulation';

const palette = { ink: 0x203747, teal: 0x268e87, lime: 0xc7db77, brass: 0xb59a56, wood: 0xcaa579, red: 0xc76b55, paper: 0xf5f1e7 };
export class Workbench {
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-7, 7, 5, -5, 0.1, 100);
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private model = new THREE.Group();
  private raycaster = new THREE.Raycaster();
  private switchBlade?: THREE.Group;
  private lights: THREE.Mesh[] = [];
  private wires: THREE.CatmullRomCurve3[] = [];
  private particles: THREE.Mesh[] = [];
  private display?: THREE.Sprite;
  private batteryLabels: THREE.Mesh[] = [];
  private capacitorLabels: THREE.Sprite[] = [];
  private inputs?: Inputs;
  private result?: Result;
  private lesson?: Lesson;
  private motion = true;
  private showCurrent = true;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private top = false;
  private pointerStart = { x: 0, y: 0 };
  private observer: ResizeObserver;
  private frame = 0;
  private elapsed = 0;
  private lastTime = 0;

  constructor(private host: HTMLElement, private toggle: () => void, private report: (message: string) => void) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(palette.paper, 0);
    this.host.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = false;
    this.controls.minZoom = 0.55;
    this.controls.maxZoom = 2.8;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.08;
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb0a68e, 2.6));
    const sun = new THREE.DirectionalLight(0xfff6dc, 3.4);
    sun.position.set(-4, 10, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 });
    sun.shadow.bias = -0.001;
    this.scene.add(sun);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.13 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.position.y = -0.08;
    this.scene.add(floor);
    const grid = new THREE.GridHelper(80, 80, 0xc5cdbd, 0xd9dfcf);
    grid.material.opacity = 0.25;
    grid.material.transparent = true;
    grid.position.y = -0.07;
    this.scene.add(grid, this.model);
    this.home();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.renderer.domElement.addEventListener('pointerdown', this.pointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.pointerUp);
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost);
    this.resize();
    this.frame = requestAnimationFrame(this.animate);
  }

  private contextLost = (event: Event) => {
    event.preventDefault();
    this.report('The 3D graphics context was lost. Reload this page to restore the workbench; the lesson controls still work.');
  };
  private pointerDown = (event: PointerEvent) => {
    this.pointerStart = { x: event.clientX, y: event.clientY };
    this.host.focus({ preventScroll: true });
  };
  private pointerUp = (event: PointerEvent) => {
    if (Math.hypot(event.clientX - this.pointerStart.x, event.clientY - this.pointerStart.y) > 5) return;
    const bounds = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1), this.camera);
    const hits = this.raycaster.intersectObjects(this.model.children, true);
    if (hits.some(hit => hit.object.userData.toggle)) this.toggle();
  };
  private material(color: number, metalness = 0): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color, roughness: metalness ? 0.38 : 0.8, metalness });
  }
  private mesh(geometry: THREE.BufferGeometry, color: number, position: [number, number, number], parent: THREE.Object3D = this.model, metalness = 0): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, this.material(color, metalness));
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 35), new THREE.LineBasicMaterial({ color: palette.ink, transparent: true, opacity: 0.72 }));
    mesh.add(edge);
    parent.add(mesh);
    return mesh;
  }
  private box(w: number, h: number, d: number, color: number, position: [number, number, number], parent?: THREE.Object3D): THREE.Mesh {
    return this.mesh(new THREE.BoxGeometry(w, h, d), color, position, parent);
  }
  private cylinder(radius: number, height: number, color: number, position: [number, number, number], parent?: THREE.Object3D, metalness = 0): THREE.Mesh {
    return this.mesh(new THREE.CylinderGeometry(radius, radius, height, 40), color, position, parent, metalness);
  }
  private texture(text: string, color = '#203747', background = '#f5f1e7'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to create component labels.');
    context.fillStyle = background;
    context.beginPath();
    context.roundRect(3, 3, 506, 122, 25);
    context.fill();
    context.strokeStyle = color;
    context.lineWidth = 4;
    context.stroke();
    context.fillStyle = color;
    context.font = 'bold 38px monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 256, 66, 480);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  private label(text: string, position: [number, number, number], width = 1.8): THREE.Sprite {
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texture(text), depthTest: false }));
    label.position.set(...position);
    label.scale.set(width, width / 4, 1);
    this.model.add(label);
    return label;
  }
  private battery(x: number, z: number, text: string): void {
    const body = this.cylinder(0.58, 1.65, palette.lime, [x, 0.86, z]);
    this.cylinder(0.59, 0.16, palette.brass, [x, 1.7, z], undefined, 0.6);
    this.cylinder(0.24, 0.16, palette.ink, [x, 1.84, z], undefined, 0.4);
    this.cylinder(0.59, 0.12, palette.ink, [x, 0.08, z]);
    const wrap = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 0.32), new THREE.MeshBasicMaterial({ map: this.texture(text, '#203747', '#c7db77'), side: THREE.DoubleSide }));
    wrap.position.set(0, 0, 0.584);
    body.add(wrap);
    this.batteryLabels.push(wrap);
    this.label('POWER SOURCE', [x, 2.4, z], 1.95);
  }
  private bulb(x: number, z: number, led = false): void {
    this.box(1.4, 0.22, 1.25, palette.wood, [x, 0.12, z]);
    this.cylinder(0.4, 0.22, palette.brass, [x, 0.36, z], undefined, 0.5);
    this.cylinder(0.27, 0.45, palette.ink, [x, 0.64, z]);
    for (let y = 0.5; y < 0.83; y += 0.09) this.cylinder(0.3, 0.025, palette.brass, [x, y, z], undefined, 0.5);
    const globe = this.mesh(led ? new THREE.CapsuleGeometry(0.24, 0.25, 8, 24) : new THREE.SphereGeometry(0.48, 32, 24), 0xffdda1, [x, 1.16, z]);
    this.lights.push(globe);
    this.label(led ? 'LED' : 'LAMP', [x, 1.95, z], 1.25);
  }
  private knife(x: number, z: number): void {
    this.box(1.9, 0.22, 1.1, palette.wood, [x, 0.12, z]);
    for (const offset of [-0.62, 0.62]) {
      const contact = this.box(0.27, 0.3, 0.46, palette.brass, [x + offset, 0.37, z]);
      contact.userData.toggle = true;
      this.cylinder(0.08, 0.04, palette.ink, [x + offset, 0.55, z]);
    }
    this.switchBlade = new THREE.Group();
    this.switchBlade.position.set(x - 0.62, 0.55, z);
    this.model.add(this.switchBlade);
    const blade = this.box(1.35, 0.075, 0.22, palette.brass, [0.62, 0, 0], this.switchBlade);
    const handle = this.box(0.42, 0.16, 0.37, palette.teal, [1.14, 0.05, 0], this.switchBlade);
    blade.userData.toggle = true;
    handle.userData.toggle = true;
    this.label('CLICK TO SWITCH', [x, 1.6, z], 2.15);
  }
  private resistor(x: number, z: number, label = 'R1'): void {
    const body = this.cylinder(0.19, 0.95, 0xe3c7a1, [x, 0.5, z]);
    body.rotation.z = Math.PI / 2;
    const colors = [0x73412e, 0x263b44, 0xbf5847, palette.brass];
    for (let index = 0; index < 4; index++) {
      const band = this.cylinder(0.195, 0.08, colors[index], [x + (index - 1.5) * 0.19, 0.5, z]);
      band.rotation.z = Math.PI / 2;
    }
    const lead = this.cylinder(0.035, 1.8, palette.brass, [x, 0.5, z], undefined, 0.6);
    lead.rotation.z = Math.PI / 2;
    this.label(label, [x, 1.17, z], 1.4);
  }
  private capacitor(x: number, z: number, label = 'C1'): void {
    this.cylinder(0.36, 0.95, 0x669eac, [x, 0.77, z]);
    this.cylinder(0.37, 0.04, 0xc6d5ce, [x, 1.25, z], undefined, 0.6);
    for (const offset of [-0.16, 0.16]) this.cylinder(0.025, 0.32, palette.brass, [x + offset, 0.17, z]);
    this.box(0.07, 0.75, 0.025, 0xcce3dd, [x + 0.16, 0.77, z + 0.34]);
    this.capacitorLabels.push(this.label(label, [x, 1.7, z], 1.4));
  }
  private chip(x: number, z: number, name: string): void {
    this.box(1.7, 0.36, 0.95, palette.ink, [x, 0.55, z]);
    for (let index = 0; index < 4; index++) for (const side of [-1, 1]) {
      this.box(0.09, 0.25, 0.5, palette.brass, [x - 0.59 + index * 0.4, 0.36, z + side * 0.66]);
    }
    this.label(name, [x, 1.23, z], 1.9);
  }
  private transistor(x: number, z: number, mosfet: boolean): void {
    if (mosfet) {
      this.box(0.95, 1.2, 0.26, palette.ink, [x, 1, z]);
      this.box(0.95, 0.36, 0.25, 0xc8c8b6, [x, 1.72, z]);
    } else this.cylinder(0.39, 0.7, palette.ink, [x, 1, z]);
    for (const offset of [-0.26, 0, 0.26]) this.cylinder(0.035, 0.65, palette.brass, [x + offset, 0.35, z]);
    this.label(mosfet ? 'MOSFET' : 'NPN', [x, 2.2, z], 1.5);
  }
  private breadboard(): void {
    this.box(4.5, 0.3, 2.2, 0xe6e5d5, [0, 0.17, 0.3]);
    this.box(3.8, 0.03, 0.07, palette.red, [0, 0.335, -0.55]);
    this.box(3.8, 0.03, 0.07, palette.teal, [0, 0.335, 1.12]);
    this.box(4.1, 0.03, 0.1, 0xd1cebd, [0, 0.335, 0.3]);
    for (let column = 0; column < 18; column++) for (let row = 0; row < 6; row++) {
      this.cylinder(0.032, 0.008, palette.ink, [-1.85 + column * 0.22, 0.337, -0.3 + row * 0.23]);
    }
    this.resistor(-0.8, 0.2);
    this.bulb(1, 0.1, true);
  }
  private wire(points: [number, number, number][], color: number): void {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
    const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.045, 8, false), this.material(color));
    wire.castShadow = true;
    this.model.add(wire);
    this.wires.push(curve);
    for (let index = 0; index < 5; index++) {
      const particle = new THREE.Mesh(new THREE.SphereGeometry(0.064, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf8ce68 }));
      particle.userData.path = this.wires.length - 1;
      particle.userData.offset = index / 5;
      this.model.add(particle);
      this.particles.push(particle);
    }
  }
  private disposeModel(): void {
    this.model.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) object.geometry.dispose();
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.Sprite) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose();
          material.dispose();
        }
      }
    });
    this.model.clear();
    this.switchBlade = undefined;
    this.display = undefined;
    this.batteryLabels = [];
    this.capacitorLabels = [];
    this.lights = [];
    this.particles = [];
    this.wires = [];
  }

  setLesson(lesson: Lesson, inputs: Inputs): void {
    this.disposeModel();
    this.lesson = lesson;
    const kind = lesson.kind;
    const led = ['led', 'breadboard', 'logic', 'timer', 'button', 'transistor', 'mosfet', 'comparator'].includes(kind);
    this.battery(-3.1, 0.1, `${inputs.voltage} V`);
    if (kind === 'cells') {
      for (let index = 1; index < inputs.secondary; index++) this.battery(-3.1 + index * 1.3, -1.2, `${inputs.voltage} V`);
      this.resistor(1, 1);
      this.bulb(3, 0);
    } else if (kind === 'breadboard') {
      this.breadboard();
      this.knife(0, 2.4);
    } else if (['capacitor', 'rc', 'filter'].includes(kind)) {
      this.capacitor(1.7, -0.6, `${inputs.capacitance} uF`);
      if (kind === 'capacitor' && inputs.gate !== 'single') this.capacitor(0, -0.6, `${inputs.secondary} uF`);
      else this.resistor(0, 1.5);
      this.display = this.label('CAPACITOR', [2, 2.2, 1.1], 2);
      if (kind === 'rc') this.knife(-1, 2.1);
    } else if (['transistor', 'mosfet'].includes(kind)) {
      this.transistor(0, 0, kind === 'mosfet');
      this.resistor(-0.8, 1.6, 'DRIVE');
      this.bulb(2.9, -0.2, true);
      this.resistor(1.8, 1.7, 'LOAD');
    } else if (['logic', 'timer', 'opamp', 'comparator'].includes(kind)) {
      this.chip(0, 0.1, kind === 'timer' ? 'NE555' : kind === 'logic' ? inputs.gate : kind === 'comparator' ? 'COMPARE' : 'OP-AMP');
      this.bulb(2.9, -0.2, true);
      if (kind === 'timer') { this.capacitor(1.7, 1.65); this.resistor(-1, 1.9, 'R1'); }
      else this.resistor(0, 1.8, kind === 'logic' ? 'OUTPUT' : 'FEEDBACK');
      this.display = this.label('OUTPUT', [2.9, 2.7, -0.2], 1.7);
    } else if (kind === 'sensor') {
      this.cylinder(0.45, 0.18, palette.wood, [0, 0.7, 0]);
      for (let index = 0; index < 5; index++) this.box(0.62, 0.025, 0.028, palette.red, [0, 0.8, -0.25 + index * 0.12]);
      for (const side of [-1, 1]) this.cylinder(0.025, 0.65, palette.brass, [side * 0.23, 0.3, 0]);
      this.label(inputs.gate.toUpperCase(), [0, 1.5, 0], 1.8);
      this.resistor(0.2, 1.6, 'DIVIDER');
      this.display = this.label('SENSOR OUTPUT', [2.5, 1, 0], 2.1);
    } else if (kind === 'meter' || kind === 'ac') {
      this.box(1.5, 0.4, 2, palette.teal, [1.5, 0.25, 0]);
      this.cylinder(0.34, 0.12, palette.ink, [1.5, 0.55, 0.4]);
      this.display = this.label('READING', [1.5, 1.35, -0.1], 2);
      this.resistor(-0.5, 1.6);
    } else if (['series', 'parallel', 'divider', 'kirchhoff', 'pot'].includes(kind)) {
      this.resistor(-0.3, -0.5, 'R1');
      this.resistor(kind === 'parallel' ? -0.3 : 1.65, kind === 'parallel' ? 1.5 : -0.5, 'R2');
      if (kind === 'pot') {
        this.cylinder(0.4, 0.42, palette.teal, [0.5, 0.5, 1.2]);
        this.box(0.08, 0.1, 0.45, palette.ink, [0.5, 0.76, 1.2]);
      }
      this.display = this.label('VOUT', [2.8, 1, 1], 1.7);
    } else if (['diode', 'rectifier', 'zener'].includes(kind)) {
      this.resistor(-0.5, 1.4);
      const diode = this.cylinder(0.18, 0.7, palette.ink, [1, 0.5, -0.3]);
      diode.rotation.z = Math.PI / 2;
      const band = this.cylinder(0.184, 0.09, 0xd1d4c8, [1.2, 0.5, -0.3]);
      band.rotation.z = Math.PI / 2;
      this.label(kind === 'zener' ? '3.3 V ZENER' : 'DIODE', [1, 1.2, -0.3], 1.9);
      if (kind === 'rectifier' && inputs.gate === 'full-wave') for (const point of [[0, -1], [1, -1.7], [2, -1]] as const) {
        const extra = this.cylinder(0.15, 0.65, palette.ink, [point[0], 0.5, point[1]]);
        extra.rotation.z = Math.PI / 2;
      }
      this.display = this.label('OUTPUT', [2.7, 1, 1], 1.7);
    } else {
      this.bulb(2.7, -0.3, led);
      this.knife(0, 2);
      if (kind === 'led' || kind === 'ohm' || kind === 'conductor' || kind === 'button') this.resistor(0, -0.8, kind === 'conductor' ? 'MATERIAL' : 'RESISTOR');
    }
    this.wire([[-3.1, 1.88, 0.1], [-2.2, 0.55, -1.3], [0, 0.38, -1.5], [2.7, 0.38, -0.3]], palette.red);
    this.wire([[2.7, 0.35, 0.1], [2.4, 0.18, 2], [0.6, 0.54, 2]], palette.teal);
    this.wire([[-0.65, 0.54, 2], [-2.4, 0.17, 2.7], [-3.1, 0.14, 0.6]], palette.teal);
    if (kind === 'parallel') this.wire([[-1.5, 0.35, -1], [-1.2, 0.45, 1.5], [1, 0.4, 1.5], [2.7, 0.35, 0]], palette.red);
    if (['transistor', 'mosfet', 'logic', 'opamp', 'comparator'].includes(kind)) this.wire([[-2, 0.3, 1], [-1, 0.45, 1.6], [0, 0.5, 0.5]], 0xb7a25e);
    this.home();
  }

  update(inputs: Inputs, result: Result): void {
    const previous = this.inputs;
    this.inputs = inputs;
    this.result = result;
    if (this.switchBlade) this.switchBlade.rotation.z = inputs.closed ? 0 : 0.7;
    const powered = this.lesson?.kind === 'led' || this.lesson?.kind === 'breadboard' ? result.current > 0 : Math.abs(result.output) > 0 && result.active;
    for (const light of this.lights) {
      const material = light.material;
      if (material instanceof THREE.MeshStandardMaterial) {
        material.color.setHex(powered ? 0xffd464 : 0xb7bab0);
        material.emissive.setHex(powered ? 0xffb735 : 0x000000);
        material.emissiveIntensity = powered ? Math.min(1.3, 0.35 + result.current * 20) : 0;
      }
    }
    if (this.display) {
      const material = this.display.material;
      material.map?.dispose();
      const reading = this.lesson?.kind === 'meter' ? result.readings[0] : undefined;
      material.map = this.texture(reading ? format(reading.value, reading.unit) : format(result.output, 'V'));
      material.needsUpdate = true;
    }
    if (!previous || previous.voltage !== inputs.voltage || this.batteryLabels.some(label => label.userData.voltage !== inputs.voltage)) {
      for (const label of this.batteryLabels) {
        const material = label.material;
        if (material instanceof THREE.MeshBasicMaterial) {
          material.map?.dispose();
          material.map = this.texture(`${inputs.voltage} V`, '#203747', '#c7db77');
          material.needsUpdate = true;
          label.userData.voltage = inputs.voltage;
        }
      }
    }
    this.capacitorLabels.forEach((label, index) => {
      const value = index === 0 ? inputs.capacitance : inputs.secondary;
      if (label.userData.value === value) return;
      label.material.map?.dispose();
      label.material.map = this.texture(`${value} uF`);
      label.material.needsUpdate = true;
      label.userData.value = value;
    });
  }
  settings(motion: boolean, current: boolean): void { this.motion = motion; this.showCurrent = current; }
  private resize(): void {
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (!width || !height) return;
    const ratio = width / height;
    this.camera.left = -5.2 * ratio;
    this.camera.right = 5.2 * ratio;
    this.camera.top = 5.2;
    this.camera.bottom = -5.2;
    this.camera.zoom = Math.min(this.camera.zoom, Math.max(0.55, ratio / 1.2));
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  home(): void {
    this.top = false;
    this.camera.position.set(7.7, 8.8, 11);
    this.controls.target.set(0, 0.4, 0.5);
    const aspect = this.host.clientWidth / Math.max(1, this.host.clientHeight);
    this.camera.zoom = Math.max(0.55, Math.min(1.2, aspect / 1.2));
    this.camera.up.set(0, 1, 0);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }
  action(action: string): void {
    if (action === 'reset') return this.home();
    if (action === 'top') {
      this.top = !this.top;
      if (!this.top) return this.home();
      this.camera.position.set(0.001, 14, 0.501);
      this.controls.target.set(0, 0, 0.5);
      this.controls.update();
    } else if (action === 'in' || action === 'out') {
      this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom * (action === 'in' ? 1.15 : 1 / 1.15), 0.55, 2.8);
      this.camera.updateProjectionMatrix();
    } else if (action === 'left' || action === 'right') {
      const offset = this.camera.position.clone().sub(this.controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), action === 'left' ? -Math.PI / 12 : Math.PI / 12);
      this.camera.position.copy(this.controls.target).add(offset);
      this.controls.update();
    } else {
      const offset = new THREE.Vector3(action === 'a' ? -0.3 : action === 'd' ? 0.3 : 0, 0, action === 'w' ? -0.3 : action === 's' ? 0.3 : 0);
      this.camera.position.add(offset);
      this.controls.target.add(offset);
      this.controls.update();
    }
  }
  private animate = (timestamp: number): void => {
    const dt = this.lastTime ? Math.min((timestamp - this.lastTime) / 1000, 0.1) : 0;
    this.lastTime = timestamp;
    const moving = this.motion && !this.reducedMotion;
    if (moving) this.elapsed += dt;
    const currentFlow = this.result && this.result.current > 1e-7;
    for (const particle of this.particles) {
      particle.visible = Boolean(this.showCurrent && currentFlow && this.inputs);
      const path = this.wires[particle.userData.path as number];
      const speed = Math.min(0.7, 0.15 + (this.result?.current ?? 0) * 2);
      particle.position.copy(path.getPointAt((this.elapsed * speed + (particle.userData.offset as number)) % 1));
    }
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.animate);
  };
  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.controls.dispose();
    this.disposeModel();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
