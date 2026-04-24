import { onTrackClassifier } from './rules'
import type { Feature } from './types'

const STORAGE_KEY = 'ssd-tech-tracker-features-v1'

export { STORAGE_KEY }

/** Parse persisted JSON; re-run on-track classification; fall back to seed. */
export function loadFeaturesFromStorage(raw: string | null, seed: Feature[]): Feature[] {
  if (!raw) return seed
  try {
    const parsed = JSON.parse(raw) as Feature[]
    if (!Array.isArray(parsed) || parsed.length === 0) return seed
    return parsed.map((f) => {
      const merged: Feature = { ...f }
      return { ...merged, onTrackStatus: onTrackClassifier(merged) }
    })
  } catch {
    return seed
  }
}
