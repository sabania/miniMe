import { useState, useCallback, useRef, useEffect } from 'react'

export function useToast(durationMs = 2500): [string | null, (msg: string) => void] {
  const [toast, setToast] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback(
    (msg: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setToast(msg)
      timerRef.current = setTimeout(() => {
        setToast(null)
        timerRef.current = null
      }, durationMs)
    },
    [durationMs]
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return [toast, showToast]
}
