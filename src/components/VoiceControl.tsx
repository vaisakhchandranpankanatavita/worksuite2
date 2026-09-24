import clsx from 'clsx'
import { Mic } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../store'

/**
 * Voice control: click the mic, speak a command, and it finds the matching
 * on-screen button/link/input by its visible text or label and activates it.
 *
 * Supported phrasings (case-insensitive):
 *   "click <label>" / "press <label>" / "open <label>" / "go to <label>"
 *   "type <value> in <label>" / "search <value>" / "search for <value>"
 *   "scroll up/down/to top/to bottom"
 *   "focus <label>" — focuses that field and switches to dictation mode: every
 *     following phrase is typed into it verbatim until you say "stop typing".
 *   anything else: treated as a label to click directly.
 */

function getRecognitionCtor(): (new () => any) | null {
  const w = window as any
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const CLICK_SELECTOR = 'button, a[href], [role="button"], summary'
const INPUT_SELECTOR = 'input, textarea, select, [role="textbox"]'

function visibleText(el: Element): string {
  const aria = el.getAttribute('aria-label')
  const title = el.getAttribute('title')
  const text = (el as HTMLElement).innerText ?? el.textContent ?? ''
  return (aria || title || text || '').trim()
}

function isVisible(el: Element): boolean {
  const r = (el as HTMLElement).getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return false
  const style = window.getComputedStyle(el as HTMLElement)
  return style.display !== 'none' && style.visibility !== 'hidden'
}

/** Finds the visible clickable element whose label best matches the spoken phrase. */
function findClickTarget(phrase: string): HTMLElement | null {
  const needle = phrase.trim().toLowerCase()
  if (!needle) return null
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(CLICK_SELECTOR)).filter(isVisible)
  let best: HTMLElement | null = null
  let bestScore = -1
  for (const el of candidates) {
    const label = visibleText(el).toLowerCase()
    if (!label) continue
    let score = -1
    if (label === needle) score = 100
    else if (label.startsWith(needle)) score = 80
    else if (label.includes(needle)) score = 60
    else if (needle.includes(label) && label.length > 2) score = 40
    if (score > bestScore) { bestScore = score; best = el }
  }
  return bestScore >= 40 ? best : null
}

function findInputTarget(labelPhrase: string): HTMLElement | null {
  const needle = labelPhrase.trim().toLowerCase()
  if (!needle) return null
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(INPUT_SELECTOR)).filter(isVisible)
  let best: HTMLElement | null = null
  let bestScore = -1
  for (const el of candidates) {
    const aria = (el.getAttribute('aria-label') || '').toLowerCase()
    const placeholder = (el.getAttribute('placeholder') || '').toLowerCase()
    const labelledId = el.getAttribute('id')
    const labelEl = labelledId ? document.querySelector(`label[for="${labelledId}"]`) : el.closest('label')
    const labelText = (labelEl?.textContent || '').toLowerCase()
    const label = aria || placeholder || labelText
    if (!label) continue
    let score = -1
    if (label === needle) score = 100
    else if (label.includes(needle)) score = 60
    else if (needle.includes(label) && label.length > 2) score = 40
    if (score > bestScore) { bestScore = score; best = el }
  }
  return bestScore >= 40 ? best : null
}

function setNativeValue(el: HTMLElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter) setter.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

/** Holds the input currently focused for dictation (set by "focus <label>"), across recognition results. */
type DictationRef = { current: HTMLElement | null }

/** Runs a spoken command against the current page. Returns a short status message. */
function runVoiceCommand(raw: string, dictation: DictationRef): string {
  const text = raw.trim()
  if (!text) return "Didn't catch that."

  if (/^(?:stop typing|stop dictation|unfocus|done typing|done)$/i.test(text)) {
    if (dictation.current) { dictation.current.blur(); dictation.current = null; return 'Stopped dictation' }
    return 'Not dictating'
  }

  const focusMatch = text.match(/^(?:focus(?: on)?|dictate(?: into)?)\s+(.+)$/i)
  if (focusMatch) {
    const target = findInputTarget(focusMatch[1])
    if (target) {
      target.focus()
      dictation.current = target
      return `Focused "${focusMatch[1].trim()}" — say the words to type, or "stop typing" when done`
    }
    return `Couldn't find a field for "${focusMatch[1].trim()}"`
  }

  if (/^clear (?:the )?field$/i.test(text) && dictation.current) {
    setNativeValue(dictation.current, '')
    return 'Cleared the field'
  }

  const scrollMatch = text.match(/^scroll\s*(up|down|to top|to bottom|top|bottom)?$/i)
  if (scrollMatch) {
    const dir = (scrollMatch[1] || 'down').toLowerCase()
    if (dir === 'to top' || dir === 'top') window.scrollTo({ top: 0, behavior: 'smooth' })
    else if (dir === 'to bottom' || dir === 'bottom') window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    else window.scrollBy({ top: dir === 'up' ? -Math.round(window.innerHeight * 0.75) : Math.round(window.innerHeight * 0.75), behavior: 'smooth' })
    return `Scrolling ${dir}`
  }

  const typeMatch = text.match(/^(?:type|enter)\s+(.+?)\s+(?:in|into)\s+(.+)$/i)
  if (typeMatch) {
    const [, value, labelPhrase] = typeMatch
    const target = findInputTarget(labelPhrase)
    if (target) {
      target.focus()
      setNativeValue(target, value.trim())
      return `Typed "${value.trim()}" into ${labelPhrase.trim()}`
    }
    return `Couldn't find a field for "${labelPhrase.trim()}"`
  }

  const searchMatch = text.match(/^search(?:\s+for)?\s+(.+)$/i)
  if (searchMatch) {
    const query = searchMatch[1].trim()
    const target = document.querySelector<HTMLElement>(INPUT_SELECTOR + ', [aria-label="Search"]')
    const searchBtn = findClickTarget('search')
    if (searchBtn && !target) { searchBtn.click() }
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('input[placeholder*="Search" i], input[type="search"]')
      if (input) { input.focus(); setNativeValue(input, query) }
    }, 150)
    return `Searching for "${query}"`
  }

  const clickMatch = text.match(/^(?:click|press|tap|open|go to|select)\s+(?:on\s+)?(.+)$/i)
  if (clickMatch || !dictation.current) {
    const label = clickMatch ? clickMatch[1] : text
    const target = findClickTarget(label)
    if (target) {
      target.click()
      return `Clicked "${label.trim()}"`
    }
    if (!dictation.current) return `Couldn't find "${label.trim()}" on this page`
  }

  // Dictation mode: a focused field is active and nothing above matched as a command — append what was said.
  const existing = (dictation.current as HTMLInputElement).value ?? ''
  const next = existing ? `${existing} ${text}` : text
  setNativeValue(dictation.current, next)
  return `Typed "${text}"`
}

interface Spot { key: string; x: number; y: number }

/** While voice control is listening, drops a dot on every visible clickable/typeable target. */
function VoiceTargetOverlay() {
  const [spots, setSpots] = useState<Spot[]>([])

  useEffect(() => {
    function recompute() {
      const els = Array.from(document.querySelectorAll<HTMLElement>(`${CLICK_SELECTOR}, ${INPUT_SELECTOR}`)).filter(isVisible)
      const vw = window.innerWidth
      const vh = window.innerHeight
      const next: Spot[] = []
      els.forEach((el, i) => {
        const r = el.getBoundingClientRect()
        if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) return
        next.push({ key: String(i), x: r.left + Math.min(14, r.width / 2), y: r.top + Math.min(14, r.height / 2) })
      })
      setSpots(next)
    }
    recompute()
    const onScrollOrResize = () => recompute()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    // Re-scan periodically too — the page's own content (tabs, modals, lists) changes without a resize/scroll event.
    const interval = window.setInterval(recompute, 700)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
      window.clearInterval(interval)
    }
  }, [])

  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60]">
      {spots.map((s) => (
        <span
          key={s.key}
          className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-deep ring-2 ring-white/90 animate-pulse"
          style={{ left: s.x, top: s.y, boxShadow: '0 0 0 4px rgba(225,29,72,0.18)' }}
        />
      ))}
    </div>,
    document.body,
  )
}

export default function VoiceControl() {
  const toast = useApp((s) => s.toast)
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const recogRef = useRef<any>(null)
  /** True while the user wants voice control running — survives the engine's own auto-stops. */
  const wantListeningRef = useRef(false)
  /** The field currently focused for dictation via "focus <label>", or null. */
  const dictationRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setSupported(!!getRecognitionCtor())
  }, [])

  const start = useMemo(() => () => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) { toast('Voice control is not supported in this browser', 'error'); return }
    const recognition = new Ctor()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (e: any) => {
      // Only the newest result — `continuous` keeps earlier ones around in the list.
      const said = e.results[e.results.length - 1][0].transcript
      const status = runVoiceCommand(said, dictationRef)
      toast(`"${said.trim()}" — ${status}`, status.startsWith("Couldn't") || status.startsWith("Didn't") ? 'error' : 'success')
    }
    recognition.onerror = (e: any) => {
      // "no-speech"/"aborted" fire routinely while idling between commands — let onend restart it.
      if (e.error !== 'no-speech' && e.error !== 'aborted') wantListeningRef.current = false
    }
    recognition.onend = () => {
      if (wantListeningRef.current) recognition.start()
      else setListening(false)
    }
    recogRef.current = recognition
    recognition.start()
    wantListeningRef.current = true
    setListening(true)
  }, [toast])

  function toggle() {
    if (listening) {
      wantListeningRef.current = false
      dictationRef.current = null
      recogRef.current?.stop()
      setListening(false)
      return
    }
    start()
  }

  useEffect(() => () => { wantListeningRef.current = false; recogRef.current?.stop() }, [])

  return (
    <>
    {listening && <VoiceTargetOverlay />}
    <button
      onClick={toggle}
      title={supported ? (listening ? 'Listening… click to stop' : 'Voice control') : 'Voice control not supported in this browser'}
      aria-label="Voice control"
      aria-pressed={listening}
      disabled={!supported}
      className={clsx(
        'relative grid size-8 shrink-0 place-items-center rounded-full border transition-all duration-200',
        listening
          ? 'border-rose-deep/50 bg-rose-deep/15 text-rose-deep'
          : 'border-white/55 bg-white/35 text-ash backdrop-blur-xl hover:border-white/80 hover:bg-white/60 hover:text-ink',
        !supported && 'cursor-not-allowed opacity-40',
      )}
    >
      <Mic size={14} />
      {listening && <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-rose-deep/30" />}
    </button>
    </>
  )
}
