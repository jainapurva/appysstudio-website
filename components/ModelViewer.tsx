'use client';
import { Suspense, useRef, Component, ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Center } from '@react-three/drei';
import * as THREE from 'three';
import { AlertCircle, RotateCcw } from 'lucide-react';

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return (
    <Center>
      <primitive object={scene} />
    </Center>
  );
}

function LoadingBox() {
  const ref = useRef<THREE.Mesh>(null!);
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 1, 1] as [number, number, number]} />
      <meshStandardMaterial color="#a855f7" wireframe />
    </mesh>
  );
}

// Error boundary to catch useGLTF / WebGL errors without crashing the page
class ModelErrorBoundary extends Component<
  { children: ReactNode; onError?: () => void },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode; onError?: () => void }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, message: err?.message || 'Failed to load model' };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full rounded-2xl bg-gray-950 flex flex-col items-center justify-center gap-3 text-center px-6">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-sm font-semibold text-gray-300">Failed to load 3D model</p>
          <p className="text-xs text-gray-500">{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors mt-1"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ModelViewer({ glbUrl }: { glbUrl: string }) {
  return (
    <ModelErrorBoundary>
      <div className="w-full h-full rounded-2xl overflow-hidden bg-gray-950">
        <Canvas camera={{ position: [0, 1, 3], fov: 50 }} shadows>
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
          <Suspense fallback={<LoadingBox />}>
            <Model url={glbUrl} />
            <Environment preset="studio" />
          </Suspense>
          <OrbitControls
            autoRotate
            autoRotateSpeed={1.5}
            enableZoom
            enablePan={false}
            minDistance={1}
            maxDistance={10}
          />
        </Canvas>
        <p className="text-center text-xs text-gray-500 py-1.5">Drag to rotate · Scroll to zoom</p>
      </div>
    </ModelErrorBoundary>
  );
}
