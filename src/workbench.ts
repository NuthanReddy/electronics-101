import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Inputs, Lesson } from './lessons';
import type { Result } from './simulation';
import { format } from './simulation';
import { CircuitGeometry, palette, type CircuitConnection } from './circuit-geometry';

export class Workbench {
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-7, 7, 5, -5, 0.1, 100);
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private model = new THREE.Group();
  private circuit?: CircuitGeometry;
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
  private wire(connection: CircuitConnection, parent: THREE.Group): void {
    const { curve, color } = connection;
    const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.045, 8, false), this.material(color));
    wire.castShadow = true;
    parent.add(wire);
    this.wires.push(curve);
    for (let index = 0; index < 5; index++) {
      const particle = new THREE.Mesh(new THREE.SphereGeometry(0.064, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf8ce68 }));
      particle.userData.path = this.wires.length - 1;
      particle.userData.offset = index / 5;
      parent.add(particle);
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
    this.circuit = undefined;
    this.switchBlade = undefined;
    this.display = undefined;
    this.batteryLabels = [];
    this.capacitorLabels = [];
    this.lights = [];
    this.particles = [];
    this.wires = [];
  }

  setLesson(lesson: Lesson, inputs: Inputs, resetCamera = true): void {
    this.disposeModel();
    this.lesson = lesson;
    this.circuit = new CircuitGeometry(lesson, inputs);
    this.model.add(this.circuit);
    this.switchBlade = this.circuit.switchBlade;
    this.lights = this.circuit.lights;
    for (const body of this.circuit.batteryBodies) {
      const wrap = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 0.32), new THREE.MeshBasicMaterial({ map: this.texture(`${inputs.voltage} V`, '#203747', '#c7db77'), side: THREE.DoubleSide }));
      wrap.position.set(0, 0, 0.584);
      body.add(wrap);
      this.batteryLabels.push(wrap);
    }
    for (const request of this.circuit.labels) {
      const label = this.label(request.text, request.position, request.width);
      if (request.role === 'capacitor') this.capacitorLabels.push(label);
      if (request.role === 'display') this.display = label;
    }
    for (const connection of this.circuit.connections) this.wire(connection, this.circuit);
    if (resetCamera) this.home();
  }

  update(inputs: Inputs, result: Result): void {
    if (this.lesson && ['led', 'diode'].includes(this.lesson.kind) && this.circuit?.reverse !== inputs.reverse) this.setLesson(this.lesson, inputs, false);
    const previous = this.inputs;
    this.inputs = { ...inputs };
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
