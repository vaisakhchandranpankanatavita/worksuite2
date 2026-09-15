import clsx from 'clsx'
import { motion, useMotionValue, useSpring } from 'motion/react'
import { type ReactNode, useRef } from 'react'

const springValues = { damping: 24, stiffness: 180, mass: 1.1 }

export default function Tilt3D({ children, className, rotateAmplitude = 10, scaleOnHover = 1.02 }: {
  children: ReactNode; className?: string; rotateAmplitude?: number; scaleOnHover?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const rotateX = useSpring(useMotionValue(0), springValues)
  const rotateY = useSpring(useMotionValue(0), springValues)
  const scale = useSpring(1, springValues)

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const offsetX = e.clientX - rect.left - rect.width / 2
    const offsetY = e.clientY - rect.top - rect.height / 2
    rotateX.set((offsetY / (rect.height / 2)) * -rotateAmplitude)
    rotateY.set((offsetX / (rect.width / 2)) * rotateAmplitude)
  }
  function onMouseEnter() { scale.set(scaleOnHover) }
  function onMouseLeave() { scale.set(1); rotateX.set(0); rotateY.set(0) }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ rotateX, rotateY, scale, transformPerspective: 900 }}
      className={clsx('relative', className)}
    >
      {children}
    </motion.div>
  )
}
