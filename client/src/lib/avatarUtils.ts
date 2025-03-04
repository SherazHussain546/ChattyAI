import * as THREE from 'three';

// Basic expression configurations
interface Expression {
  mouth: {
    scale: { x: number; y: number; z: number };
    position: { x: number; y: number; z: number };
  };
  eyes: {
    scale: { x: number; y: number };
  };
}

const expressions: Record<string, Expression> = {
  neutral: {
    mouth: {
      scale: { x: 1, y: 1, z: 1 },
      position: { x: 0, y: -0.5, z: 2 },
    },
    eyes: {
      scale: { x: 1, y: 1 },
    },
  },
  happy: {
    mouth: {
      scale: { x: 1.2, y: 0.8, z: 1 },
      position: { x: 0, y: -0.6, z: 2 },
    },
    eyes: {
      scale: { x: 1, y: 0.8 },
    },
  },
  speaking: {
    mouth: {
      scale: { x: 1, y: 1.2, z: 1 },
      position: { x: 0, y: -0.5, z: 2 },
    },
    eyes: {
      scale: { x: 1, y: 1 },
    },
  },
};

export function createAvatarHead(): THREE.Group {
  const head = new THREE.Group();

  // Create the main head sphere
  const headGeometry = new THREE.SphereGeometry(2, 32, 32);
  const headMaterial = new THREE.MeshPhongMaterial({
    color: 0xf0d0c0,
    specular: 0x111111,
    shininess: 30,
  });
  const headMesh = new THREE.Mesh(headGeometry, headMaterial);
  head.add(headMesh);

  // Add eyes
  const eyeGeometry = new THREE.SphereGeometry(0.3, 16, 16);
  const eyeMaterial = new THREE.MeshPhongMaterial({
    color: 0x444444,
    specular: 0xffffff,
    shininess: 100,
  });

  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.8, 0.2, 1.7);
  head.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.8, 0.2, 1.7);
  head.add(rightEye);

  // Add mouth
  const mouthGeometry = new THREE.BoxGeometry(1.2, 0.2, 0.1);
  const mouthMaterial = new THREE.MeshPhongMaterial({
    color: 0x444444,
  });
  const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
  mouth.position.set(0, -0.5, 2);
  head.add(mouth);

  return head;
}

export function updateExpression(
  head: THREE.Group,
  expression: string,
  intensity: number = 1
): void {
  const config = expressions[expression] || expressions.neutral;
  const mouth = head.children.find(
    (child) => child.geometry instanceof THREE.BoxGeometry
  );

  if (mouth) {
    // Apply mouth transformations
    const mouthScale = config.mouth.scale;
    mouth.scale.set(
      1 + (mouthScale.x - 1) * intensity,
      1 + (mouthScale.y - 1) * intensity,
      1
    );
    
    // Apply mouth position
    mouth.position.set(
      config.mouth.position.x,
      config.mouth.position.y,
      config.mouth.position.z
    );
  }

  // Find and update eyes
  const eyes = head.children.filter(
    (child) => child.geometry instanceof THREE.SphereGeometry && child !== head.children[0]
  );

  eyes.forEach((eye) => {
    const eyeScale = config.eyes.scale;
    eye.scale.set(
      1 + (eyeScale.x - 1) * intensity,
      1 + (eyeScale.y - 1) * intensity,
      1
    );
  });
}

export function animateSpeaking(
  head: THREE.Group,
  isSpeaking: boolean,
  time: number
): void {
  if (!isSpeaking) {
    updateExpression(head, 'neutral');
    return;
  }

  // Create a smooth oscillation for the mouth
  const intensity = Math.sin(time * 0.015) * 0.5 + 0.5;
  updateExpression(head, 'speaking', intensity);
}

// Helper function to add random subtle head movements
export function addIdleAnimation(head: THREE.Group): void {
  const originalRotation = head.rotation.clone();
  const amplitude = 0.03;
  const frequency = 0.001;

  head.userData.idleAnimation = (time: number) => {
    head.rotation.x = originalRotation.x + Math.sin(time * frequency) * amplitude;
    head.rotation.y = originalRotation.y + Math.cos(time * frequency * 0.7) * amplitude;
  };
}

// Setup lighting for the avatar
export function setupAvatarLighting(scene: THREE.Scene): void {
  // Main directional light
  const mainLight = new THREE.DirectionalLight(0xffffff, 1);
  mainLight.position.set(0, 1, 2);
  scene.add(mainLight);

  // Fill light
  const fillLight = new THREE.DirectionalLight(0x7ec1ff, 0.3);
  fillLight.position.set(-2, 0, 1);
  scene.add(fillLight);

  // Ambient light
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);
}
