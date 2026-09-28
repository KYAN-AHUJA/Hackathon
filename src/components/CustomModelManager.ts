import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface LoadedCustomModel {
  object: THREE.Group;
  name: string;
}

export async function parseModelFile(file: File): Promise<THREE.Group> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  if (extension === 'obj') {
    const text = new TextDecoder().decode(arrayBuffer);
    const loader = new OBJLoader();
    const group = loader.parse(text);

    // Normalize scale and orientation
    const box = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    if (maxDim > 0) {
      // Scale to approx 6.5 units length (matching scene scale)
      const targetScale = 6.5 / maxDim;
      group.scale.setScalar(targetScale);
    }

    const center = new THREE.Vector3();
    box.getCenter(center);
    group.position.sub(center.clone().multiplyScalar(group.scale.x));

    return group;
  } else if (extension === 'glb' || extension === 'gltf') {
    const loader = new GLTFLoader();
    const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
      loader.parse(arrayBuffer, '', resolve, reject);
    });

    const group = gltf.scene;
    const box = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    if (maxDim > 0) {
      const targetScale = 6.5 / maxDim;
      group.scale.setScalar(targetScale);
    }
    const center = new THREE.Vector3();
    box.getCenter(center);
    group.position.sub(center.clone().multiplyScalar(group.scale.x));

    return group;
  }

  throw new Error(`Unsupported model format: .${extension}. Please provide .obj, .gltf, or .glb.`);
}
