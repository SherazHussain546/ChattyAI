// Simple utility for 3D avatar rendering using Three.js
import * as THREE from 'three';

export class AvatarRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private head: THREE.Mesh;
  private mouth: THREE.Mesh;
  private eyes: THREE.Mesh[];
  private container: HTMLElement | null = null;
  private animationId: number | null = null;
  private speaking: boolean = false;
  private mouthOpenness: number = 0;
  private blinkTimer: number = 0;
  private headRotation: { x: number; y: number } = { x: 0, y: 0 };
  private targetRotation: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    // Initialize scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.z = 5;

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 1, 1);
    this.scene.add(directionalLight);

    // Create head
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: 0x87ceeb,
      specular: 0x333333,
      shininess: 30,
    });

    this.head = new THREE.Mesh(geometry, material);
    this.scene.add(this.head);

    // Create mouth
    const mouthGeometry = new THREE.BoxGeometry(0.5, 0.1, 0.1);
    const mouthMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
    this.mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    this.mouth.position.set(0, -0.4, 0.9);
    this.head.add(this.mouth);

    // Create eyes
    const eyeGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.3, 0.3, 0.85);
    this.head.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.3, 0.3, 0.85);
    this.head.add(rightEye);
    
    this.eyes = [leftEye, rightEye];

    // Initialize arrays
    this.eyes = [leftEye, rightEye];
    
    // Random idle animation
    this.startRandomHeadMovement();
  }

  init(container: HTMLElement) {
    this.container = container;

    // Clear any existing content
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Set up renderer
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // Set aspect ratio based on container
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();

    // Start the animation loop
    this.animate();

    // Handle window resize
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = () => {
    if (!this.container) return;

    // Update camera
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();

    // Update renderer
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

  private startRandomHeadMovement() {
    setInterval(() => {
      this.targetRotation = {
        x: Math.random() * 0.2 - 0.1,
        y: Math.random() * 0.2 - 0.1,
      };
    }, 3000);
  }

  private updateHeadPosition(delta: number) {
    this.headRotation.x += (this.targetRotation.x - this.headRotation.x) * delta * 2;
    this.headRotation.y += (this.targetRotation.y - this.headRotation.y) * delta * 2;
    
    this.head.rotation.x = this.headRotation.x;
    this.head.rotation.y = this.headRotation.y;
  }

  private updateMouth(delta: number) {
    if (this.speaking) {
      // Animated mouth when speaking
      this.mouthOpenness = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
      const mouthScale = 0.1 + this.mouthOpenness * 0.2;
      this.mouth.scale.set(1, mouthScale * 2, 1);
    } else {
      // Return to closed mouth
      this.mouth.scale.set(1, 0.1, 1);
    }
  }

  private updateEyeBlink(delta: number) {
    this.blinkTimer -= delta;
    
    if (this.blinkTimer <= 0) {
      // Time to blink
      if (this.eyes[0].scale.y === 1) {
        // Close eyes
        this.eyes.forEach(eye => {
          eye.scale.y = 0.1;
        });
        this.blinkTimer = 0.1; // Keep closed for a short time
      } else {
        // Open eyes
        this.eyes.forEach(eye => {
          eye.scale.y = 1;
        });
        // Random interval until next blink (2-6 seconds)
        this.blinkTimer = 2 + Math.random() * 4;
      }
    }
  }

  animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    
    const delta = 0.016; // Approx 60 fps
    
    // Update animations
    this.updateHeadPosition(delta);
    this.updateMouth(delta);
    this.updateEyeBlink(delta);
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
  };

  // Called to indicate speaking animation should start
  speak() {
    this.speaking = true;
    
    // Auto stop speaking after 5 seconds as a fallback
    setTimeout(() => {
      this.speaking = false;
    }, 5000);
  }
  
  // Called to stop speaking animation
  stopSpeaking() {
    this.speaking = false;
  }

  // Clean up resources
  cleanup() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    
    window.removeEventListener('resize', this.handleResize);
    
    // Remove Three.js canvas
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
    
    // Clean up Three.js resources
    this.scene.clear();
    this.renderer.dispose();
  }
}