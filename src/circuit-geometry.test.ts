import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CircuitGeometry } from './circuit-geometry';
import { lessons } from './lessons';
import { controls, initialInputs } from './simulation';

const lesson = (id: string) => {
  const found = lessons.find(item => item.id === id);
  if (!found) throw new Error(`Unknown fixture lesson ${id}`);
  return found;
};
function dispose(circuit: CircuitGeometry): void {
  circuit.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
      object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
    }
  });
}
function verifyConnections(circuit: CircuitGeometry): void {
  const attached = new Set(circuit.connections.flatMap(connection => [connection.from, connection.to]));
  for (const part of circuit.parts) {
    if (!part.disconnected) {
      expect(attached.has(part.a), `${part.kind} first terminal is disconnected`).toBe(true);
      expect(attached.has(part.b), `${part.kind} second terminal is disconnected`).toBe(true);
    }
  }
  for (const connection of circuit.connections) {
    expect(connection.from).not.toBe(connection.to);
    const start = circuit.localToWorld(connection.curve.getPoint(0));
    const end = circuit.localToWorld(connection.curve.getPoint(1));
    expect(start.distanceTo(connection.from.getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-9);
    expect(end.distanceTo(connection.to.getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-9);
    for (const terminal of [connection.from, connection.to]) {
      const owner = terminal.parent;
      expect(owner).toBeInstanceOf(THREE.Mesh);
      if (!(owner instanceof THREE.Mesh)) throw new Error('Terminal is detached from its component mesh.');
      const geometry = owner.geometry;
      if (geometry instanceof THREE.CylinderGeometry) {
        const { height, radiusTop } = geometry.parameters;
        const axial = Math.abs(Math.abs(terminal.position.y) - height / 2) < 1e-9;
        const radial = Math.abs(Math.hypot(terminal.position.x, terminal.position.z) - radiusTop) < 1e-9;
        expect(axial || radial, 'Terminal must lie on its actual metal surface').toBe(true);
      } else if (geometry instanceof THREE.BoxGeometry) {
        const { width, height, depth } = geometry.parameters;
        expect([Math.abs(terminal.position.x) - width / 2, Math.abs(terminal.position.y) - height / 2, Math.abs(terminal.position.z) - depth / 2].some(value => Math.abs(value) < 1e-9)).toBe(true);
      }
    }
  }
}

describe('3D terminal connections', () => {
  it('connects both ends of the relocated resistor in the reported cell layout', () => {
    const item = lesson('1-5');
    const circuit = new CircuitGeometry(item, initialInputs(item.kind, item.defaults));
    const resistor = circuit.parts.find(part => part.kind === 'resistor');
    if (!resistor) throw new Error('Expected the reported load resistor.');
    expect(resistor.a.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(0.1, 0.5, 1))).toBeLessThan(1e-9);
    expect(resistor.b.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(1.9, 0.5, 1))).toBeLessThan(1e-9);
    verifyConnections(circuit);
    dispose(circuit);
  });
  it('anchors every lesson and selectable component variant to physical terminals', () => {
    for (const item of lessons) {
      const defaults = initialInputs(item.kind, item.defaults);
      const modes = controls(item.kind).find(control => control.key === 'gate')?.options ?? [defaults.gate];
      for (const gate of modes) {
        const circuit = new CircuitGeometry(item, { ...defaults, gate });
        verifyConnections(circuit);
        dispose(circuit);
      }
    }
  });
  it('preserves wire-to-terminal alignment under parent translation, scale and rotation', () => {
    const item = lesson('1-5');
    const circuit = new CircuitGeometry(item, initialInputs(item.kind, item.defaults));
    circuit.position.set(2, 0.4, -3);
    circuit.rotation.set(0.2, Math.PI / 3, -0.1);
    circuit.scale.set(1.3, 0.8, 1.2);
    circuit.updateMatrixWorld(true);
    verifyConnections(circuit);
    const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 100);
    for (const position of [[8, 9, 11], [0.001, 14, 0], [-9, 6, 5]]) {
      camera.position.set(position[0], position[1], position[2]);
      camera.lookAt(circuit.position);
      camera.updateMatrixWorld(true);
      for (const connection of circuit.connections) {
        const wirePoint = circuit.localToWorld(connection.curve.getPoint(0)).project(camera);
        const terminalPoint = connection.from.getWorldPosition(new THREE.Vector3()).project(camera);
        expect(wirePoint.distanceTo(terminalPoint)).toBeLessThan(1e-9);
      }
    }
    dispose(circuit);
  });
  it('keeps switch cables on the fixed contacts when the blade opens', () => {
    const item = lesson('3-1');
    const circuit = new CircuitGeometry(item, initialInputs(item.kind, item.defaults));
    const contacts = circuit.parts.find(part => part.kind === 'switch');
    if (!contacts || !circuit.switchBlade) throw new Error('Switch fixture missing.');
    const before = [contacts.a, contacts.b].map(pin => pin.getWorldPosition(new THREE.Vector3()));
    circuit.switchBlade.rotation.z = 0.7;
    circuit.updateMatrixWorld(true);
    expect(contacts.a.getWorldPosition(new THREE.Vector3()).distanceTo(before[0])).toBe(0);
    expect(contacts.b.getWorldPosition(new THREE.Vector3()).distanceTo(before[1])).toBe(0);
    verifyConnections(circuit);
    dispose(circuit);
  });
  it('swaps actual LED terminals when polarity is reversed', () => {
    const item = lesson('3-2');
    for (const reverse of [false, true]) {
      const circuit = new CircuitGeometry(item, { ...initialInputs(item.kind, item.defaults), reverse });
      const resistor = circuit.parts.find(part => part.kind === 'resistor');
      const led = circuit.parts.find(part => part.kind === 'led');
      if (!resistor || !led) throw new Error('LED fixture missing.');
      expect(circuit.connections.some(connection => connection.from === resistor.b && connection.to === (reverse ? led.b : led.a))).toBe(true);
      verifyConnections(circuit);
      dispose(circuit);
    }
  });
  it('routes one to four cells using the selected series or parallel terminal topology', () => {
    const item = lesson('1-5');
    for (const gate of ['series', 'parallel']) for (const count of [1, 2, 3, 4]) {
      const circuit = new CircuitGeometry(item, { ...initialInputs(item.kind, item.defaults), gate, secondary: count });
      const cells = circuit.parts.filter(part => part.kind === 'battery');
      expect(cells).toHaveLength(count);
      for (let index = 1; index < cells.length; index++) {
        if (gate === 'series') expect(circuit.connections.some(connection => connection.from === cells[index - 1].a && connection.to === cells[index].b)).toBe(true);
        else {
          expect(circuit.connections.some(connection => connection.from === cells[0].a && connection.to === cells[index].a)).toBe(true);
          expect(circuit.connections.some(connection => connection.from === cells[0].b && connection.to === cells[index].b)).toBe(true);
        }
      }
      verifyConnections(circuit);
      dispose(circuit);
    }
  });
});
