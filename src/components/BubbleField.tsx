import { Canvas, useFrame } from '@react-three/fiber'
import { MeshDistortMaterial } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import type { Mesh } from 'three'

type Bubble = {
  position: [number, number, number]
  scale: number
  speed: number
  distort: number
  color: string
  offset: number
}

const PALETTE = ['#aece52', '#6b92d8', '#cd6a96', '#5fa059', '#d8eca0']

function makeBubbles(count: number, seed: number): Bubble[] {
  return Array.from({ length: count }, (_, i) => {
    const r = (n: number) => {
      const x = Math.sin(seed + i * 12.9898 + n * 78.233) * 43758.5453
      return x - Math.floor(x)
    }
    return {
      position: [(r(1) - 0.5) * 3.2, (r(2) - 0.5) * 2.0, (r(3) - 0.5) * 1.2],
      scale: 0.22 + r(4) * 0.4,
      speed: 0.5 + r(5) * 0.9,
      distort: 0.25 + r(6) * 0.25,
      color: PALETTE[i % PALETTE.length],
      offset: r(7) * Math.PI * 2,
    }
  })
}

function BubbleMesh({ b, active }: { b: Bubble; active: boolean }) {
  const ref = useRef<Mesh>(null)
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime * b.speed + b.offset
    ref.current.position.y = b.position[1] + Math.sin(t) * 0.22
    ref.current.position.x = b.position[0] + Math.cos(t * 0.6) * 0.12
    ref.current.rotation.x = t * 0.3
    ref.current.rotation.y = t * 0.2
    const targetScale = active ? b.scale * 1.35 : b.scale
    ref.current.scale.setScalar(targetScale + Math.sin(t * 1.4) * 0.02)
  })

  return (
    <mesh ref={ref} position={b.position}>
      <sphereGeometry args={[1, 32, 32]} />
      <MeshDistortMaterial
        color={b.color}
        distort={b.distort}
        speed={active ? 3 : 1.2}
        roughness={0.15}
        metalness={0.1}
        transparent
        opacity={active ? 0.85 : 0.55}
      />
    </mesh>
  )
}

export function BubbleField({ active = false, count = 6 }: { active?: boolean; count?: number }) {
  const bubbles = useMemo(() => makeBubbles(count, 7.3), [count])

  return (
    <Canvas
      className="pointer-events-none absolute inset-0"
      camera={{ position: [0, 0, 3.2], fov: 45 }}
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[2, 3, 3]} intensity={1.1} />
      <directionalLight position={[-2, -1, 2]} intensity={0.35} color="#c8d9f4" />
      {bubbles.map((b, i) => (
        <BubbleMesh key={i} b={b} active={active} />
      ))}
    </Canvas>
  )
}
