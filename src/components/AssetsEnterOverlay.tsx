import { Boxes, ListChecks } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import LoadingOrb3D from './LoadingOrb3D'

interface Props { onDone: () => void }

const PHASE_ONE_MS = 550
const EXIT_MS = 420

/** Brief auto-closing title-card animation shown when switching into the Assets module. */
export default function AssetsEnterOverlay({ onDone }: Props) {
  const [phase, setPhase] = useState<'enter' | 'reveal' | 'exit'>('enter')
  // Keep the latest onDone without making it a timer dependency — the parent
  // re-renders while this is showing, and a fresh callback each render must
  // not restart the phase timers (that previously left the overlay stuck).
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      onDoneRef.current()
      return
    }
    const t1 = setTimeout(() => setPhase('reveal'), PHASE_ONE_MS)
    const t2 = setTimeout(() => setPhase('exit'), PHASE_ONE_MS + PHASE_ONE_MS)
    const t3 = setTimeout(() => onDoneRef.current(), PHASE_ONE_MS + PHASE_ONE_MS + EXIT_MS)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return (
    <div
      className="asset-portal fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#0d0f0e' }}
      data-phase={phase}
      aria-hidden
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 50%, transparent 15%, #0d0f0e 82%)' }}
      />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div className="relative mb-6 flex size-[76px] items-center justify-center">
          <LoadingOrb3D size={76} className="asset-portal-orb absolute inset-0" />
          <div className="relative z-10 text-[#d8eca0]">
            {phase === 'enter' ? <Boxes size={22} /> : <ListChecks size={22} />}
          </div>
        </div>

        <p key={phase === 'enter' ? 'a' : 'b'} className="asset-portal-text font-display text-[19px] font-semibold tracking-tight text-white">
          {phase === 'enter' ? 'Entering Asset Management' : 'Asset Inventory'}
        </p>
        <p className="mt-1 text-[12px] text-white/40">
          {phase === 'enter' ? 'Loading inventory workspace' : 'Ready'}
        </p>

        <div className="mt-6 flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="ai-dot" style={{ animationDelay: `${i * 0.2}s`, background: '#aece52', opacity: 0.5 }} />
          ))}
        </div>
      </div>
    </div>
  )
}
