import * as THREE from 'three';

export class AvatarRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private head: THREE.Mesh;
  private mouth: THREE.Mesh;
  private container: HTMLElement | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    // Create head
    const headGeometry = new THREE.SphereGeometry(1, 32, 32);
    const headMaterial = new THREE.MeshPhongMaterial({ color: 0xffd700 });
    this.head = new THREE.Mesh(headGeometry, headMaterial);

    // Create mouth
    const mouthGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.1);
    const mouthMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
    this.mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    this.mouth.position.set(0, -0.3, 0.9);
    
    this.head.add(this.mouth);
    this.scene.add(this.head);

    // Add lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 1, 2);
    this.scene.add(light);

    this.camera.position.z = 5;
  }

  init(container: HTMLElement) {
    this.container = container;
    this.renderer.setSize(container.clientWidth, container.clientWidth);
    container.appendChild(this.renderer.domElement);
    this.animate();
  }

  animate = () => {
    requestAnimationFrame(this.animate);
    this.head.rotation.y += 0.01;
    this.renderer.render(this.scene, this.camera);
  };

  speak() {
    const duration = 300;
    const startTime = Date.now();
    
    const animateMouth = () => {
      const elapsed = Date.now() - startTime;
      const t = elapsed / duration;
      
      if (t < 1) {
        this.mouth.scale.y = 1 + Math.sin(t * Math.PI * 4) * 0.5;
        requestAnimationFrame(animateMouth);
      } else {
        this.mouth.scale.y = 1;
      }
    };

    animateMouth();
  }

  cleanup() {
    if (this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
