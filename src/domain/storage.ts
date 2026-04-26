import { onTrackClassifier } from './rules'
import type { Feature } from './types'

const STORAGE_KEY = 'ssd-tech-tracker-features-v1'

export { STORAGE_KEY }

function isFeatureLike(value: unknown): value is Feature {
  if (!value || typeof value !== 'object') return false
  const feature = value as Partial<Feature>
  return (
    typeof feature.featureId === 'string' &&
    typeof feature.status === 'string' &&
    typeof feature.progress === 'number' &&
    typeof feature.plannedDeadline === 'string' &&
    typeof feature.lastUpdatedAt === 'string'
  )
}

/** Parse persisted JSON; re-run on-track classification; fall back to `fallback` (default empty). */
export function loadFeaturesFromStorage(raw: string | null, fallback: Feature[] = []): Feature[] {
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback
    const valid = parsed.filter(isFeatureLike)
    if (valid.length === 0) return fallback
    return valid.map((f) => {
      const merged: Feature = { ...f }
      return { ...merged, onTrackStatus: onTrackClassifier(merged) }
    })
  } catch {
    return fallback
  }
}
