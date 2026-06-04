import { useState, useEffect } from 'react'

// Decide phone vs desktop from BOTH pointer type and width.
// - A real phone reports `(pointer: coarse)` (finger) and a narrow screen.
// - A desktop browser reports `(pointer: fine)` (mouse) and a wide screen.
// Touch-screen laptops report `fine` for the trackpad, so width is the tie-breaker.
function detect() {
  if (typeof window === 'undefined') return 'mobile'
  const fine   = window.matchMedia('(pointer: fine)').matches
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const wide   = window.innerWidth >= 768
  // Desktop = has a mouse AND a wide viewport. Everything else = mobile UI.
  if (fine && !coarse && wide) return 'desktop'
  if (fine && wide && window.innerWidth >= 1024) return 'desktop' // hybrid laptops
  return 'mobile'
}

export function useDeviceType() {
  const [device, setDevice] = useState(detect)

  useEffect(() => {
    const update = () => setDevice(detect())
    update() // sync once on mount (covers SSR/hydration mismatch)
    window.addEventListener('resize', update)
    const mq = window.matchMedia('(pointer: fine)')
    mq.addEventListener?.('change', update)
    return () => {
      window.removeEventListener('resize', update)
      mq.removeEventListener?.('change', update)
    }
  }, [])

  return device // 'desktop' | 'mobile'
}

// Optional: which browser, for small quirk fixes only (NOT for layout decisions).
export function getBrowser() {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (/Edg\//.test(ua)) return 'edge'
  if (/OPR\//.test(ua)) return 'opera'
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'chrome'
  if (/Firefox\//.test(ua)) return 'firefox'
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'safari'
  return 'unknown'
}
