'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';

/**
 * Spinnable preview of an STL returned by the parametric API.
 *
 * The mesh arrives as raw bytes rather than a URL — it is generated per
 * request, so there is nothing to point a loader at. Geometry is disposed on
 * every swap: a visitor moving sliders churns through dozens of these, and
 * three does not free GPU buffers on its own.
 */
export default function ModelPreview({ stl }: { stl: ArrayBuffer | null }) {
  const geometry = useMemo(() => {
    if (!stl || stl.byteLength === 0) return null;
    try {
      const geo = new STLLoader().parse(stl);

      // Normalise into a unit box centred on the origin. Models here range from
      // an 8mm coaster to a 250mm vase, and a fixed camera can only frame both
      // if the geometry itself is brought to a common size. Doing it here also
      // means the camera never moves between renders, so adjusting a slider
      // does not jump the view around.
      geo.computeBoundingBox();
      const box = geo.boundingBox;
      if (box) {
        const size = new THREE.Vector3();
        const centre = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(centre);
        const longest = Math.max(size.x, size.y, size.z) || 1;
        geo.translate(-centre.x, -centre.y, -centre.z);
        geo.scale(1 / longest, 1 / longest, 1 / longest);
      }

      geo.computeVertexNormals();
      return geo;
    } catch {
      return null;
    }
  }, [stl]);

  useEffect(() => () => geometry?.dispose(), [geometry]);

  // Not reset per mesh on purpose: WebGL being unavailable is a property of the
  // browser, not of the model, so retrying on the next render would only flash
  // an empty canvas at someone who cannot see it either way.
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="absolute inset-0 grid place-items-center text-center px-6">
        <p className="text-sm text-ink2">
          Preview needs WebGL, which this browser has turned off. Downloading still works.
        </p>
      </div>
    );
  }

  return (
    <Canvas
      camera={{ position: [1.35, 1.0, 1.75], fov: 40 }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      onError={() => setFailed(true)}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 6, 5]} intensity={1.5} />
      <directionalLight position={[-5, 2, -4]} intensity={0.5} />

      <Suspense fallback={null}>
        {geometry && (
          /* OpenSCAD works Z-up, three is Y-up. */
          <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color="#b5654a" roughness={0.55} metalness={0.05} />
          </mesh>
        )}
      </Suspense>

      <OrbitControls makeDefault enablePan={false} minDistance={0.8} maxDistance={6} />
    </Canvas>
  );
}
