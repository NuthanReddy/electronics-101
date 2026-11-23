import * as THREE from 'three';

export function frameCircuit(camera: THREE.OrthographicCamera, object: THREE.Object3D, width: number, height: number, direction: THREE.Vector3): THREE.Vector3 {
  const bounds = new THREE.Box3().setFromObject(object);
  const center = bounds.isEmpty() ? new THREE.Vector3(0, 0.4, 0.5) : bounds.getCenter(new THREE.Vector3());
  const aspect = Math.max(1, width) / Math.max(1, height);
  camera.left = -5.2 * aspect;
  camera.right = 5.2 * aspect;
  camera.top = 5.2;
  camera.bottom = -5.2;
  camera.position.copy(center).add(direction);
  camera.up.set(0, 1, 0);
  camera.lookAt(center);
  camera.zoom = 1;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  if (!bounds.isEmpty()) {
    let horizontal = 0;
    let vertical = 0;
    const point = new THREE.Vector3();
    object.traverse(child => {
      if (child instanceof THREE.Sprite) {
        // Labels face the camera, not their parent's world orientation.
        child.getWorldPosition(point).project(camera);
        const scale = child.getWorldScale(new THREE.Vector3());
        horizontal = Math.max(horizontal, Math.abs(point.x) + scale.x / (camera.right - camera.left));
        vertical = Math.max(vertical, Math.abs(point.y) + scale.y / (camera.top - camera.bottom));
      } else if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
        const positions = child.geometry.getAttribute('position');
        for (let index = 0; index < positions.count; index++) {
          point.fromBufferAttribute(positions, index).applyMatrix4(child.matrixWorld).project(camera);
          horizontal = Math.max(horizontal, Math.abs(point.x));
          vertical = Math.max(vertical, Math.abs(point.y));
        }
      }
    });
    camera.zoom = Math.min(2.8, 0.94 / Math.max(horizontal, vertical, 0.01));
    camera.updateProjectionMatrix();
  }
  return center;
}
