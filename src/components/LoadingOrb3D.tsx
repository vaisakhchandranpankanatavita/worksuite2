import { Canvas, useFrame } from '@react-three/fiber'
import { MeshDistortMaterial } from '@react-three/drei'
import { useRef } from 'react'
import type { Mesh } from 'three'

function DistortSphere() {
  const mesh = useRef<Mesh>(null)

  useFrame((_, delta) => {
    if (!mesh.current) return
    mesh.current.rotation.x += delta * 0.28
    mesh.current.rotation.y += delta * 0.42
  })

  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[0.85, 4]} />
      <MeshDistortMaterial
        color="#aece52"
        emissive="#4a6b1a"
        emissiveIntensity={0.35}
        roughness={0.15}
        metalness={0.1}
        distort={0.3}
        speed={1.8}
      />
    </mesh>
  )
}

interface Props { size?: number; className?: string }

/** Small react-three-fiber loading orb used on the welcome splash and module-enter overlays. */
export default function LoadingOrb3D({ size = 88, className }: Props) {
  return (
    <div className={className} style={{ width: size, height: size }} aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 38 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[3, 3, 4]} intensity={1.4} color="#d8eca0" />
        <pointLight position={[-3, -2, -3]} intensity={0.8} color="#6b92d8" />
        <DistortSphere />
      </Canvas>
    </div>
  )
}
