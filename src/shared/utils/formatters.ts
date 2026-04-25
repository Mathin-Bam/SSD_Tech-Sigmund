export function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#e31837,#f97316)',
  'linear-gradient(135deg,#3b82f6,#a78bfa)',
  'linear-gradient(135deg,#22c55e,#06b6d4)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
]

export function avatarGradient(name: string | null | undefined) {
  if (!name) return AVATAR_GRADIENTS[0]
  const idx = name.charCodeAt(0) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[idx]
}
