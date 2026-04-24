import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'

/**
 * JSON-backed localStorage state. `read` maps raw string (or null) to initial value.
 */
export function useLocalStorage<T>(key: string, read: (raw: string | null) => T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => read(typeof window === 'undefined' ? null : window.localStorage.getItem(key)))

  const setValue = useCallback(
    (action: SetStateAction<T>) => {
      setState((prev) => {
        const next = typeof action === 'function' ? (action as (p: T) => T)(prev) : action
        try {
          window.localStorage.setItem(key, JSON.stringify(next))
        } catch {
          /* quota / private mode */
        }
        return next
      })
    },
    [key],
  )

  return [state, setValue]
}
