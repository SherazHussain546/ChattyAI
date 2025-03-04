import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface AvatarProps {
  isSpeaking: boolean;
}

export function Avatar({ isSpeaking }: AvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const headRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create simple avatar head (sphere)
    const geometry = new THREE.SphereGeometry(2, 32, 32);
    const material = new THREE.MeshPhongMaterial({ color: 0x808080 });
    const head = new THREE.Mesh(geometry, material);
    scene.add(head);
    headRef.current = head;

    // Add lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 1, 2);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      if (headRef.current && isSpeaking) {
        headRef.current.scale.y = 1 + Math.sin(Date.now() * 0.01) * 0.1;
      }
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full aspect-square max-w-[400px] rounded-lg overflow-hidden"
    />
  );
}
